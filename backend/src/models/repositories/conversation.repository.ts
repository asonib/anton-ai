import type { Conversation, PrismaClient } from '@prisma/client';
import type { DbClient } from '../prisma.client';
import type { Pagination } from '../types';

export type ConversationWithStats = Conversation & {
  _count: { messages: number };
  messages: { content: string; provider: string | null }[];
};

/**
 * Data-access for conversations. EVERY query takes `userId` and filters on it,
 * which is what guarantees multi-tenant isolation at the persistence layer.
 */
export class ConversationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByIdForUser(id: string, userId: string, db: DbClient = this.prisma): Promise<Conversation | null> {
    return db.conversation.findFirst({ where: { id, userId } });
  }

  listForUser(userId: string, page: Pagination, db: DbClient = this.prisma): Promise<ConversationWithStats[]> {
    return db.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: page.limit,
      skip: page.offset,
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, provider: true },
        },
      },
    });
  }

  countForUser(userId: string, db: DbClient = this.prisma): Promise<number> {
    return db.conversation.count({ where: { userId } });
  }

  create(data: { userId: string; title: string; projectId?: string | null; createdAt?: Date }, db: DbClient = this.prisma): Promise<Conversation> {
    return db.conversation.create({ data });
  }

  /** Bumps updated_at so the thread floats to the top of the sidebar (and records the attached project). */
  touch(id: string, userId: string, at: Date, projectId: string | null, db: DbClient = this.prisma): Promise<Conversation> {
    return db.conversation.update({ where: { id, userId }, data: { updatedAt: at, projectId } });
  }

  async deleteForUser(id: string, userId: string, db: DbClient = this.prisma): Promise<boolean> {
    const { count } = await db.conversation.deleteMany({ where: { id, userId } });
    return count > 0;
  }
}
