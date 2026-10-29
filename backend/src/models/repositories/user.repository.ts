import type { PrismaClient, User } from '@prisma/client';
import type { DbClient } from '../prisma.client';

/** Data-access for users. No business rules here — only queries. */
export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string, db: DbClient = this.prisma): Promise<User | null> {
    return db.user.findUnique({ where: { email } });
  }

  findById(id: string, db: DbClient = this.prisma): Promise<User | null> {
    return db.user.findUnique({ where: { id } });
  }

  create(data: { email: string; passwordHash: string }, db: DbClient = this.prisma): Promise<User> {
    return db.user.create({ data });
  }
}
