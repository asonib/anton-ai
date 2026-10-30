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

  try {
    const count = await container.promptService.syncBuiltIns();
    logger.info(`Prompt library: ${count} built-in prompts synced`);
  } catch (error) {
    // Most likely the schema hasn't been pushed yet — the rest of the API still works.
    logger.warn('Could not sync built-in prompts — run `npm run db:push` if the prompts table is missing', {
      error: (error as Error).message,
    });
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
  // LLM answers and git clones can take a while — keep sockets open longer than either timeout.
  // LLM_TIMEOUT_MS = 0 means unlimited, so Node's own request timeout is switched off too.
  server.requestTimeout = env.LLM_TIMEOUT_MS === 0 ? 0 : Math.max(env.LLM_TIMEOUT_MS, env.GIT_CLONE_TIMEOUT_MS) + 15_000;

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
