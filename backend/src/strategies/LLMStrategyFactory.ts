import { isLLMProvider, LLM_PROVIDERS, LLMProvider } from '../config/env';
import { LLMProviderException, ValidationException } from '../exceptions';
import type { ILLMStrategy } from './ILLMStrategy';
import type { ProviderInfo } from './llm.types';

/**
 * Resolves the active ILLMStrategy.
 *   1. explicit `provider` from the request payload (if given)
 *   2. otherwise DEFAULT_LLM_PROVIDER from .env
 *
 * Open/Closed: adding a provider = new strategy class + `register()` in the container.
 */
export class LLMStrategyFactory {
  private readonly registry = new Map<LLMProvider, ILLMStrategy>();

  constructor(strategies: ILLMStrategy[], private readonly defaultProvider: LLMProvider) {
    strategies.forEach((s) => this.register(s));
  }

  register(strategy: ILLMStrategy): this {
    this.registry.set(strategy.provider, strategy);
    return this;
  }

  get default(): LLMProvider {
    return this.defaultProvider;
  }

  resolve(provider?: string | null): ILLMStrategy {
    const key = (provider ?? this.defaultProvider).toString().trim().toLowerCase();

    if (!isLLMProvider(key)) {
      throw new ValidationException(`Unknown LLM provider '${provider}'`, [
        { field: 'provider', message: `Must be one of: ${LLM_PROVIDERS.join(', ')}` },
      ]);
    }

    const strategy = this.registry.get(key);
    if (!strategy) {
      throw new LLMProviderException(key, 'No strategy registered for this provider', 'LLM_PROVIDER_NOT_CONFIGURED');
    }
    return strategy;
  }

  listProviders(): ProviderInfo[] {
    return [...this.registry.values()].map((s) => ({
      id: s.provider,
      label: s.label,
      model: s.defaultModel,
      configured: s.isConfigured(),
      isDefault: s.provider === this.defaultProvider,
    }));
  }
}
