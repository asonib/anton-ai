import type { Conversation, Message, User } from '@prisma/client';
import type { ConversationDTO, MessageDTO, UserDTO } from './types';

/** Entity → DTO mappers. Keep persistence shapes from leaking to the HTTP layer. */
export const toUserDTO = (u: User): UserDTO => ({
  id: u.id,
  email: u.email,
  createdAt: u.createdAt.toISOString(),
});

export const toConversationDTO = (c: Conversation): ConversationDTO => ({
  id: c.id,
  title: c.title,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

export const toMessageDTO = (m: Message): MessageDTO => ({
  id: m.id,
  conversationId: m.conversationId,
  role: m.role,
  content: m.content,
  provider: m.provider,
  modelName: m.modelName,
  createdAt: m.createdAt.toISOString(),
});
