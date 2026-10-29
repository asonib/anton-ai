import { Bot, Orbit, type LucideIcon } from 'lucide-react';
import { siClaude, siGooglegemini, siOllama, type SimpleIcon } from 'simple-icons';
import type { LLMProvider } from '../../api/types';

/**
 * Brand marks from `simple-icons` (CC0 SVG data; the logos themselves remain trademarks of their owners).
 * Providers without an icon in simple-icons (OpenAI was removed from the set; xAI isn't in it) fall back to a lucide icon.
 * Rendered monochrome with `currentColor` so they follow the active palette and dark/light mode.
 */
const BRAND_ICONS: Partial<Record<LLMProvider, SimpleIcon>> = {
  ollama: siOllama,
  gemini: siGooglegemini,
  anthropic: siClaude,
};

/** Lucide fallbacks so brand-less providers stay distinguishable from each other. */
const FALLBACK_ICONS: Partial<Record<LLMProvider, LucideIcon>> = {
  grok: Orbit,
};

interface Props {
  provider: LLMProvider;
  size?: number;
  className?: string;
}

export function ProviderIcon({ provider, size = 15, className }: Props) {
  const icon = BRAND_ICONS[provider];
  if (!icon) {
    const Fallback = FALLBACK_ICONS[provider] ?? Bot;
    return <Fallback size={size} className={className} aria-hidden="true" />;
  }

  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      focusable="false"
    >
      <path d={icon.path} />
    </svg>
  );
}
