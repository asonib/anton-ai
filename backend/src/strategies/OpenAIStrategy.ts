import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { providerSettings } from '../config/llm.config';
import { BaseLangChainStrategy } from './BaseLangChainStrategy';
import type { ResolvedLLMOptions } from './llm.types';

/** OpenAI / ChatGPT. Set OPENAI_BASE_URL to target any OpenAI-compatible gateway. */
export class OpenAIStrategy extends BaseLangChainStrategy {
  constructor(settings = providerSettings.openai) {
    super(settings);
  }

  protected createModel(o: ResolvedLLMOptions): BaseChatModel {
    return new ChatOpenAI({
      apiKey: this.settings.apiKey,
      model: o.model,
      temperature: o.temperature,
      maxTokens: o.maxTokens,
      maxRetries: 1,
      ...(this.settings.baseUrl ? { configuration: { baseURL: this.settings.baseUrl } } : {}),
    });
  }
}
