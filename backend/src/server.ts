import { createApp } from './app';
import { env, usingDevJwtSecret } from './config/env';
import { buildContainer } from './container';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  const container = buildContainer();

  try {
    await container.prisma.$connect();
    logger.info('Connected to MySQL');
  } catch (error) {
    logger.error('Could not connect to MySQL — is `docker compose up -d` running and DATABASE_URL correct?', {
      error: (error as Error).message,
    });
    process.exit(1);
  }

  if (usingDevJwtSecret) logger.warn('Using the built-in development JWT_SECRET. Set JWT_SECRET in backend/.env.');

  const app = createApp(container);
  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}/api/v1`);
    const providers = container.llmFactory
      .listProviders()
      .map((p) => `${p.id}${p.isDefault ? '*' : ''}=${p.configured ? p.model : 'not-configured'}`)
      .join(', ');
    logger.info(`LLM providers: ${providers}`);
  });
  // LLM answers can take a while — keep sockets open longer than the LLM timeout.
  server.requestTimeout = env.LLM_TIMEOUT_MS + 15_000;

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await container.prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason: String(reason) }));
}

void bootstrap();
