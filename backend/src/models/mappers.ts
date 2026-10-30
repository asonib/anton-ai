import type { Conversation, Message, Project, User } from '@prisma/client';
import type { AttachmentMeta } from './repositories/attachment.repository';
import type { ProjectChangeSummary } from './repositories/projectChange.repository';
import type { PromptView } from './repositories/prompt.repository';
import type { AttachmentDTO, ConversationDTO, MessageDTO, ProjectChangeDTO, ProjectDTO, PromptDTO, UserDTO } from './types';

/** Entity → DTO mappers. Keep persistence shapes from leaking to the HTTP layer. */
export const toUserDTO = (u: User): UserDTO => ({
  id: u.id,
  email: u.email,
  createdAt: u.createdAt.toISOString(),
});

export const toConversationDTO = (c: Conversation): ConversationDTO => ({
  id: c.id,
  title: c.title,
  projectId: c.projectId,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

export const toAttachmentDTO = (a: AttachmentMeta): AttachmentDTO => ({
  id: a.id,
  kind: a.kind,
  fileName: a.fileName,
  mimeType: a.mimeType,
  sizeBytes: a.sizeBytes,
  createdAt: a.createdAt.toISOString(),
});

export const toProjectDTO = (p: Project): ProjectDTO => ({
  id: p.id,
  name: p.name,
  source: p.source,
  rootPath: p.rootPath,
  repoUrl: p.repoUrl,
  gitRef: p.gitRef,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

export const toProjectChangeDTO = (c: ProjectChangeSummary): ProjectChangeDTO => ({
  id: c.id,
  projectId: c.projectId,
  messageId: c.messageId,
  path: c.path,
  action: c.action,
  status: c.status,
  createdAt: c.createdAt.toISOString(),
  appliedAt: c.appliedAt ? c.appliedAt.toISOString() : null,
});

export const toMessageDTO = (
  m: Message & { attachments?: AttachmentMeta[]; projectChanges?: ProjectChangeSummary[] },
): MessageDTO => ({
  id: m.id,
  conversationId: m.conversationId,
  role: m.role,
  content: m.content,
  provider: m.provider,
  modelName: m.modelName,
  createdAt: m.createdAt.toISOString(),
  attachments: (m.attachments ?? []).map(toAttachmentDTO),
  changes: (m.projectChanges ?? []).map(toProjectChangeDTO),
});

export const BUILT_IN_AUTHOR_NAME = 'Anton AI';

/** Prompt row (+ author/favourite info for the viewer) → DTO. Never exposes the author's full e-mail or id. */
export const toPromptDTO = (p: PromptView, viewerId: string): PromptDTO => ({
  id: p.id,
  title: p.title,
  category: p.category,
  content: p.content,
  authorName: p.author ? p.author.email.split('@')[0] : BUILT_IN_AUTHOR_NAME,
  isBuiltIn: p.authorId === null,
  isOwner: p.authorId !== null && p.authorId === viewerId,
  isFavorite: p.favorites.length > 0,
  favoriteCount: p._count.favorites,
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});
