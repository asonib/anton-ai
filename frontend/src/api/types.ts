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
  /** Project attached on the latest prompt (null = none). */
  projectId: string | null;
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
  /** File edits proposed by an assistant message (contents via `projectApi.getChange`). */
  changes: ProjectChange[];
}

export interface PromptRequest {
  conversationId?: string;
  prompt: string;
  provider?: LLMProvider;
  /** Skill id (see `Skill`). Omit for the general assistant. */
  skill?: string;
  /** Attached project; its files are sent as context and the reply may propose edits. */
  projectId?: string;
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

/** A preset mode from `GET /skills` (defined in `backend/src/config/skills.config.ts`). */
export interface Skill {
  id: string;
  name: string;
  /** Icon name, rendered by `SkillIcon`. Unknown names fall back to a sparkle. */
  icon: string;
  tagline: string;
  description: string;
  /** Clicking one fills the composer; `[PLACEHOLDER]` slots are selected for typing over. */
  samplePrompts: string[];
}

/* ---------------- Prompt library (GET/POST /prompts) ---------------- */

/** Which slice of the shared library to list. */
export type PromptScope = 'all' | 'favorites' | 'built-in' | 'mine';

/** From `GET /prompts/categories` (defined in `backend/src/config/prompts.config.ts`). */
export interface PromptCategory {
  id: string;
  name: string;
  /** Icon name, rendered by `PromptCategoryIcon`. */
  icon: string;
}

/** A shared prompt, as seen by the current user. */
export interface LibraryPrompt {
  id: string;
  title: string;
  category: string;
  content: string;
  authorName: string;
  isBuiltIn: boolean;
  /** Only the author can edit/delete. */
  isOwner: boolean;
  isFavorite: boolean;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromptListParams {
  search?: string;
  category?: string;
  scope?: PromptScope;
  limit?: number;
}

export interface PromptDraft {
  title: string;
  category: string;
  content: string;
}

/* ---------------- Projects (GET/POST /projects) ---------------- */

export type ProjectSource = 'local' | 'github';
export type ProjectChangeAction = 'create' | 'modify' | 'delete';
export type ProjectChangeStatus = 'pending' | 'applied' | 'discarded';

export interface Project {
  id: string;
  name: string;
  source: ProjectSource;
  /** Folder on the server. For GitHub projects this is the clone — commit and push from there. */
  rootPath: string;
  repoUrl: string | null;
  gitRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  stats: { fileCount: number; totalBytes: number; truncated: boolean };
}

export interface ProjectsConfig {
  /** False when the operator has not set WORKSPACE_ROOTS. */
  localEnabled: boolean;
  workspaceRoots: string[];
  /** Where GitHub clones and new projects are created. */
  projectsDir: string;
  contextMaxChars: number;
}

/** One level of the workspace folder picker (`GET /projects/browse`). */
export interface FolderListing {
  roots: string[];
  /** The workspace root that contains `path`. */
  root: string;
  path: string;
  /** null at a workspace root (can't go higher). */
  parent: string | null;
  /** Your project for `path` itself, if you already added it. */
  projectId: string | null;
  entries: { name: string; path: string; isGitRepo: boolean; projectId: string | null }[];
  truncated: boolean;
}

export interface ProjectChange {
  id: string;
  projectId: string;
  messageId: string;
  path: string;
  action: ProjectChangeAction;
  status: ProjectChangeStatus;
  createdAt: string;
  appliedAt: string | null;
}

export interface ProjectChangeDetail extends ProjectChange {
  originalContent: string | null;
  newContent: string | null;
  /** Does the file on disk still match what this change expects? */
  diskState: 'in-sync' | 'changed' | 'unavailable';
}

export interface ProjectChangeConflict {
  id: string;
  path: string;
  reason: string;
}

export interface ProjectChangesResult {
  changes: ProjectChange[];
  conflicts: ProjectChangeConflict[];
}
