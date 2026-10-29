import type { PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';

export class HealthController {
  constructor(private readonly prisma: PrismaClient) {}

  check = async (_req: Request, res: Response) => {
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    res.status(database === 'up' ? 200 : 503);
    return res.json({ success: database === 'up', data: { status: database === 'up' ? 'ok' : 'degraded', database, uptimeSec: Math.round(process.uptime()) } });
  };
}
