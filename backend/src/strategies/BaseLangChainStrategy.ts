import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import type { LLMProvider } from '../config/env';
import { llmDefaults, ProviderSettings } from '../config/llm.config';
import { LLMProviderException } from '../exceptions';
import { logger } from '../utils/logger';
import type { ILLMStrategy } from './ILLMStrategy';
import type { LLMImage, LLMOptions, LLMResponse, LLMUsage, Message, ResolvedLLMOptions } from './llm.types';

/** Upstream messages that mean "this model can't take images" (Ollama, OpenAI, Gemini wording). */
const LACKS_VISION =
  /(support|capab|cannot|can't|not allowed).{0,40}(image|vision|multimodal)|(image|vision|multimodal).{0,40}(not supported|unsupported|not enabled)|missing data required for image/i;

/**
 * Template Method base for LangChain-backed strategies.
 *
 *  - Prompt templating:   ChatPromptTemplate(system → {history} → {input})
 *  - Multimodal input:    images become `image_url` data-URL parts (supported by all LangChain chat models we use)
 *  - Conversation memory: DB history (windowed by the service) → LangChain BaseMessage[]
 *  - Error normalisation: any upstream failure → LLMProviderException
 *
 * Concrete strategies only implement `createModel()` (and optionally `isConfigured()`).
 */
export abstract class BaseLangChainStrategy implements ILLMStrategy {
  public readonly provider: LLMProvider;
  public readonly label: string;
  public readonly defaultModel: string;

  protected static readonly promptTemplate = ChatPromptTemplate.fromMessages([
    ['system', '{systemPrompt}'],
    new MessagesPlaceholder('history'),
    // The human turn is injected as a message (not an f-string) so it can carry image parts.
    new MessagesPlaceholder('input'),
  ]);

  protected constructor(protected readonly settings: ProviderSettings) {
    this.provider = settings.provider;
    this.label = settings.label;
    this.defaultModel = settings.model;
  }

  /** Build the provider-specific LangChain chat model. */
  protected abstract createModel(options: ResolvedLLMOptions): BaseChatModel;

  isConfigured(): boolean {
    return Boolean(this.settings.apiKey);
  }

  async generateResponse(
    prompt: string,
    history: Message[] = [],
    options: LLMOptions = {},
    images: LLMImage[] = [],
  ): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new LLMProviderException(
        this.provider,
        `Provider is not configured${this.settings.requiredEnv ? ` — set ${this.settings.requiredEnv} in backend/.env` : ''}`,
        'LLM_PROVIDER_NOT_CONFIGURED',
      );
    }

    const resolved = this.resolveOptions(options);
    const chain = BaseLangChainStrategy.promptTemplate.pipe(this.createModel(resolved));
    const startedAt = Date.now();

    let result: BaseMessage;
    try {
      result = await chain.invoke(
        {
          systemPrompt: resolved.systemPrompt,
          history: this.toLangChainHistory(history),
          input: [this.toHumanMessage(prompt, images)],
        },
        { signal: AbortSignal.timeout(resolved.timeoutMs) },
      );
    } catch (error) {
      throw this.normaliseError(error, resolved, images.length > 0 || history.some((m) => m.images?.length));
    }

    const content = this.extractText(result).trim();
    if (!content) {
      throw new LLMProviderException(this.provider, 'Model returned an empty response', 'LLM_EMPTY_RESPONSE');
    }

    const latencyMs = Date.now() - startedAt;
    logger.debug('LLM call completed', { provider: this.provider, model: resolved.model, latencyMs });

    return {
      content,
      provider: this.provider,
      model: resolved.model,
      usage: this.extractUsage(result),
      latencyMs,
      finishReason: this.extractFinishReason(result),
    };
  }

  /* ------------------------------ helpers ------------------------------ */

  protected resolveOptions(options: LLMOptions): ResolvedLLMOptions {
    return {
      model: options.model?.trim() || this.defaultModel,
      temperature: options.temperature ?? llmDefaults.temperature,
      maxTokens: options.maxTokens ?? llmDefaults.maxTokens,
      systemPrompt: options.systemPrompt?.trim() || llmDefaults.systemPrompt,
      timeoutMs: options.timeoutMs ?? llmDefaults.timeoutMs,
    };
  }

  /** Plain text, or a multimodal content array when images are attached. */
  protected toHumanMessage(text: string, images: LLMImage[] = []): HumanMessage {
    if (images.length === 0) return new HumanMessage(text);
    return new HumanMessage({
      content: [
        // Some providers (Anthropic) reject empty text blocks.
        ...(text.trim() ? [{ type: 'text' as const, text }] : []),
        ...images.map((img) => ({ type: 'image_url' as const, image_url: { url: `data:${img.mimeType};base64,${img.base64}` } })),
      ],
    });
  }

  protected toLangChainHistory(history: Message[]): BaseMessage[] {
    return history
      .filter((m) => m.content.trim().length > 0 || (m.images?.length ?? 0) > 0)
      .map((m) => {
        switch (m.role) {
          case 'assistant':
            return new AIMessage(m.content);
          case 'system':
            return new SystemMessage(m.content);
          default:
            return this.toHumanMessage(m.content, m.images);
        }
      });
  }

  protected extractText(message: BaseMessage): string {
    const { content } = message;
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        const text = (part as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      })
      .join('');
  }

  protected extractUsage(message: BaseMessage): LLMUsage | undefined {
    const usage = (message as unknown as {
      usage_metadata?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
    }).usage_metadata;
    if (!usage) return undefined;
    return { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, totalTokens: usage.total_tokens };
  }

  protected extractFinishReason(message: BaseMessage): string | undefined {
    const meta = (message.response_metadata ?? {}) as Record<string, unknown>;
    const reason = meta.finish_reason ?? meta.stop_reason ?? meta.done_reason ?? meta.finishReason;
    return typeof reason === 'string' ? reason : undefined;
  }

  /** Map heterogeneous SDK / network errors onto our domain exception. */
  protected normaliseError(error: unknown, options: ResolvedLLMOptions, sentImages = false): LLMProviderException {
    if (error instanceof LLMProviderException) return error;

    const err = error as { name?: string; message?: string; status?: number; code?: string; cause?: { code?: string } };
    const status = err?.status;
    const message = err?.message ?? String(error);
    const netCode = err?.code ?? err?.cause?.code;

    logger.warn('LLM provider call failed', { provider: this.provider, model: options.model, status, netCode, message });

    if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || /aborted|timed? ?out/i.test(message)) {
      return new LLMProviderException(this.provider, `Request timed out after ${options.timeoutMs} ms`, 'LLM_PROVIDER_TIMEOUT', error);
    }
    if (netCode === 'ECONNREFUSED' || netCode === 'ENOTFOUND' || /fetch failed|ECONNREFUSED/i.test(message)) {
      return new LLMProviderException(this.provider, `Provider endpoint is unreachable (${this.settings.baseUrl ?? 'default endpoint'})`, 'LLM_PROVIDER_UNAVAILABLE', error);
    }
    if (status === 401 || status === 403 || /api key|unauthori[sz]ed|permission/i.test(message)) {
      return new LLMProviderException(this.provider, 'Authentication with the provider failed — check the API key', 'LLM_PROVIDER_AUTH_FAILED', error);
    }
    if (status === 429 || /rate limit|quota/i.test(message)) {
      return new LLMProviderException(this.provider, 'Provider rate limit or quota exceeded', 'LLM_PROVIDER_RATE_LIMITED', error);
    }
    if (sentImages && LACKS_VISION.test(message)) {
      return new LLMProviderException(
        this.provider,
        `Model '${options.model}' does not appear to support image input — choose a vision-capable model or remove the image`,
        'LLM_PROVIDER_ERROR',
        error,
      );
    }
    if (status === 404 || /not found/i.test(message)) {
      return new LLMProviderException(this.provider, `Model '${options.model}' was not found on the provider`, 'LLM_PROVIDER_ERROR', error);
    }
    return new LLMProviderException(this.provider, `Upstream error: ${message}`, 'LLM_PROVIDER_ERROR', error);
  }
}
