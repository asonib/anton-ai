import { attachmentLimits } from './config/attachments.config';
import { defaultProvider } from './config/llm.config';
import { BUILT_IN_PROMPTS, PROMPT_CATEGORIES } from './config/prompts.config';
import { SKILLS } from './config/skills.config';
import { AttachmentController } from './controllers/attachment.controller';
import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';
import { HealthController } from './controllers/health.controller';
import { PromptController } from './controllers/prompt.controller';
import { ProviderController } from './controllers/provider.controller';
import { SkillController } from './controllers/skill.controller';
import { createAuthMiddleware } from './middlewares/auth.middleware';
import { createUploadMiddleware } from './middlewares/upload.middleware';
import { prisma } from './models/prisma.client';
import { AttachmentRepository } from './models/repositories/attachment.repository';
import { ConversationRepository } from './models/repositories/conversation.repository';
import { MessageRepository } from './models/repositories/message.repository';
import { PromptRepository } from './models/repositories/prompt.repository';
import { UserRepository } from './models/repositories/user.repository';
import { AttachmentService } from './services/attachment.service';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { LLMService } from './services/llm.service';
import { PromptService } from './services/prompt.service';
import { SkillService } from './services/skill.service';
import { TokenService } from './services/token.service';
import {
  AnthropicStrategy,
  GeminiStrategy,
  GrokStrategy,
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
  const promptRepository = new PromptRepository(prisma);

  // Strategies (LLM providers)
  const llmFactory = new LLMStrategyFactory(
    [new OllamaStrategy(), new OpenAIStrategy(), new AnthropicStrategy(), new GeminiStrategy(), new GrokStrategy()],
    defaultProvider,
  );

  // Services (business logic)
  const tokenService = new TokenService();
  const authService = new AuthService(userRepository, tokenService);
  const llmService = new LLMService(llmFactory);
  const skillService = new SkillService(SKILLS);
  const promptService = new PromptService(promptRepository, PROMPT_CATEGORIES, BUILT_IN_PROMPTS);
  const attachmentService = new AttachmentService(attachmentRepository, attachmentLimits);
  const chatService = new ChatService(
    prisma,
    conversationRepository,
    messageRepository,
    attachmentRepository,
    attachmentService,
    llmService,
    skillService,
  );

  return {
    prisma,
    llmFactory,
    promptService,
    authMiddleware: createAuthMiddleware(authService),
    uploadMiddleware: createUploadMiddleware(attachmentLimits),
    controllers: {
      auth: new AuthController(authService),
      chat: new ChatController(chatService),
      attachment: new AttachmentController(attachmentService),
      provider: new ProviderController(llmService),
      skill: new SkillController(skillService),
      prompt: new PromptController(promptService),
      health: new HealthController(prisma),
    },
  };
}

export type Container = ReturnType<typeof buildContainer>;
