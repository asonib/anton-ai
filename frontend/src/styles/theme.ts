import { PALETTES, type PaletteId } from './palettes';

/**
 * Design tokens. Components must read colours/spacing/radii from the theme —
 * never hard-code hex values inside styled components.
 * Colours/shadows come from a palette in `./palettes.ts`.
 */
const shared = {
  fonts: {
    body: `'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    mono: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`,
  },
  fontSizes: { xs: '0.75rem', sm: '0.8125rem', md: '0.9375rem', lg: '1.0625rem', xl: '1.375rem', xxl: '1.875rem' },
  space: { xxs: '2px', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px', xxxl: '48px' },
  radii: { sm: '6px', md: '10px', lg: '14px', xl: '20px', pill: '999px' },
  layout: { sidebarWidth: '288px', sidebarCollapsedWidth: '64px', chatMaxWidth: '820px' },
  breakpoints: { mobile: '768px' },
  transitions: { fast: '120ms ease', base: '200ms ease', slow: '360ms cubic-bezier(0.22, 1, 0.36, 1)' },
  zIndex: { sidebar: 30, overlay: 20, toast: 50 },
} as const;

export interface ThemeColors {
  bg: string;
  bgElevated: string;
  bgSunken: string;
  surface: string;
  surfaceHover: string;
  /** Sidebar / HUD container background. May be semi-transparent. */
  panel: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  onPrimary: string;
  /** Gradient fill for primary CTAs (sign in/up, new chat, send). Drawn at 200% width; hover slides to the far end. */
  primaryGradient: string;
  accent: string;
  userBubble: string;
  userBubbleText: string;
  assistantBubble: string;
  codeBg: string;
  codeHeader: string;
  inlineCodeBg: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  skeleton: string;
  skeletonHighlight: string;
  overlay: string;
  focusRing: string;
  /** Colour used for glow effects on active elements. */
  glow: string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  /** Glow around active/primary elements (`none` for palettes without glow). */
  glow: string;
}

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  paletteId: PaletteId;
  colors: ThemeColors;
  fonts: typeof shared.fonts;
  fontSizes: typeof shared.fontSizes;
  space: typeof shared.space;
  radii: typeof shared.radii;
  layout: typeof shared.layout;
  breakpoints: typeof shared.breakpoints;
  transitions: typeof shared.transitions;
  zIndex: typeof shared.zIndex;
  shadows: ThemeShadows;
}

/** Combine the shared tokens with one palette variant. */
export const buildTheme = (paletteId: PaletteId, mode: ThemeMode): AppTheme => {
  const palette = PALETTES[paletteId];
  const variant = palette[mode];
  return { ...shared, mode, paletteId, colors: variant.colors, shadows: variant.shadows };
};

/** Media-query helper: ${media.mobile} { ... } */
export const media = {
  mobile: `@media (max-width: ${shared.breakpoints.mobile})`,
  desktop: `@media (min-width: ${parseInt(shared.breakpoints.mobile, 10) + 1}px)`,
} as const;
