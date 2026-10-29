import { attachmentLimits } from './config/attachments.config';
import { defaultProvider } from './config/llm.config';
import { AttachmentController } from './controllers/attachment.controller';
import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';
import { HealthController } from './controllers/health.controller';
import { ProviderController } from './controllers/provider.controller';
import { createAuthMiddleware } from './middlewares/auth.middleware';
import { createUploadMiddleware } from './middlewares/upload.middleware';
import { prisma } from './models/prisma.client';
import { AttachmentRepository } from './models/repositories/attachment.repository';
import { ConversationRepository } from './models/repositories/conversation.repository';
import { MessageRepository } from './models/repositories/message.repository';
import { UserRepository } from './models/repositories/user.repository';
import { AttachmentService } from './services/attachment.service';
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
  const attachmentRepository = new AttachmentRepository(prisma);

  // Strategies (LLM providers)
  const llmFactory = new LLMStrategyFactory(
    [new OllamaStrategy(), new OpenAIStrategy(), new AnthropicStrategy(), new GeminiStrategy()],
    defaultProvider,
  );

  // Services (business logic)
  const tokenService = new TokenService();
  const authService = new AuthService(userRepository, tokenService);
  const llmService = new LLMService(llmFactory);
  const attachmentService = new AttachmentService(attachmentRepository, attachmentLimits);
  const chatService = new ChatService(
    prisma,
    conversationRepository,
    messageRepository,
    attachmentRepository,
    attachmentService,
    llmService,
  );

  return {
    prisma,
    llmFactory,
    authMiddleware: createAuthMiddleware(authService),
    uploadMiddleware: createUploadMiddleware(attachmentLimits),
    controllers: {
      auth: new AuthController(authService),
      chat: new ChatController(chatService),
      attachment: new AttachmentController(attachmentService),
      provider: new ProviderController(llmService),
      health: new HealthController(prisma),
    },
  };
}

export type Container = ReturnType<typeof buildContainer>;
