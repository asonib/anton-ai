import type { ThemeColors, ThemeShadows } from './theme';

/**
 * Colour palettes. The operator picks ONE palette via `VITE_THEME_PALETTE`
 * (see `src/config/env.ts`); users can only switch between its dark and light variants.
 *
 * Adding a palette: add an entry to `PALETTES` with BOTH `dark` and `light` variants
 * (every `ThemeColors` key is required), then document the id in `frontend/.env.example`.
 */
export interface PaletteVariant {
  colors: ThemeColors;
  shadows: ThemeShadows;
}

export interface Palette {
  id: string;
  label: string;
  dark: PaletteVariant;
  light: PaletteVariant;
}

/* ------------------------------------------------------------------ */
/*  JARVIS — holographic HUD (obsidian + cyan, arc-reactor gold)       */
/* ------------------------------------------------------------------ */
const jarvis: Palette = {
  id: 'jarvis',
  label: 'Jarvis HUD',
  dark: {
    colors: {
      bg: '#050B14', // Obsidian
      bgElevated: '#0A1118', // Dark slate
      bgSunken: '#03070D',
      surface: '#0D1926', // Dark metallic navy
      surfaceHover: '#132538',
      panel: 'rgba(13, 25, 38, 0.7)', // HUD container overlay
      border: '#16293B',
      borderStrong: '#1F3A52',
      text: '#E0F7FA', // Ice white
      textMuted: '#9FB7C0',
      textSubtle: '#78909C', // Muted metadata
      primary: '#00F0FF', // Holographic cyan
      primaryHover: '#00A8FF', // Electric blue
      primarySoft: 'rgba(0, 240, 255, 0.12)',
      onPrimary: '#050B14',
      primaryGradient: 'linear-gradient(135deg, #00F0FF 0%, #00A8FF 50%, #0077FF 100%)',
      accent: '#FFB800', // Arc-reactor gold
      userBubble: 'linear-gradient(135deg, #00A8FF 0%, #00F0FF 100%)',
      userBubbleText: '#050B14',
      assistantBubble: 'rgba(13, 25, 38, 0.7)',
      codeBg: '#03070D',
      codeHeader: '#0D1926',
      inlineCodeBg: 'rgba(0, 240, 255, 0.10)',
      danger: '#FF4D6A',
      dangerSoft: 'rgba(255, 77, 106, 0.12)',
      success: '#2EE6A6',
      successSoft: 'rgba(46, 230, 166, 0.12)',
      warning: '#FF5500', // Arc-reactor warm orange
      skeleton: '#0D1926',
      skeletonHighlight: '#16293B',
      overlay: 'rgba(2, 5, 10, 0.7)',
      focusRing: 'rgba(0, 240, 255, 0.5)',
      glow: 'rgba(0, 240, 255, 0.35)',
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
      md: '0 6px 20px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 240, 255, 0.06)',
      lg: '0 18px 50px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 240, 255, 0.08)',
      glow: '0 0 12px rgba(0, 240, 255, 0.45)',
    },
  },
  light: {
    colors: {
      bg: '#EAF4F8',
      bgElevated: '#F7FBFD',
      bgSunken: '#DCEBF2',
      surface: '#FFFFFF',
      surfaceHover: '#E3F1F7',
      panel: 'rgba(247, 251, 253, 0.82)',
      border: '#C9DFE8',
      borderStrong: '#A9C8D6',
      text: '#0A1118',
      textMuted: '#37505E',
      textSubtle: '#607D8B',
      primary: '#0088CC', // Electric blue, darkened for contrast on light surfaces
      primaryHover: '#006FA6',
      primarySoft: 'rgba(0, 168, 255, 0.12)',
      onPrimary: '#FFFFFF',
      primaryGradient: 'linear-gradient(135deg, #0096D6 0%, #0077B8 50%, #005A8C 100%)',
      accent: '#E08A00', // Gold, darkened for light surfaces
      userBubble: 'linear-gradient(135deg, #0088CC 0%, #00A8FF 100%)',
      userBubbleText: '#FFFFFF',
      assistantBubble: '#FFFFFF',
      codeBg: '#F4F9FB',
      codeHeader: '#E3F1F7',
      inlineCodeBg: 'rgba(0, 136, 204, 0.10)',
      danger: '#D6264A',
      dangerSoft: 'rgba(214, 38, 74, 0.08)',
      success: '#00996B',
      successSoft: 'rgba(0, 153, 107, 0.10)',
      warning: '#D94800',
      skeleton: '#DCEBF2',
      skeletonHighlight: '#EEF6FA',
      overlay: 'rgba(10, 17, 24, 0.35)',
      focusRing: 'rgba(0, 168, 255, 0.45)',
      glow: 'rgba(0, 168, 255, 0.25)',
    },
    shadows: {
      sm: '0 1px 2px rgba(10, 40, 60, 0.08)',
      md: '0 6px 20px rgba(10, 40, 60, 0.10)',
      lg: '0 18px 50px rgba(10, 40, 60, 0.16)',
      glow: '0 0 10px rgba(0, 168, 255, 0.3)',
    },
  },
};

