import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatAnthropic } from '@langchain/anthropic';
import { providerSettings } from '../config/llm.config';
import { BaseLangChainStrategy } from './BaseLangChainStrategy';
import type { ResolvedLLMOptions } from './llm.types';

/** Anthropic Claude. */
export class AnthropicStrategy extends BaseLangChainStrategy {
  constructor(settings = providerSettings.anthropic) {
    super(settings);
  }

  protected createModel(o: ResolvedLLMOptions): BaseChatModel {
    return new ChatAnthropic({
      apiKey: this.settings.apiKey,
      model: o.model,
      temperature: o.temperature,
      maxTokens: o.maxTokens,
      maxRetries: 1,
    });
  }
}
