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

export type AttachmentKindValue = 'image' | 'document' | 'code';

/** Attachment metadata only — bytes are served by GET /attachments/:id/content. */
export interface AttachmentDTO {
  id: string;
  kind: AttachmentKindValue;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  role: MessageRoleValue;
  content: string;
  provider: string | null;
  modelName: string | null;
  createdAt: string;
  attachments: AttachmentDTO[];
}

/** A file as received over HTTP, already detached from the transport (multer) types. */
export interface UploadedFile {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}

/** A validated upload, ready to be sent to the LLM and persisted. */
export interface PreparedAttachment {
  kind: AttachmentKindValue;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data: Buffer;
  /** Text injected into the prompt (documents/code); null for images. */
  extractedText: string | null;
}

/** Binary content of a stored attachment. */
export interface AttachmentFile {
  fileName: string;
  mimeType: string;
  kind: AttachmentKindValue;
  data: Buffer;
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

/** Public view of a skill (`config/skills.config.ts`) — never includes the system instructions. */
export interface SkillDTO {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  samplePrompts: string[];
}

/* ---------------- Prompt library ---------------- */

export type PromptScope = 'all' | 'built-in' | 'mine' | 'favorites';

export interface PromptListQuery extends Pagination {
  /** Free text; every whitespace-separated term must appear in the title or content. */
  search?: string;
  category?: string;
  scope: PromptScope;
}

export interface PromptCategoryDTO {
  id: string;
  name: string;
  icon: string;
}

/** A shared prompt as seen by the requesting user. */
export interface PromptDTO {
  id: string;
  title: string;
  category: string;
  content: string;
  /** "Anton AI" for built-ins, otherwise the author's display name (e-mail local part). */
  authorName: string;
  isBuiltIn: boolean;
  /** True when the requesting user wrote it — only then may they edit/delete it. */
  isOwner: boolean;
  isFavorite: boolean;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
}