/* ------------------------------------------------------------------ */
/*  CLASSIC — the original violet palette                              */
/* ------------------------------------------------------------------ */
const classic: Palette = {
  id: 'classic',
  label: 'Classic Violet',
  dark: {
    colors: {
      bg: '#0d0f14',
      bgElevated: '#13161d',
      bgSunken: '#090b0f',
      surface: '#181c25',
      surfaceHover: '#1f2430',
      panel: '#13161d',
      border: '#252a36',
      borderStrong: '#343b4b',
      text: '#e7e9ee',
      textMuted: '#a1a8b8',
      textSubtle: '#6b7385',
      primary: '#7c5cff',
      primaryHover: '#8f74ff',
      primarySoft: 'rgba(124, 92, 255, 0.16)',
      onPrimary: '#ffffff',
      primaryGradient: 'linear-gradient(135deg, #6d4dff 0%, #8b5cf6 50%, #a855f7 100%)',
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
      glow: 'rgba(124, 92, 255, 0.45)',
    },
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.4)',
      md: '0 6px 20px rgba(0,0,0,0.35)',
      lg: '0 18px 50px rgba(0,0,0,0.5)',
      glow: 'none',
    },
  },
  light: {
    colors: {
      bg: '#f7f7fb',
      bgElevated: '#ffffff',
      bgSunken: '#eef0f5',
      surface: '#ffffff',
      surfaceHover: '#f1f2f7',
      panel: '#ffffff',
      border: '#e3e5ec',
      borderStrong: '#cfd3de',
      text: '#151823',
      textMuted: '#555c6e',
      textSubtle: '#8a91a3',
      primary: '#6246ea',
      primaryHover: '#5233e0',
      primarySoft: 'rgba(98, 70, 234, 0.10)',
      onPrimary: '#ffffff',
      primaryGradient: 'linear-gradient(135deg, #6246ea 0%, #7c5cff 50%, #9333ea 100%)',
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
      glow: 'rgba(98, 70, 234, 0.35)',
    },
    shadows: {
      sm: '0 1px 2px rgba(20, 24, 40, 0.06)',
      md: '0 6px 20px rgba(20, 24, 40, 0.08)',
      lg: '0 18px 50px rgba(20, 24, 40, 0.14)',
      glow: 'none',
    },
  },
};

