import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import type { Container } from './container';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware';
import { requestLogger } from './middlewares/requestLogger.middleware';
import { apiRoutes } from './routes';

/** Express application factory (no `listen` here — keeps the app testable). */
export function createApp(container: Container): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.use('/api/v1', apiRoutes(container));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
