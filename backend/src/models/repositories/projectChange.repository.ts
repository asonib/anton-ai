import type { Prisma, PrismaClient, ProjectChangeAction, ProjectChangeStatus } from '@prisma/client';
import type { DbClient } from '../prisma.client';

/** Columns sent with every message (no file contents). */
export const projectChangeSummarySelect = {
  id: true,
  projectId: true,
  messageId: true,
  path: true,
  action: true,
  status: true,
  createdAt: true,
  appliedAt: true,
} satisfies Prisma.ProjectChangeSelect;

/** What the LLM memory window needs to describe earlier proposals. */
export const projectChangeMemorySelect = {
  path: true,
  action: true,
  status: true,
} satisfies Prisma.ProjectChangeSelect;

export type ProjectChangeSummary = Prisma.ProjectChangeGetPayload<{ select: typeof projectChangeSummarySelect }>;
export type ProjectChangeMemory = Prisma.ProjectChangeGetPayload<{ select: typeof projectChangeMemorySelect }>;
export type ProjectChangeWithProject = Prisma.ProjectChangeGetPayload<{ include: { project: true } }>;

export interface CreateProjectChangeInput {
  projectId: string;
  messageId: string;
  userId: string;
  path: string;
  action: ProjectChangeAction;
  originalContent: string | null;
  newContent: string | null;
  baseHash: string | null;
  createdAt?: Date;
}

/** Data-access for proposed file changes. Every query is scoped by `userId`. */
export class ProjectChangeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(rows: CreateProjectChangeInput[], db: DbClient = this.prisma): Promise<ProjectChangeSummary[]> {
    const out: ProjectChangeSummary[] = [];
    // One insert per row so we get the generated ids back (createMany doesn't return rows on MySQL).
    for (const data of rows) out.push(await db.projectChange.create({ data, select: projectChangeSummarySelect }));
    return out;
  }

  findByIdForUser(id: string, userId: string, db: DbClient = this.prisma): Promise<ProjectChangeWithProject | null> {
    return db.projectChange.findFirst({ where: { id, userId }, include: { project: true } });
  }

  findManyForUser(ids: string[], userId: string, db: DbClient = this.prisma): Promise<ProjectChangeWithProject[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return db.projectChange.findMany({
      where: { id: { in: ids }, userId },
      include: { project: true },
      orderBy: [{ createdAt: 'asc' }, { path: 'asc' }],
    });
  }

  /** Distinct paths changed (proposed or applied) in a conversation for a project — kept in context for follow-ups. */
  async recentPathsForConversation(conversationId: string, projectId: string, userId: string, limit = 30, db: DbClient = this.prisma): Promise<string[]> {
    const rows = await db.projectChange.findMany({
      where: { userId, projectId, status: { not: 'discarded' }, message: { conversationId } },
      orderBy: { createdAt: 'desc' },
      select: { path: true },
      take: limit * 3,
    });
    return [...new Set(rows.map((r) => r.path))].slice(0, limit);
  }

  async setStatus(id: string, userId: string, status: ProjectChangeStatus, appliedAt: Date | null, db: DbClient = this.prisma): Promise<ProjectChangeSummary> {
    await db.projectChange.updateMany({ where: { id, userId }, data: { status, appliedAt } });
    return db.projectChange.findFirstOrThrow({ where: { id, userId }, select: projectChangeSummarySelect });
  }
}