/* ------------------------------------------------------------------ */
/*  MATRIX — phosphor-green terminal with amber readouts               */
/* ------------------------------------------------------------------ */
const matrix: Palette = {
  id: 'matrix',
  label: 'Matrix Terminal',
  dark: {
    colors: {
      bg: '#020804', // CRT black
      bgElevated: '#06100A',
      bgSunken: '#010402',
      surface: '#0A1A10',
      surfaceHover: '#0F2617',
      panel: 'rgba(10, 26, 16, 0.72)',
      border: '#123020',
      borderStrong: '#1B4A2E',
      text: '#D4FFE0', // Phosphor white-green
      textMuted: '#8FCCA0',
      textSubtle: '#5C8A6A',
      primary: '#00FF66', // Phosphor green
      primaryHover: '#00CC52',
      primarySoft: 'rgba(0, 255, 102, 0.12)',
      onPrimary: '#021006',
      primaryGradient: 'linear-gradient(135deg, #39FF88 0%, #00FF66 50%, #00B347 100%)',
      accent: '#FFB000', // Amber terminal
      userBubble: 'linear-gradient(135deg, #00CC52 0%, #00FF66 100%)',
      userBubbleText: '#021006',
      assistantBubble: 'rgba(10, 26, 16, 0.72)',
      codeBg: '#010402',
      codeHeader: '#0A1A10',
      inlineCodeBg: 'rgba(0, 255, 102, 0.10)',
      danger: '#FF3B5C',
      dangerSoft: 'rgba(255, 59, 92, 0.12)',
      success: '#7CFFB2',
      successSoft: 'rgba(124, 255, 178, 0.12)',
      warning: '#FFB000',
      skeleton: '#0A1A10',
      skeletonHighlight: '#123020',
      overlay: 'rgba(0, 4, 2, 0.7)',
      focusRing: 'rgba(0, 255, 102, 0.45)',
      glow: 'rgba(0, 255, 102, 0.35)',
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
      md: '0 6px 20px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 255, 102, 0.06)',
      lg: '0 18px 50px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 255, 102, 0.08)',
      glow: '0 0 12px rgba(0, 255, 102, 0.45)',
    },
  },
  light: {
    colors: {
      bg: '#EEF7F0', // Terminal paper
      bgElevated: '#F8FCF9',
      bgSunken: '#E0EFE4',
      surface: '#FFFFFF',
      surfaceHover: '#E5F3E9',
      panel: 'rgba(248, 252, 249, 0.85)',
      border: '#C8E0CF',
      borderStrong: '#A3C9AE',
      text: '#06140B',
      textMuted: '#2F5A3D',
      textSubtle: '#5F7F69',
      primary: '#008A3A', // Green, darkened for contrast on light surfaces
      primaryHover: '#006E2E',
      primarySoft: 'rgba(0, 138, 58, 0.10)',
      onPrimary: '#FFFFFF',
      primaryGradient: 'linear-gradient(135deg, #00A346 0%, #008A3A 50%, #006028 100%)',
      accent: '#B37400',
      userBubble: 'linear-gradient(135deg, #008A3A 0%, #00A346 100%)',
      userBubbleText: '#FFFFFF',
      assistantBubble: '#FFFFFF',
      codeBg: '#F3FAF5',
      codeHeader: '#E5F3E9',
      inlineCodeBg: 'rgba(0, 138, 58, 0.08)',
      danger: '#C8193C',
      dangerSoft: 'rgba(200, 25, 60, 0.08)',
      success: '#00873A',
      successSoft: 'rgba(0, 135, 58, 0.10)',
      warning: '#B85C00',
      skeleton: '#E0EFE4',
      skeletonHighlight: '#F0F8F2',
      overlay: 'rgba(6, 20, 11, 0.35)',
      focusRing: 'rgba(0, 138, 58, 0.35)',
      glow: 'rgba(0, 163, 70, 0.25)',
    },
    shadows: {
      sm: '0 1px 2px rgba(6, 40, 20, 0.08)',
      md: '0 6px 20px rgba(6, 40, 20, 0.10)',
      lg: '0 18px 50px rgba(6, 40, 20, 0.16)',
      glow: '0 0 10px rgba(0, 163, 70, 0.28)',
    },
  },
};

