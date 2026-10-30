import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { providerSettings } from '../config/llm.config';
import { BaseLangChainStrategy } from './BaseLangChainStrategy';
import type { ResolvedLLMOptions } from './llm.types';

/** Google Gemini (Generative Language API). */
export class GeminiStrategy extends BaseLangChainStrategy {
  constructor(settings = providerSettings.gemini) {
    super(settings);
  }

  protected createModel(o: ResolvedLLMOptions): BaseChatModel {
    return new ChatGoogleGenerativeAI({
      apiKey: this.settings.apiKey,
      model: o.model,
      temperature: o.temperature,
      maxOutputTokens: o.maxTokens,
      maxRetries: 1,
      // Stream internally (LangChain still returns one message) so long answers never hit fetch's
      // 5-minute wait-for-headers limit. The Gemini SDK has no timeout unless one is set.
      streaming: true,
    });
  }
}
