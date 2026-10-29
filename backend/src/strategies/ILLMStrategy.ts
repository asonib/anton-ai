import type { LLMProvider } from '../config/env';
import type { LLMImage, LLMOptions, LLMResponse, Message } from './llm.types';

/**
 * Strategy contract for every LLM provider.
 * Request/response only (no streaming / SSE): one prompt in, one completed answer out.
 * `images` are attached to the current human turn (multimodal input).
 */
export interface ILLMStrategy {
  /** Stable identifier used by the factory and persisted in messages.provider. */
  readonly provider: LLMProvider;
  /** Human-readable label for UIs. */
  readonly label: string;
  /** Model used when the request does not override it. */
  readonly defaultModel: string;

  /** True when the strategy has everything it needs (API key, endpoint…). */
  isConfigured(): boolean;

  generateResponse(prompt: string, history?: Message[], options?: LLMOptions, images?: LLMImage[]): Promise<LLMResponse>;
}
