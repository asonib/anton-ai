/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Colour palette: `jarvis` (default) | `classic` | `matrix` | `cyberpunk`. Users cannot change it at runtime. */
  readonly VITE_THEME_PALETTE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
