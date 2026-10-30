import type { PrismaClient } from '@prisma/client';
import { llmDefaults } from '../config/llm.config';
import { projectSettings } from '../config/projects.config';
import { AppException, ResourceNotFoundException, ValidationException } from '../exceptions';
import { toConversationDTO, toMessageDTO } from '../models/mappers';
import type { ConversationRepository } from '../models/repositories/conversation.repository';
import type { AttachmentMeta, AttachmentRepository } from '../models/repositories/attachment.repository';
import type { MessageRepository } from '../models/repositories/message.repository';
import type { ProjectChangeRepository, ProjectChangeSummary } from '../models/repositories/projectChange.repository';
import type {
  ConversationDTO,
  ConversationSummaryDTO,
  MessageDTO,
  Pagination,
  PromptResultDTO,
  UploadedFile,
} from '../models/types';
import type { ActivityReporter, ActivityService } from './activity.service';
import type { AttachmentService } from './attachment.service';
import type { LLMService } from './llm.service';
import type { ProjectService, ProposedChanges } from './project.service';
import type { SkillService } from './skill.service';

export interface SendPromptInput {
  conversationId?: string;
  prompt: string;
  provider?: string;
  /** Skill id; its instructions become part of the system prompt. */
  skill?: string;
  /** Attached project: its files go into the system prompt and file blocks in the reply become reviewable changes. */
  projectId?: string;
  model?: string;
  temperature?: number;
  /** Raw uploads (multipart). Validated + text-extracted by AttachmentService. */
  files?: UploadedFile[];
  /** Client-generated id; progress for this prompt can be polled at GET /chats/activity/:runId. */
  runId?: string;
}

const TITLE_MAX = 80;
const PREVIEW_MAX = 140;
/** Attachment blobs can make the write transaction slower than Prisma's 5 s default. */
const TX_OPTIONS = { maxWait: 10_000, timeout: 60_000 } as const;

const plural = (n: number, word: string) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** "2 documents · 1 image" */
const describeFiles = (files: { kind: string }[]) => {
  const counts = new Map<string, number>();
  for (const f of files) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
  const names: Record<string, string> = { image: 'image', document: 'document', code: 'code file' };
  return [...counts].map(([kind, n]) => plural(n, names[kind] ?? 'file')).join(' · ');
};

const truncate = (text: string, max: number): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

/**
 * Chat business logic. Every public method takes the authenticated `userId`
 * first; it is forwarded to every repository call so users can never read or
 * write another user's conversations.
 */
