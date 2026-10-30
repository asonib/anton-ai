import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { providerSettings } from '../config/llm.config';
import { BaseLangChainStrategy } from './BaseLangChainStrategy';
import type { ResolvedLLMOptions } from './llm.types';

/**
 * xAI Grok. The xAI API is OpenAI-compatible, so this reuses `ChatOpenAI`
 * pointed at `XAI_BASE_URL` (default https://api.x.ai/v1) — no extra SDK needed.
 */
export class GrokStrategy extends BaseLangChainStrategy {
  constructor(settings = providerSettings.grok) {
    super(settings);
  }

  protected createModel(o: ResolvedLLMOptions): BaseChatModel {
    return new ChatOpenAI({
      apiKey: this.settings.apiKey,
      model: o.model,
      temperature: o.temperature,
      maxTokens: o.maxTokens,
      maxRetries: 1,
      streaming: true, // see OpenAIStrategy — avoids fetch's 5-minute header wait on long answers
      timeout: this.sdkTimeoutMs(o),
      configuration: { baseURL: this.settings.baseUrl },
    });
  }
}
