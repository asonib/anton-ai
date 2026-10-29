/**
 * Design tokens. Components must read colours/spacing/radii from the theme —
 * never hard-code hex values inside styled components.
 */
const shared = {
  fonts: {
    body: `'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    mono: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`,
  },
  fontSizes: { xs: '0.75rem', sm: '0.8125rem', md: '0.9375rem', lg: '1.0625rem', xl: '1.375rem', xxl: '1.875rem' },
  space: { xxs: '2px', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px', xxxl: '48px' },
  radii: { sm: '6px', md: '10px', lg: '14px', xl: '20px', pill: '999px' },
  layout: { sidebarWidth: '288px', chatMaxWidth: '820px' },
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
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  onPrimary: string;
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
}

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  colors: ThemeColors;
  fonts: typeof shared.fonts;
  fontSizes: typeof shared.fontSizes;
  space: typeof shared.space;
  radii: typeof shared.radii;
  layout: typeof shared.layout;
  breakpoints: typeof shared.breakpoints;
  transitions: typeof shared.transitions;
  zIndex: typeof shared.zIndex;
  shadows: { sm: string; md: string; lg: string };
}

export const darkTheme: AppTheme = {
  ...shared,
  mode: 'dark',
  colors: {
    bg: '#0d0f14',
    bgElevated: '#13161d',
    bgSunken: '#090b0f',
    surface: '#181c25',
    surfaceHover: '#1f2430',
    border: '#252a36',
    borderStrong: '#343b4b',
    text: '#e7e9ee',
    textMuted: '#a1a8b8',
    textSubtle: '#6b7385',
    primary: '#7c5cff',
    primaryHover: '#8f74ff',
    primarySoft: 'rgba(124, 92, 255, 0.16)',
    onPrimary: '#ffffff',
    accent: '#22d3ee',
    userBubble: 'linear-gradient(135deg, #6d4dff 0%, #8b5cf6 100%)',
    userBubbleText: '#ffffff',
    assistantBubble: '#151922',
    codeBg: '#0f1218',
    codeHeader: '#1a1f2a',
    inlineCodeBg: 'rgba(124, 92, 255, 0.14)',
    danger: '#f87171',
    dangerSoft: 'rgba(248, 113, 113, 0.12)',
    success: '#34d399',
    successSoft: 'rgba(52, 211, 153, 0.14)',
    warning: '#fbbf24',
    skeleton: '#1b202a',
    skeletonHighlight: '#262c39',
    overlay: 'rgba(5, 6, 10, 0.6)',
    focusRing: 'rgba(124, 92, 255, 0.45)',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.4)',
    md: '0 6px 20px rgba(0,0,0,0.35)',
    lg: '0 18px 50px rgba(0,0,0,0.5)',
  },
};

export const lightTheme: AppTheme = {
  ...shared,
  mode: 'light',
  colors: {
    bg: '#f7f7fb',
    bgElevated: '#ffffff',
    bgSunken: '#eef0f5',
    surface: '#ffffff',
    surfaceHover: '#f1f2f7',
    border: '#e3e5ec',
    borderStrong: '#cfd3de',
    text: '#151823',
    textMuted: '#555c6e',
    textSubtle: '#8a91a3',
    primary: '#6246ea',
    primaryHover: '#5233e0',
    primarySoft: 'rgba(98, 70, 234, 0.10)',
    onPrimary: '#ffffff',
    accent: '#0891b2',
    userBubble: 'linear-gradient(135deg, #6246ea 0%, #7c5cff 100%)',
    userBubbleText: '#ffffff',
    assistantBubble: '#ffffff',
    codeBg: '#fafbfc',
    codeHeader: '#f0f2f6',
    inlineCodeBg: 'rgba(98, 70, 234, 0.08)',
    danger: '#dc2626',
    dangerSoft: 'rgba(220, 38, 38, 0.08)',
    success: '#059669',
    successSoft: 'rgba(5, 150, 105, 0.10)',
    warning: '#d97706',
    skeleton: '#e9ebf1',
    skeletonHighlight: '#f5f6fa',
    overlay: 'rgba(15, 18, 30, 0.35)',
    focusRing: 'rgba(98, 70, 234, 0.35)',
  },
  shadows: {
    sm: '0 1px 2px rgba(20, 24, 40, 0.06)',
    md: '0 6px 20px rgba(20, 24, 40, 0.08)',
    lg: '0 18px 50px rgba(20, 24, 40, 0.14)',
  },
};

export const themes: Record<ThemeMode, AppTheme> = { dark: darkTheme, light: lightTheme };

/** Media-query helper: ${media.mobile} { ... } */
export const media = {
  mobile: `@media (max-width: ${shared.breakpoints.mobile})`,
} as const;