/* ------------------------------------------------------------------ */
/*  CYBERPUNK — neon magenta on midnight violet, electric yellow       */
/* ------------------------------------------------------------------ */
const cyberpunk: Palette = {
  id: 'cyberpunk',
  label: 'Neon Cyberpunk',
  dark: {
    colors: {
      bg: '#0B0614', // Midnight violet
      bgElevated: '#120A20',
      bgSunken: '#07030E',
      surface: '#1A0F2E',
      surfaceHover: '#24163F',
      panel: 'rgba(26, 15, 46, 0.72)',
      border: '#2C1A4A',
      borderStrong: '#3F2766',
      text: '#F5E9FF',
      textMuted: '#C3A9DE',
      textSubtle: '#8A72A8',
      primary: '#FF2BD6', // Neon magenta
      primaryHover: '#E000B8',
      primarySoft: 'rgba(255, 43, 214, 0.14)',
      onPrimary: '#0B0614',
      primaryGradient: 'linear-gradient(135deg, #FF2BD6 0%, #FF4FA3 50%, #FF7A59 100%)',
      accent: '#FCEE0A', // Electric yellow
      userBubble: 'linear-gradient(135deg, #FF2BD6 0%, #FF4FA3 100%)',
      userBubbleText: '#0B0614',
      assistantBubble: 'rgba(26, 15, 46, 0.72)',
      codeBg: '#07030E',
      codeHeader: '#1A0F2E',
      inlineCodeBg: 'rgba(255, 43, 214, 0.12)',
      danger: '#FF3355',
      dangerSoft: 'rgba(255, 51, 85, 0.12)',
      success: '#00F5A0',
      successSoft: 'rgba(0, 245, 160, 0.12)',
      warning: '#FF9500',
      skeleton: '#1A0F2E',
      skeletonHighlight: '#2C1A4A',
      overlay: 'rgba(5, 2, 10, 0.7)',
      focusRing: 'rgba(255, 43, 214, 0.45)',
      glow: 'rgba(255, 43, 214, 0.4)',
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
      md: '0 6px 20px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 43, 214, 0.07)',
      lg: '0 18px 50px rgba(0, 0, 0, 0.6), 0 0 28px rgba(255, 43, 214, 0.10)',
      glow: '0 0 14px rgba(255, 43, 214, 0.5)',
    },
  },
  light: {
    colors: {
      bg: '#FBF3FF',
      bgElevated: '#FFFFFF',
      bgSunken: '#F1E3FA',
      surface: '#FFFFFF',
      surfaceHover: '#F5E8FD',
      panel: 'rgba(255, 255, 255, 0.85)',
      border: '#E6D0F2',
      borderStrong: '#D0B0E3',
      text: '#1A0B2E',
      textMuted: '#55407A',
      textSubtle: '#85709F',
      primary: '#C2009B', // Magenta, darkened for contrast on light surfaces
      primaryHover: '#9E007E',
      primarySoft: 'rgba(194, 0, 155, 0.10)',
      onPrimary: '#FFFFFF',
      primaryGradient: 'linear-gradient(135deg, #D4009F 0%, #B0008C 50%, #7A1FD1 100%)',
      accent: '#B39B00', // Yellow, darkened so it reads on white
      userBubble: 'linear-gradient(135deg, #C2009B 0%, #8A2BE2 100%)',
      userBubbleText: '#FFFFFF',
      assistantBubble: '#FFFFFF',
      codeBg: '#FCF7FF',
      codeHeader: '#F5E8FD',
      inlineCodeBg: 'rgba(194, 0, 155, 0.08)',
      danger: '#D0103A',
      dangerSoft: 'rgba(208, 16, 58, 0.08)',
      success: '#00875A',
      successSoft: 'rgba(0, 135, 90, 0.10)',
      warning: '#C25E00',
      skeleton: '#F1E3FA',
      skeletonHighlight: '#FAF2FE',
      overlay: 'rgba(26, 11, 46, 0.35)',
      focusRing: 'rgba(194, 0, 155, 0.35)',
      glow: 'rgba(194, 0, 155, 0.25)',
    },
    shadows: {
      sm: '0 1px 2px rgba(40, 10, 60, 0.07)',
      md: '0 6px 20px rgba(40, 10, 60, 0.10)',
      lg: '0 18px 50px rgba(40, 10, 60, 0.16)',
      glow: '0 0 10px rgba(194, 0, 155, 0.3)',
    },
  },
};

export const PALETTES = { jarvis, classic, matrix, cyberpunk } as const satisfies Record<string, Palette>;

export type PaletteId = keyof typeof PALETTES;
export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];
export const DEFAULT_PALETTE: PaletteId = 'jarvis';

export const isPaletteId = (value: string): value is PaletteId => Object.prototype.hasOwnProperty.call(PALETTES, value);
