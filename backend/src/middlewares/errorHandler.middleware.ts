import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { isProduction } from '../config/env';
import { AppException, ResourceNotFoundException } from '../exceptions';
import type { ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

/** Converts unknown errors into AppException instances. */
function normalise(err: unknown): AppException {
  if (err instanceof AppException) return err;

  // Malformed JSON body from express.json()
  const bodyErr = err as { type?: string; status?: number };
  if (bodyErr?.type === 'entity.parse.failed') return new AppException('Malformed JSON request body', 400, 'BAD_REQUEST');
  if (bodyErr?.type === 'entity.too.large') return new AppException('Request body too large', 413, 'PAYLOAD_TOO_LARGE');

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return new AppException('Resource already exists', 409, 'CONFLICT');
    if (err.code === 'P2025') return new AppException('Resource was not found', 404, 'RESOURCE_NOT_FOUND');
    if (err.code === 'P2003') return new AppException('A related resource no longer exists', 409, 'FOREIGN_KEY_VIOLATION');
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new AppException('Database is unavailable', 503, 'DATABASE_UNAVAILABLE');
  }
  return new AppException('An unexpected error occurred', 500, 'INTERNAL_ERROR');
}

/** Global exception handler — the ONLY place that writes error responses. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const ex = normalise(err);

  if (ex.statusCode >= 500) {
    logger.error(ex.message, {
      requestId: req.requestId,
      code: ex.code,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  const body: ApiError = {
    success: false,
    error: {
      code: ex.code,
      message: ex.message,
      ...(ex.details?.length ? { details: ex.details } : {}),
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      ...(!isProduction && ex.statusCode >= 500 && err instanceof Error ? { stack: err.stack } : {}),
    },
  };

  res.status(ex.statusCode).json(body);
};

/** 404 for unmatched routes. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ResourceNotFoundException('Route', `${req.method} ${req.originalUrl}`));
};
