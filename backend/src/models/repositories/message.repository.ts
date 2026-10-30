import type { Message, MessageRole, PrismaClient } from '@prisma/client';
import type { DbClient } from '../prisma.client';
import { AttachmentMemory, attachmentMemorySelect, AttachmentMeta, attachmentMetaSelect } from './attachment.repository';
import {
  ProjectChangeMemory,
  projectChangeMemorySelect,
  ProjectChangeSummary,
  projectChangeSummarySelect,
} from './projectChange.repository';

export interface CreateMessageInput {
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  provider?: string | null;
  modelName?: string | null;
  createdAt?: Date;
}

export type MessageWithAttachments = Message & { attachments: AttachmentMeta[]; projectChanges: ProjectChangeSummary[] };
export type MessageWithMemory = Message & { attachments: AttachmentMemory[]; projectChanges: ProjectChangeMemory[] };

/** Data-access for messages. All reads are scoped by both conversationId AND userId. */
export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listForConversation(conversationId: string, userId: string, db: DbClient = this.prisma): Promise<MessageWithAttachments[]> {
    return db.message.findMany({
      where: { conversationId, userId },
      orderBy: [{ createdAt: 'asc' }, { role: 'asc' }],
      include: {
        attachments: { select: attachmentMetaSelect, orderBy: { createdAt: 'asc' } },
        projectChanges: { select: projectChangeSummarySelect, orderBy: { path: 'asc' } },
      },
    });
  }

  /** Last `limit` messages in chronological order (used as LLM memory window). */
  async findRecentForConversation(
    conversationId: string,
    userId: string,
    limit: number,
    db: DbClient = this.prisma,
  ): Promise<MessageWithMemory[]> {
    if (limit <= 0) return [];
    const rows = await db.message.findMany({
      where: { conversationId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        attachments: { select: attachmentMemorySelect, orderBy: { createdAt: 'asc' } },
        projectChanges: { select: projectChangeMemorySelect, orderBy: { path: 'asc' } },
      },
    });
    return rows.reverse();
  }

  create(data: CreateMessageInput, db: DbClient = this.prisma): Promise<Message> {
    return db.message.create({ data });
  }
}
