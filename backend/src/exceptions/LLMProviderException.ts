import { AppException } from './AppException';

export type LLMErrorCode =
  | 'LLM_PROVIDER_ERROR'
  | 'LLM_PROVIDER_UNAVAILABLE'
  | 'LLM_PROVIDER_NOT_CONFIGURED'
  | 'LLM_PROVIDER_AUTH_FAILED'
  | 'LLM_PROVIDER_RATE_LIMITED'
  | 'LLM_PROVIDER_TIMEOUT'
  | 'LLM_EMPTY_RESPONSE';

const STATUS_BY_CODE: Record<LLMErrorCode, number> = {
  LLM_PROVIDER_ERROR: 502,
  LLM_PROVIDER_UNAVAILABLE: 503,
  LLM_PROVIDER_NOT_CONFIGURED: 503,
  LLM_PROVIDER_AUTH_FAILED: 502,
  LLM_PROVIDER_RATE_LIMITED: 429,
  LLM_PROVIDER_TIMEOUT: 504,
  LLM_EMPTY_RESPONSE: 502,
};

/** Raised by strategies / the factory when an upstream model call cannot be fulfilled. */
export class LLMProviderException extends AppException {
  public readonly provider: string;

  constructor(provider: string, message: string, code: LLMErrorCode = 'LLM_PROVIDER_ERROR', public override readonly cause?: unknown) {
    super(`[${provider}] ${message}`, STATUS_BY_CODE[code], code);
    this.provider = provider;
  }
}
