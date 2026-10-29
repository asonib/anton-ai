import type { LLMProvider } from '../config/env';

/** Identity extracted from a verified JWT. */
export interface AuthUser {
  id: string;
  email: string;
}

export type MessageRoleValue = 'user' | 'assistant';

/* ---------------- Public DTOs (what the API returns) ---------------- */

export interface UserDTO {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResultDTO {
  token: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: UserDTO;
}

export interface ConversationDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummaryDTO extends ConversationDTO {
  messageCount: number;
  lastMessagePreview: string | null;
  lastProvider: string | null;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  role: MessageRoleValue;
  content: string;
  provider: string | null;
  modelName: string | null;
  createdAt: string;
}

export interface PromptResultDTO {
  conversation: ConversationDTO;
  userMessage: MessageDTO;
  assistantMessage: MessageDTO;
  provider: LLMProvider;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  latencyMs: number;
}

export interface Pagination {
  limit: number;
  offset: number;
}
