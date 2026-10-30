import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatAnthropic } from '@langchain/anthropic';
import type { AnthropicThinkingMode } from '../config/env';
import { anthropicSettings, AnthropicSettings, providerSettings } from '../config/llm.config';
import { logger } from '../utils/logger';
import { BaseLangChainStrategy } from './BaseLangChainStrategy';
import type { LLMImage, LLMOptions, LLMResponse, Message, ResolvedLLMOptions } from './llm.types';

/** Upstream 400 wording that means "this model only accepts `thinking: { type: 'adaptive' }`". */
const NEEDS_ADAPTIVE = /adaptive/i;
/** Upstream 400 wording that means "this model no longer accepts sampling parameters". */
const REJECTS_SAMPLING = /(temperature|top_p|top_k).{0,120}(not supported|unsupported|deprecated|not allowed|cannot|may not|only)/i;

/** What `auto` mode has learned about a model from earlier rejections (kept for the life of the process). */
interface LearnedModelQuirks {
  adaptive?: boolean;
  noSampling?: boolean;
}

/**
 * Anthropic Claude.
 *
 * Thinking is controlled by ANTHROPIC_THINKING (see config/env.ts). Newer Claude models reject the
 * `thinking: { type: 'disabled' | 'enabled' }` that LangChain sends by default and require
 * `{ type: 'adaptive' }` (optionally with `output_config.effort`) and no temperature / top_p / top_k.
 * The installed @langchain/anthropic doesn't know about adaptive thinking, so it is passed through
 * `invocationKwargs`, which is spread last into the request body and therefore overrides the defaults.
 */
export class AnthropicStrategy extends BaseLangChainStrategy {
  private readonly learned = new Map<string, LearnedModelQuirks>();

  constructor(settings = providerSettings.anthropic, private readonly anthropic: AnthropicSettings = anthropicSettings) {
    super(settings);
  }

  override async generateResponse(
    prompt: string,
    history: Message[] = [],
    options: LLMOptions = {},
    images: LLMImage[] = [],
  ): Promise<LLMResponse> {
    // Each rejection teaches one quirk, so at most two retries are ever needed.
    for (let attempt = 0; ; attempt++) {
      try {
        return await super.generateResponse(prompt, history, options, images);
      } catch (error) {
        if (attempt >= 2 || !this.learnFromRejection(this.resolveOptions(options).model, error)) throw error;
      }
    }
  }

  protected createModel(o: ResolvedLLMOptions): BaseChatModel {
    const quirks = this.learned.get(o.model) ?? {};
    const mode = this.effectiveMode(quirks);
    const { thinkingBudget, effort } = this.anthropic;

    // `enabled` needs max_tokens > budget_tokens; keep the normal answer budget on top of the thinking budget.
    const maxTokens = mode === 'enabled' && o.maxTokens <= thinkingBudget ? thinkingBudget + o.maxTokens : o.maxTokens;
    // Thinking modes don't allow custom sampling; undefined keys are dropped when the body is serialised.
    const dropSampling = mode === 'adaptive' || mode === 'enabled' || quirks.noSampling;

    const invocationKwargs: Record<string, unknown> = {
      ...(mode === 'adaptive' ? { thinking: { type: 'adaptive' } } : {}),
      ...(mode === 'enabled' ? { thinking: { type: 'enabled', budget_tokens: thinkingBudget } } : {}),
      ...(dropSampling ? { temperature: undefined, top_k: undefined, top_p: undefined } : {}),
      ...(effort ? { output_config: { effort } } : {}),
    };

    return new ChatAnthropic({
      apiKey: this.settings.apiKey,
      model: o.model,
      temperature: o.temperature,
      maxTokens,
      maxRetries: 1,
      // Stream internally (LangChain still returns one message): avoids fetch's 5-minute header wait and
      // the SDK's refusal of non-streaming requests that could exceed 10 minutes.
      streaming: true,
      clientOptions: { timeout: this.sdkTimeoutMs(o) },
      invocationKwargs,
    });
  }

  /** `auto` behaves like the classic request (`disabled`) until the API tells us the model needs adaptive. */
  private effectiveMode(quirks: LearnedModelQuirks): Exclude<AnthropicThinkingMode, 'auto'> {
    if (this.anthropic.thinking !== 'auto') return this.anthropic.thinking;
    return quirks.adaptive ? 'adaptive' : 'disabled';
  }

  /** In `auto` mode, record what a 400 says the model needs. Returns true when a retry would differ. */
  private learnFromRejection(model: string, error: unknown): boolean {
    if (this.anthropic.thinking !== 'auto') return false;
    const message = this.rawMessage(error);
    const quirks = this.learned.get(model) ?? {};

    if (!quirks.adaptive && NEEDS_ADAPTIVE.test(message)) {
      this.learned.set(model, { ...quirks, adaptive: true });
      logger.info('Anthropic model requires adaptive thinking — switching and retrying', { model });
      return true;
    }
    if (!quirks.noSampling && REJECTS_SAMPLING.test(message)) {
      this.learned.set(model, { ...quirks, noSampling: true });
      logger.info('Anthropic model rejects sampling parameters — dropping them and retrying', { model });
      return true;
    }
    return false;
  }

  /** The upstream SDK message (normaliseError wraps it, but keeps the original as `cause`). */
  private rawMessage(error: unknown): string {
    const parts: string[] = [];
    let current: unknown = error;
    for (let depth = 0; current && depth < 3; depth++) {
      const msg = (current as { message?: unknown }).message;
      if (typeof msg === 'string') parts.push(msg);
      current = (current as { cause?: unknown }).cause;
    }
    return parts.join(' | ');
  }
}