export class ChatService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly attachmentRepo: AttachmentRepository,
    private readonly attachments: AttachmentService,
    private readonly llm: LLMService,
    private readonly skills: SkillService,
    private readonly projects: ProjectService,
    private readonly projectChanges: ProjectChangeRepository,
    private readonly activity: ActivityService,
  ) {}

  async listConversations(userId: string, page: Pagination): Promise<{ items: ConversationSummaryDTO[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.conversations.listForUser(userId, page),
      this.conversations.countForUser(userId),
    ]);
    const items = rows.map((c) => ({
      ...toConversationDTO(c),
      messageCount: c._count.messages,
      lastMessagePreview: c.messages[0] ? truncate(c.messages[0].content, PREVIEW_MAX) : null,
      lastProvider: c.messages[0]?.provider ?? null,
    }));
    return { items, total };
  }

  async getMessages(userId: string, conversationId: string): Promise<{ conversation: ConversationDTO; messages: MessageDTO[] }> {
    const conversation = await this.requireConversation(userId, conversationId);
    const messages = await this.messages.listForConversation(conversationId, userId);
    return { conversation: toConversationDTO(conversation), messages: messages.map(toMessageDTO) };
  }

  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const deleted = await this.conversations.deleteForUser(conversationId, userId);
    if (!deleted) throw new ResourceNotFoundException('Conversation', conversationId);
  }

  /**
   * 0. Resolve provider + skill (unknown ids → 400) and the attached project (other users' → 404)
   * 1. Validate attachments (type, size, text extraction) — fails fast, before any I/O
   * 2. Verify ownership of an existing thread (or prepare a new one)
   * 3. Load the memory window (+ recent history images), add project context, call the LLM strategy
   * 4. Turn file blocks in the reply into proposed changes (nothing is written to the project)
   * 5. Atomically persist conversation + user prompt + attachments + assistant reply + proposed changes
   *
   * The LLM call happens BEFORE the transaction so a failing provider never
   * leaves orphan prompts or empty conversations in the database.
   *
   * Each stage is reported to ActivityService (when the client sent a `runId`) so the UI can show
   * what the assistant is doing while it waits for this response.
   */
  async sendPrompt(userId: string, input: SendPromptInput): Promise<PromptResultDTO> {
    const activity = this.activity.start(userId, input.runId);
    try {
      const result = await this.runPrompt(userId, input, activity);
      activity.finish();
      return result;
    } catch (error) {
      activity.fail(error instanceof AppException ? error.message : 'Something went wrong while answering');
      throw error;
    }
  }

  private async runPrompt(userId: string, input: SendPromptInput, activity: ActivityReporter): Promise<PromptResultDTO> {
    const { provider, model, label } = this.llm.resolveProvider(input.provider, input.model);
    const skillName = this.skills.nameOf(input.skill);
    activity.step('prepare', 'Understanding the request', [label, skillName && `${skillName} skill`].filter(Boolean).join(' · '));
    const skillPrompt = this.skills.systemPromptFor(input.skill);
    const prompt = input.prompt.trim();
    const project = input.projectId ? await this.projects.requireProject(userId, input.projectId) : null;

    const uploads = input.files ?? [];
    if (uploads.length > 0) {
      activity.step(
        'attachments',
        'Reading attachments',
        `${plural(uploads.length, 'file')} · ${formatBytes(uploads.reduce((n, f) => n + f.sizeBytes, 0))}`,
      );
    }
    const files = await this.attachments.prepare(uploads);
    if (files.length > 0) {
      const chars = files.reduce((n, f) => n + (f.extractedText?.length ?? 0), 0);
      activity.complete([describeFiles(files), chars > 0 && `${plural(chars, 'character')} extracted`].filter(Boolean).join(' · '));
    }
    if (!prompt && files.length === 0) {
      throw new ValidationException('Request validation failed', [{ field: 'prompt', message: 'Prompt cannot be empty' }]);
    }

    activity.step('memory', input.conversationId ? 'Recalling the conversation' : 'Starting a new conversation');
    const existing = input.conversationId ? await this.requireConversation(userId, input.conversationId) : null;
    const history = existing
      ? await this.messages.findRecentForConversation(existing.id, userId, this.llm.memoryWindow)
      : [];
    const historyImages = await this.attachments.loadHistoryImages(userId, this.llm.pickHistoryImageIds(history));
    activity.complete(
      existing
        ? [plural(Math.min(history.length, this.llm.memoryWindow), 'earlier message'), historyImages.size > 0 && plural(historyImages.size, 'image')]
            .filter(Boolean)
            .join(' · ')
        : 'No earlier messages',
    );

    if (project) activity.step('project', `Scanning ${project.name}`, 'Ranking files for context');
    const projectContext = project ? await this.projects.buildContext(userId, project, prompt, existing?.id) : null;
    if (projectContext) {
      activity.complete(
        `${plural(projectContext.includedPaths.size, 'file')} in context of ${plural(projectContext.scan.files.length, 'file')}${projectContext.scan.truncated ? '+' : ''}`,
      );
    }
    const systemPrompt = projectContext
      ? `${(skillPrompt ?? llmDefaults.systemPrompt).trim()}\n\n${projectContext.systemBlock}`
      : skillPrompt;

    activity.step('model', 'Generating the answer', `${model} · ${label}`);
    const promptAt = new Date();
    const llmResult = await this.llm.generate(
      { prompt, attachments: files, images: this.attachments.toLLMImages(files) },
      history,
      provider,
      {
        model,
        temperature: input.temperature,
        systemPrompt,
        onToken: activity.token,
        ...(project ? { maxTokens: Math.max(projectSettings.llmMaxTokens, llmDefaults.maxTokens) } : {}),
      },
      historyImages,
    );
    // Guarantee strict ordering even when the model answers within the same millisecond.
    const answeredAt = new Date(Math.max(Date.now(), promptAt.getTime() + 1));
    activity.complete(
      [`${(llmResult.latencyMs / 1000).toFixed(1)} s`, llmResult.usage?.outputTokens && plural(llmResult.usage.outputTokens, 'token')]
        .filter(Boolean)
        .join(' · '),
    );

    if (project) activity.step('changes', 'Preparing file changes', 'Comparing with the files on disk');
    const proposal: ProposedChanges | null = project ? await this.projects.proposeChanges(project, llmResult.content) : null;
    if (proposal) activity.complete(proposal.rows.length ? `${plural(proposal.rows.length, 'file')} to review` : 'No file changes');

    activity.step('save', 'Saving the conversation');

    const persisted = await this.prisma.$transaction(async (tx) => {
      const conversation =
        existing ??
        (await this.conversations.create(
          {
            userId,
            title: truncate(prompt || files[0]?.fileName || '', TITLE_MAX) || 'New chat',
            projectId: project?.id ?? null,
            createdAt: promptAt,
          },
          tx,
        ));

      const userMessage = await this.messages.create(
        { conversationId: conversation.id, userId, role: 'user', content: prompt, provider, modelName: llmResult.model, createdAt: promptAt },
        tx,
      );
      const savedAttachments: AttachmentMeta[] = [];
      for (const file of files) {
        savedAttachments.push(
          await this.attachmentRepo.create(
            {
              messageId: userMessage.id,
              userId,
              kind: file.kind,
              fileName: file.fileName,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              data: file.data,
              extractedText: file.extractedText,
              createdAt: promptAt,
            },
            tx,
          ),
        );
      }
      const assistantMessage = await this.messages.create(
        {
          conversationId: conversation.id,
          userId,
          role: 'assistant',
          content: proposal?.content ?? llmResult.content,
          provider: llmResult.provider,
          modelName: llmResult.model,
          createdAt: answeredAt,
        },
        tx,
      );
      const changes: ProjectChangeSummary[] = proposal?.rows.length
        ? await this.projectChanges.createMany(
            proposal.rows.map((row) => ({ ...row, messageId: assistantMessage.id, userId, createdAt: answeredAt })),
            tx,
          )
        : [];
      const touched = await this.conversations.touch(conversation.id, userId, answeredAt, project?.id ?? null, tx);
      return {
        conversation: touched,
        userMessage: { ...userMessage, attachments: savedAttachments },
        assistantMessage: { ...assistantMessage, projectChanges: changes },
      };
    }, TX_OPTIONS);

    return {
      conversation: toConversationDTO(persisted.conversation),
      userMessage: toMessageDTO(persisted.userMessage),
      assistantMessage: toMessageDTO(persisted.assistantMessage),
      provider: llmResult.provider,
      model: llmResult.model,
      usage: llmResult.usage,
      latencyMs: llmResult.latencyMs,
    };
  }

  private async requireConversation(userId: string, conversationId: string) {
    const conversation = await this.conversations.findByIdForUser(conversationId, userId);
    // 404 (not 403) so we never reveal that another user's thread exists.
    if (!conversation) throw new ResourceNotFoundException('Conversation', conversationId);
    return conversation;
  }
}
