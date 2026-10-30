import type { PrismaClient, Project, ProjectSource } from '@prisma/client';
import type { DbClient } from '../prisma.client';

export interface CreateProjectInput {
  id?: string;
  userId: string;
  name: string;
  source: ProjectSource;
  rootPath: string;
  repoUrl?: string | null;
  gitRef?: string | null;
}

/** Data-access for projects. Every query is scoped by `userId`. */
export class ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listForUser(userId: string, db: DbClient = this.prisma): Promise<Project[]> {
    return db.project.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  findByIdForUser(id: string, userId: string, db: DbClient = this.prisma): Promise<Project | null> {
    return db.project.findFirst({ where: { id, userId } });
  }

  findByRootForUser(rootPath: string, userId: string, db: DbClient = this.prisma): Promise<Project | null> {
    return db.project.findFirst({ where: { rootPath, userId } });
  }

  create(data: CreateProjectInput, db: DbClient = this.prisma): Promise<Project> {
    return db.project.create({ data });
  }

  /** Bumps updated_at so recently used projects list first. */
  async touch(id: string, userId: string, db: DbClient = this.prisma): Promise<void> {
    await db.project.updateMany({ where: { id, userId }, data: { updatedAt: new Date() } });
  }

  async deleteForUser(id: string, userId: string, db: DbClient = this.prisma): Promise<boolean> {
    const { count } = await db.project.deleteMany({ where: { id, userId } });
    return count > 0;
  }
}
