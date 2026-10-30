import type { PrismaClient } from '@prisma/client';
import { ResourceNotFoundException, ValidationException } from '../exceptions';
import { toConversationDTO, toMessageDTO } from '../models/mappers';
import type { ConversationRepository } from '../models/repositories/conversation.repository';
import type { AttachmentMeta, AttachmentRepository } from '../models/repositories/attachment.repository';
import type { MessageRepository } from '../models/repositories/message.repository';
import type {
  ConversationDTO,
  ConversationSummaryDTO,
  MessageDTO,
  Pagination,
  PromptResultDTO,
  UploadedFile,
} from '../models/types';
import type { AttachmentService } from './attachment.service';
import type { LLMService } from './llm.service';
import type { SkillService } from './skill.service';

export interface SendPromptInput {
  conversationId?: string;
  prompt: string;
  provider?: string;
  /** Skill id; its instructions become part of the system prompt. */
  skill?: string;
  model?: string;
  temperature?: number;
  /** Raw uploads (multipart). Validated + text-extracted by AttachmentService. */
  files?: UploadedFile[];
}

const TITLE_MAX = 80;
const PREVIEW_MAX = 140;
/** Attachment blobs can make the write transaction slower than Prisma's 5 s default. */
const TX_OPTIONS = { maxWait: 10_000, timeout: 60_000 } as const;

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
   * 0. Resolve provider + skill (unknown ids → 400)
   * 1. Validate attachments (type, size, text extraction) — fails fast, before any I/O
   * 2. Verify ownership of an existing thread (or prepare a new one)
   * 3. Load the memory window (+ recent history images) and call the LLM strategy
   * 4. Atomically persist conversation + user prompt + attachments + assistant reply
   *
   * The LLM call happens BEFORE the transaction so a failing provider never
   * leaves orphan prompts or empty conversations in the database.
   */
  async sendPrompt(userId: string, input: SendPromptInput): Promise<PromptResultDTO> {
    const { provider, model } = this.llm.resolveProvider(input.provider, input.model);
    const systemPrompt = this.skills.systemPromptFor(input.skill);
    const prompt = input.prompt.trim();

    const files = await this.attachments.prepare(input.files ?? []);
    if (!prompt && files.length === 0) {
      throw new ValidationException('Request validation failed', [{ field: 'prompt', message: 'Prompt cannot be empty' }]);
    }

    const existing = input.conversationId ? await this.requireConversation(userId, input.conversationId) : null;
    const history = existing
      ? await this.messages.findRecentForConversation(existing.id, userId, this.llm.memoryWindow)
      : [];
    const historyImages = await this.attachments.loadHistoryImages(userId, this.llm.pickHistoryImageIds(history));

    const promptAt = new Date();
    const llmResult = await this.llm.generate(
      { prompt, attachments: files, images: this.attachments.toLLMImages(files) },
      history,
      provider,
      { model, temperature: input.temperature, systemPrompt },
      historyImages,
    );
    // Guarantee strict ordering even when the model answers within the same millisecond.
    const answeredAt = new Date(Math.max(Date.now(), promptAt.getTime() + 1));

    const persisted = await this.prisma.$transaction(async (tx) => {
      const conversation =
        existing ??
        (await this.conversations.create(
          { userId, title: truncate(prompt || files[0]?.fileName || '', TITLE_MAX) || 'New chat', createdAt: promptAt },
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
        { conversationId: conversation.id, userId, role: 'assistant', content: llmResult.content, provider: llmResult.provider, modelName: llmResult.model, createdAt: answeredAt },
        tx,
      );
      const touched = await this.conversations.touch(conversation.id, userId, answeredAt, tx);
      return { conversation: touched, userMessage: { ...userMessage, attachments: savedAttachments }, assistantMessage };
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
