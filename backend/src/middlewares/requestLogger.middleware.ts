import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../utils/logger';

/** Assigns a request id (honours inbound X-Request-Id) and logs method/path/status/duration. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const inbound = req.header('x-request-id');
  const requestId = inbound && inbound.length <= 128 ? inbound : randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const meta = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      userId: req.user?.id,
    };
    if (res.statusCode >= 500) logger.error('request', meta);
    else if (res.statusCode >= 400) logger.warn('request', meta);
    else logger.info('request', meta);
  });
  next();
};
