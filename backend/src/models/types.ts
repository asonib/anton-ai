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
  /** Project attached on the latest prompt (null = none). */
  projectId: string | null;
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
  /** File edits proposed by this (assistant) message. Contents come from GET /projects/changes/:id. */
  changes: ProjectChangeDTO[];
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

/* ---------------- Projects ---------------- */

export type ProjectSourceValue = 'local' | 'github';
export type ProjectChangeActionValue = 'create' | 'modify' | 'delete';
export type ProjectChangeStatusValue = 'pending' | 'applied' | 'discarded';

export interface ProjectDTO {
  id: string;
  name: string;
  source: ProjectSourceValue;
  /** Folder on the server (for GitHub projects: the clone — push from there). */
  rootPath: string;
  repoUrl: string | null;
  gitRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStatsDTO {
  fileCount: number;
  totalBytes: number;
  /** True when PROJECT_MAX_FILES was reached while scanning. */
  truncated: boolean;
}

export interface ProjectDetailDTO extends ProjectDTO {
  stats: ProjectStatsDTO;
}

/** What the UI needs to know to offer the "attach project" forms. */
export interface ProjectsConfigDTO {
  localEnabled: boolean;
  workspaceRoots: string[];
  /** Where GitHub clones and new projects are created. */
  projectsDir: string;
  contextMaxChars: number;
}

/** One level of the workspace folder picker (GET /projects/browse). */
export interface FolderListingDTO {
  /** All workspace roots (resolved), for switching between them. */
  roots: string[];
  /** The root that contains `path`. */
  root: string;
  path: string;
  /** null at the root (can't browse above it). */
  parent: string | null;
  /** The user's project for `path` itself, if any. */
  projectId: string | null;
  entries: { name: string; path: string; isGitRepo: boolean; projectId: string | null }[];
  truncated: boolean;
}

export interface ProjectChangeDTO {
  id: string;
  projectId: string;
  messageId: string;
  path: string;
  action: ProjectChangeActionValue;
  status: ProjectChangeStatusValue;
  createdAt: string;
  appliedAt: string | null;
}

/**
 * `diskState` compares the file on disk with what the change expects:
 * pending → is it still the version the edit was based on; applied → is it still the applied version.
 */
export interface ProjectChangeDetailDTO extends ProjectChangeDTO {
  originalContent: string | null;
  newContent: string | null;
  diskState: 'in-sync' | 'changed' | 'unavailable';
}

export interface ProjectChangeConflictDTO {
  id: string;
  path: string;
  reason: string;
}

export interface ProjectChangesResultDTO {
  changes: ProjectChangeDTO[];
  /** Changes that were skipped because the file changed on disk (retry with `force`). */
  conflicts: ProjectChangeConflictDTO[];
}

/** One card in the "Top AI repos" panel (from the GitHub search API). */
export interface AiRepoDTO {
  rank: number;
  /** `owner/name` */
  fullName: string;
  owner: string;
  name: string;
  ownerAvatarUrl: string | null;
  description: string | null;
  /** https://github.com/owner/name */
  url: string;
  homepage: string | null;
  /** null for the offline fallback snapshot. */
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  language: string | null;
  topics: string[];
  license: string | null;
  pushedAt: string | null;
}

export interface AiRepoCategoryDTO {
  id: string;
  name: string;
}

export interface AiRepoListDTO {
  category: string;
  categories: AiRepoCategoryDTO[];
  /** live = fetched now, cache = served from memory, stale = GitHub failed so older cached data is used, fallback = built-in snapshot. */
  source: 'live' | 'cache' | 'stale' | 'fallback';
  /** When the GitHub data was fetched (null for the fallback). */
  fetchedAt: string | null;
  /** Why the data is stale/fallback (rate limit, network…). */
  notice: string | null;
  items: AiRepoDTO[];
}

/* ------------------------------ agent activity (live progress) ------------------------------ */

export type ActivityStepKey = 'prepare' | 'attachments' | 'memory' | 'project' | 'skill' | 'model' | 'changes' | 'save';
export type ActivityStepStatus = 'active' | 'done' | 'error';
export type ActivityRunStatus = 'running' | 'done' | 'error';

export interface ActivityStepDTO {
  key: ActivityStepKey;
  label: string;
  /** Short human-readable detail, e.g. "3 files · 42 KB" or "claude-sonnet-4 · Anthropic". */
  detail: string | null;
  status: ActivityStepStatus;
  startedAt: string;
  finishedAt: string | null;
}

/** Live output counters while the model is answering (fed by the provider's internal stream). */
export interface ActivityOutputDTO {
  chars: number;
  words: number;
  /** Project file the model is currently writing (inside a `<<<FILE …>>>` block), if any. */
  currentFile: string | null;
  filesWritten: number;
}

export interface ActivityRunDTO {
  runId: string;
  status: ActivityRunStatus;
  startedAt: string;
  finishedAt: string | null;
  steps: ActivityStepDTO[];
  output: ActivityOutputDTO | null;
  error: string | null;
}
