import { Prisma, PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env';

/** Single PrismaClient instance for the process (survives tsx hot reloads in dev). */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__prisma ??
  new PrismaClient({ log: isProduction ? ['error'] : ['warn', 'error'] });

if (!isProduction) globalForPrisma.__prisma = prisma;

/** Either the root client or an interactive-transaction client. */
export type DbClient = PrismaClient | Prisma.TransactionClient;
