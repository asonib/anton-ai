import { env, LLMProvider } from './env';

/** Static, per-provider settings consumed by the strategy implementations. */
export interface ProviderSettings {
  provider: LLMProvider;
  label: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  /** Env var a developer must set to enable this provider (for helpful errors). */
  requiredEnv?: string;
}

export interface LLMRuntimeDefaults {
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  systemPrompt: string;
  historyWindow: number;
}

export const llmDefaults: LLMRuntimeDefaults = Object.freeze({
  temperature: env.LLM_TEMPERATURE,
  maxTokens: env.LLM_MAX_TOKENS,
  timeoutMs: env.LLM_TIMEOUT_MS,
  systemPrompt: env.LLM_SYSTEM_PROMPT,
  historyWindow: env.CHAT_HISTORY_WINDOW,
});

export const providerSettings: Readonly<Record<LLMProvider, ProviderSettings>> = Object.freeze({
  ollama: {
    provider: 'ollama',
    label: 'Ollama (local)',
    model: env.OLLAMA_MODEL,
    baseUrl: env.OLLAMA_BASE_URL,
  },
  openai: {
    provider: 'openai',
    label: 'OpenAI (ChatGPT)',
    model: env.OPENAI_MODEL,
    apiKey: env.OPENAI_API_KEY,
    baseUrl: env.OPENAI_BASE_URL,
    requiredEnv: 'OPENAI_API_KEY',
  },
  anthropic: {
    provider: 'anthropic',
    label: 'Anthropic (Claude)',
    model: env.ANTHROPIC_MODEL,
    apiKey: env.ANTHROPIC_API_KEY,
    requiredEnv: 'ANTHROPIC_API_KEY',
  },
  gemini: {
    provider: 'gemini',
    label: 'Google Gemini',
    model: env.GEMINI_MODEL,
    apiKey: env.GEMINI_API_KEY,
    requiredEnv: 'GEMINI_API_KEY',
  },
});

export const defaultProvider: LLMProvider = env.DEFAULT_LLM_PROVIDER;
