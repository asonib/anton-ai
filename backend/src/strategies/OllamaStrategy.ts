import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOllama } from '@langchain/ollama';
import { providerSettings } from '../config/llm.config';
import { BaseLangChainStrategy } from './BaseLangChainStrategy';
import type { ResolvedLLMOptions } from './llm.types';

/** Default strategy — talks to a local Ollama daemon (no API key required). */
export class OllamaStrategy extends BaseLangChainStrategy {
  constructor(settings = providerSettings.ollama) {
    super(settings);
  }

  override isConfigured(): boolean {
    return Boolean(this.settings.baseUrl);
  }

  protected createModel(o: ResolvedLLMOptions): BaseChatModel {
    return new ChatOllama({
      baseUrl: this.settings.baseUrl,
      model: o.model,
      temperature: o.temperature,
      numPredict: o.maxTokens,
      maxRetries: 1,
    });
  }
}
