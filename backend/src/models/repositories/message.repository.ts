import type { Message, MessageRole, PrismaClient } from '@prisma/client';
import type { DbClient } from '../prisma.client';

export interface CreateMessageInput {
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  provider?: string | null;
  modelName?: string | null;
  createdAt?: Date;
}

/** Data-access for messages. All reads are scoped by both conversationId AND userId. */
export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listForConversation(conversationId: string, userId: string, db: DbClient = this.prisma): Promise<Message[]> {
    return db.message.findMany({
      where: { conversationId, userId },
      orderBy: [{ createdAt: 'asc' }, { role: 'asc' }],
    });
  }

  /** Last `limit` messages in chronological order (used as LLM memory window). */
  async findRecentForConversation(
    conversationId: string,
    userId: string,
    limit: number,
    db: DbClient = this.prisma,
  ): Promise<Message[]> {
    if (limit <= 0) return [];
    const rows = await db.message.findMany({
      where: { conversationId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse();
  }

  create(data: CreateMessageInput, db: DbClient = this.prisma): Promise<Message> {
    return db.message.create({ data });
  }
}
