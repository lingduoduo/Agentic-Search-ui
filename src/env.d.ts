interface ImportMetaEnv {
  /** Enables the dev-only observability Console. Off unless set to "1". */
  readonly VITE_DEBUG_PANELS?: string;
  /** Backend origin for direct cross-origin calls; unset keeps calls same-origin. */
  readonly VITE_API_BASE_URL?: string;
  /** True in development builds; production builds drop code behind it. */
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
