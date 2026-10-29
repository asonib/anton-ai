import type { LLMProvider } from '../config/env';

/** Provider-agnostic conversation turn passed into a strategy as memory. */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Per-request overrides. Anything omitted falls back to llmDefaults / provider settings. */
export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeoutMs?: number;
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
