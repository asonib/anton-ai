import type { Prisma, PrismaClient } from '@prisma/client';
import type { DbClient } from '../prisma.client';
import type { PromptListQuery } from '../types';

/** What every prompt read returns: the row, its author's e-mail, whether the viewer favourited it, and the favourite count. */
const viewInclude = (viewerId: string) =>
  ({
    author: { select: { email: true } },
    favorites: { where: { userId: viewerId }, select: { userId: true } },
    _count: { select: { favorites: true } },
  }) satisfies Prisma.PromptInclude;

export type PromptView = Prisma.PromptGetPayload<{ include: ReturnType<typeof viewInclude> }>;

export interface PromptWriteData {
  title: string;
  category: string;
  content: string;
}

export interface BuiltInPromptData extends PromptWriteData {
  key: string;
}

/**
 * Data-access for the shared prompt library. Reads are visible to every user (the library is shared)
 * but are always evaluated for a `viewerId` (favourite flag). Writes are scoped to `authorId`, so a user
 * can only change their own prompts; favourites are scoped to `userId`.
 */
export class PromptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private where(viewerId: string, q: Omit<PromptListQuery, 'limit' | 'offset'>): Prisma.PromptWhereInput {
    const and: Prisma.PromptWhereInput[] = [];
    if (q.category) and.push({ category: q.category });
    if (q.scope === 'mine') and.push({ authorId: viewerId });
    if (q.scope === 'built-in') and.push({ authorId: null });
    if (q.scope === 'favorites') and.push({ favorites: { some: { userId: viewerId } } });
    // MySQL's default collation is case-insensitive, so `contains` is a case-insensitive LIKE.
    const terms = (q.search ?? '').split(/\s+/).filter(Boolean).slice(0, 8);
    for (const term of terms) and.push({ OR: [{ title: { contains: term } }, { content: { contains: term } }] });
    return and.length ? { AND: and } : {};
  }

  list(viewerId: string, q: PromptListQuery, db: DbClient = this.prisma): Promise<PromptView[]> {
    return db.prompt.findMany({
      where: this.where(viewerId, q),
      include: viewInclude(viewerId),
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: q.limit,
      skip: q.offset,
    });
  }

  count(viewerId: string, q: Omit<PromptListQuery, 'limit' | 'offset'>, db: DbClient = this.prisma): Promise<number> {
    return db.prompt.count({ where: this.where(viewerId, q) });
  }

  findById(id: string, viewerId: string, db: DbClient = this.prisma): Promise<PromptView | null> {
    return db.prompt.findUnique({ where: { id }, include: viewInclude(viewerId) });
  }

  exists(id: string, db: DbClient = this.prisma): Promise<boolean> {
    return db.prompt.count({ where: { id } }).then((n) => n > 0);
  }

  create(authorId: string, data: PromptWriteData, db: DbClient = this.prisma): Promise<PromptView> {
    return db.prompt.create({ data: { ...data, authorId }, include: viewInclude(authorId) });
  }

  /** Updates only when `authorId` wrote the prompt. Returns false otherwise (caller → 404). */
  async updateForAuthor(id: string, authorId: string, data: Partial<PromptWriteData>, db: DbClient = this.prisma): Promise<boolean> {
    const { count } = await db.prompt.updateMany({ where: { id, authorId }, data });
    return count > 0;
  }

  async deleteForAuthor(id: string, authorId: string, db: DbClient = this.prisma): Promise<boolean> {
    const { count } = await db.prompt.deleteMany({ where: { id, authorId } });
    return count > 0;
  }

  async addFavorite(userId: string, promptId: string, db: DbClient = this.prisma): Promise<void> {
    await db.promptFavorite.upsert({
      where: { userId_promptId: { userId, promptId } },
      create: { userId, promptId },
      update: {},
    });
  }

  async removeFavorite(userId: string, promptId: string, db: DbClient = this.prisma): Promise<void> {
    await db.promptFavorite.deleteMany({ where: { userId, promptId } });
  }

  /** Makes the built-in rows match the config: upsert each by key, delete built-ins that were removed. */
  async syncBuiltIns(prompts: readonly BuiltInPromptData[], db: DbClient = this.prisma): Promise<void> {
    for (const { key, ...data } of prompts) {
      await db.prompt.upsert({ where: { builtInKey: key }, create: { ...data, builtInKey: key }, update: data });
    }
    await db.prompt.deleteMany({ where: { authorId: null, builtInKey: { notIn: prompts.map((p) => p.key) } } });
  }
}
