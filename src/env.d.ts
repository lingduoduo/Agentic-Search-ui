interface ImportMetaEnv {
  /** Enables the dev-only observability Console. Off unless set to "1". */
  readonly VITE_DEBUG_PANELS?: string;
  /** True in development builds; production builds drop code behind it. */
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
