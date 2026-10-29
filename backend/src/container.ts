import { defaultProvider } from './config/llm.config';
import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';
import { HealthController } from './controllers/health.controller';
import { ProviderController } from './controllers/provider.controller';
import { createAuthMiddleware } from './middlewares/auth.middleware';
import { prisma } from './models/prisma.client';
import { ConversationRepository } from './models/repositories/conversation.repository';
import { MessageRepository } from './models/repositories/message.repository';
import { UserRepository } from './models/repositories/user.repository';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { LLMService } from './services/llm.service';
import { TokenService } from './services/token.service';
import {
  AnthropicStrategy,
  GeminiStrategy,
  LLMStrategyFactory,
  OllamaStrategy,
  OpenAIStrategy,
} from './strategies';

/**
 * Composition root. The only place where concrete classes are instantiated
 * and wired together (manual constructor injection — no DI framework needed).
 */
export function buildContainer() {
  // Repositories (data access)
  const userRepository = new UserRepository(prisma);
  const conversationRepository = new ConversationRepository(prisma);
  const messageRepository = new MessageRepository(prisma);

  // Strategies (LLM providers)
  const llmFactory = new LLMStrategyFactory(
    [new OllamaStrategy(), new OpenAIStrategy(), new AnthropicStrategy(), new GeminiStrategy()],
    defaultProvider,
  );

  // Services (business logic)
  const tokenService = new TokenService();
  const authService = new AuthService(userRepository, tokenService);
  const llmService = new LLMService(llmFactory);
  const chatService = new ChatService(prisma, conversationRepository, messageRepository, llmService);

  return {
    prisma,
    llmFactory,
    authMiddleware: createAuthMiddleware(tokenService),
    controllers: {
      auth: new AuthController(authService),
      chat: new ChatController(chatService),
      provider: new ProviderController(llmService),
      health: new HealthController(prisma),
    },
  };
}

export type Container = ReturnType<typeof buildContainer>;
