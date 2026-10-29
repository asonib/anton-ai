/**
 * The only place in the frontend that reads `import.meta.env`.
 * Values are baked in at build time by Vite (restart `npm run dev` after editing `frontend/.env`).
 */
import { DEFAULT_PALETTE, isPaletteId, PALETTE_IDS, type PaletteId } from '../styles/palettes';

const resolvePalette = (raw: string | undefined): PaletteId => {
  const value = raw?.trim().toLowerCase();
  if (!value) return DEFAULT_PALETTE;
  if (isPaletteId(value)) return value;
  console.warn(
    `[Anton AI] Unknown VITE_THEME_PALETTE "${raw}". Expected one of: ${PALETTE_IDS.join(', ')}. Falling back to "${DEFAULT_PALETTE}".`,
  );
  return DEFAULT_PALETTE;
};

export const appEnv = {
  appName: 'Anton AI',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  /** Brand mark shown in the sidebar (served from `frontend/public/`, same file as the favicon). */
  logoUrl: `${import.meta.env.BASE_URL}favicon.svg`,
  /** Colour palette chosen by the operator. Users can only switch dark/light within it. */
  themePalette: resolvePalette(import.meta.env.VITE_THEME_PALETTE),
} as const;
