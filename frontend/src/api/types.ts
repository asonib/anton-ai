/** Mirrors the backend DTOs + standard response envelopes. */
export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'grok';
export type MessageRole = 'user' | 'assistant';
export type AttachmentKind = 'image' | 'document' | 'code';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    path?: string;
    timestamp?: string;
    requestId?: string;
  };
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: User;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary extends Conversation {
  messageCount: number;
  lastMessagePreview: string | null;
  lastProvider: string | null;
}

/** Attachment metadata; bytes come from GET /attachments/:id/content. */
export interface Attachment {
  id: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  provider: string | null;
  modelName: string | null;
  createdAt: string;
  attachments: Attachment[];
}

export interface PromptRequest {
  conversationId?: string;
  prompt: string;
  provider?: LLMProvider;
  /** When present the request is sent as multipart/form-data. */
  files?: File[];
}

export interface PromptResult {
  conversation: Conversation;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  provider: LLMProvider;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  latencyMs: number;
}

export interface ProviderInfo {
  id: LLMProvider;
  label: string;
  model: string;
  configured: boolean;
  isDefault: boolean;
}
