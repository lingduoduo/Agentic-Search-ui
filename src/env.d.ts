/// <reference types="vite/client" />
// Vite's client types: import.meta.env and .glob, and asset imports (*.png, *.webp, *.scss, …).

interface ImportMetaEnv {
  /** Enables the dev-only observability Console. Off unless set to "1". */
  readonly VITE_DEBUG_PANELS?: string;
  /** Backend origin for direct cross-origin calls; unset keeps calls same-origin. */
  readonly VITE_API_BASE_URL?: string;
}
