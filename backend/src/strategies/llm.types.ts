import type { LLMProvider } from '../config/env';

/** Inline image sent to a vision-capable model. */
export interface LLMImage {
  mimeType: string;
  /** Raw base64 (no `data:` prefix). */
  base64: string;
}

/** Provider-agnostic conversation turn passed into a strategy as memory. */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  /** Images attached to a user turn (only honoured for `user` messages). */
  images?: LLMImage[];
}

/** Per-request overrides. Anything omitted falls back to llmDefaults / provider settings. */
export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeoutMs?: number;
  /**
   * Called with each output chunk while the provider streams internally (progress only — the
   * caller still gets one completed answer). Errors thrown by the callback are ignored.
   */
  onToken?: (chunk: string) => void;
}

export interface ResolvedLLMOptions {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  timeoutMs: number;
}

export interface LLMUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

/** Normalised result every strategy must return. */
export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  usage?: LLMUsage;
  latencyMs: number;
  finishReason?: string;
}

export interface ProviderInfo {
  id: LLMProvider;
  label: string;
  model: string;
  configured: boolean;
  isDefault: boolean;
}
