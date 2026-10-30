import {
  BarChart3,
  Briefcase,
  Code2,
  GraduationCap,
  Lightbulb,
  PenLine,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import styled, { type DefaultTheme } from 'styled-components';

/** Mirrors `PROMPT_CATEGORY_ICONS` in `backend/src/config/prompts.config.ts`. */
const ICONS: Record<string, LucideIcon> = {
  pen: PenLine,
  code: Code2,
  chart: BarChart3,
  briefcase: Briefcase,
  shield: ShieldCheck,
  'graduation-cap': GraduationCap,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
};

/** Each icon gets a tint from the active palette so categories are easy to tell apart. */
const TINTS: Record<string, (t: DefaultTheme) => string> = {
  pen: (t) => t.colors.accent,
  code: (t) => t.colors.primary,
  chart: (t) => t.colors.success,
  briefcase: (t) => t.colors.warning,
  shield: (t) => t.colors.primaryHover,
  'graduation-cap': (t) => t.colors.success,
  lightbulb: (t) => t.colors.accent,
  sparkles: (t) => t.colors.primary,
};

const Tile = styled.span<{ $icon: string; $size: number }>`
  flex-shrink: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ theme }) => theme.radii.md};
  display: grid;
  place-items: center;
  color: ${({ theme, $icon }) => (TINTS[$icon] ?? TINTS.sparkles)(theme)};
  background: color-mix(in srgb, ${({ theme, $icon }) => (TINTS[$icon] ?? TINTS.sparkles)(theme)} 16%, transparent);
  border: 1px solid color-mix(in srgb, ${({ theme, $icon }) => (TINTS[$icon] ?? TINTS.sparkles)(theme)} 35%, transparent);
`;

/** Tinted square tile with the category's icon. Unknown names → sparkle. */
export function PromptCategoryIcon({ name, size = 36 }: { name?: string | null; size?: number }) {
  const key = name && ICONS[name] ? name : 'sparkles';
  const Icon = ICONS[key];
  return (
    <Tile $icon={key} $size={size} aria-hidden>
      <Icon size={Math.round(size * 0.5)} />
    </Tile>
  );
}
