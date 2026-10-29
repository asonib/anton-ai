import type { Message as MessageEntity } from '@prisma/client';
import type { LLMProvider } from '../config/env';
import { llmDefaults } from '../config/llm.config';
import type { LLMOptions, LLMResponse, Message, ProviderInfo } from '../strategies/llm.types';
import type { LLMStrategyFactory } from '../strategies/LLMStrategyFactory';
import { logger } from '../utils/logger';

/**
 * LLM orchestration service: picks the strategy (via the factory), converts
 * persisted messages into the windowed conversation memory, and invokes the model.
 * Knows nothing about HTTP or about how messages are stored.
 */
export class LLMService {
  constructor(
    private readonly factory: LLMStrategyFactory,
    private readonly historyWindow: number = llmDefaults.historyWindow,
  ) {}

  get memoryWindow(): number {
    return this.historyWindow;
  }

  listProviders(): ProviderInfo[] {
    return this.factory.listProviders();
  }

  /** Validates the provider early (before any DB writes) and returns the resolved id/model. */
  resolveProvider(provider?: string | null, model?: string): { provider: LLMProvider; model: string } {
    const strategy = this.factory.resolve(provider);
    return { provider: strategy.provider, model: model?.trim() || strategy.defaultModel };
  }

  buildMemory(history: MessageEntity[]): Message[] {
    return history.slice(-this.historyWindow).map((m) => ({ role: m.role, content: m.content }));
  }

  async generate(
    prompt: string,
    history: MessageEntity[],
    provider?: string | null,
    options: LLMOptions = {},
  ): Promise<LLMResponse> {
    const strategy = this.factory.resolve(provider);
    logger.info('Invoking LLM', { provider: strategy.provider, model: options.model ?? strategy.defaultModel, historySize: history.length });
    return strategy.generateResponse(prompt, this.buildMemory(history), options);
  }
}
