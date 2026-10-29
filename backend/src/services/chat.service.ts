import type { PrismaClient } from '@prisma/client';
import { ResourceNotFoundException } from '../exceptions';
import { toConversationDTO, toMessageDTO } from '../models/mappers';
import type { ConversationRepository } from '../models/repositories/conversation.repository';
import type { MessageRepository } from '../models/repositories/message.repository';
import type {
  ConversationDTO,
  ConversationSummaryDTO,
  MessageDTO,
  Pagination,
  PromptResultDTO,
} from '../models/types';
import type { LLMService } from './llm.service';

export interface SendPromptInput {
  conversationId?: string;
  prompt: string;
  provider?: string;
  model?: string;
  temperature?: number;
}

const TITLE_MAX = 80;
const PREVIEW_MAX = 140;

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
    private readonly llm: LLMService,
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
   * 1. Verify ownership of an existing thread (or prepare a new one)
   * 2. Load the memory window and call the LLM strategy
   * 3. Atomically persist conversation + user prompt + assistant reply
   *
   * The LLM call happens BEFORE the transaction so a failing provider never
   * leaves orphan prompts or empty conversations in the database.
   */
  async sendPrompt(userId: string, input: SendPromptInput): Promise<PromptResultDTO> {
    const { provider, model } = this.llm.resolveProvider(input.provider, input.model);

    const existing = input.conversationId ? await this.requireConversation(userId, input.conversationId) : null;
    const history = existing
      ? await this.messages.findRecentForConversation(existing.id, userId, this.llm.memoryWindow)
      : [];

    const promptAt = new Date();
    const llmResult = await this.llm.generate(input.prompt, history, provider, {
      model,
      temperature: input.temperature,
    });
    // Guarantee strict ordering even when the model answers within the same millisecond.
    const answeredAt = new Date(Math.max(Date.now(), promptAt.getTime() + 1));

    const persisted = await this.prisma.$transaction(async (tx) => {
      const conversation =
        existing ??
        (await this.conversations.create({ userId, title: truncate(input.prompt, TITLE_MAX) || 'New chat', createdAt: promptAt }, tx));

      const userMessage = await this.messages.create(
        { conversationId: conversation.id, userId, role: 'user', content: input.prompt, provider, modelName: llmResult.model, createdAt: promptAt },
        tx,
      );
      const assistantMessage = await this.messages.create(
        { conversationId: conversation.id, userId, role: 'assistant', content: llmResult.content, provider: llmResult.provider, modelName: llmResult.model, createdAt: answeredAt },
        tx,
      );
      const touched = await this.conversations.touch(conversation.id, userId, answeredAt, tx);
      return { conversation: touched, userMessage, assistantMessage };
    });

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
