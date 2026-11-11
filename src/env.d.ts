/** App version from package.json, injected by Vite (see vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Short commit hash, set by CI. Undefined in local builds. */
  readonly VITE_COMMIT?: string;
  /** Branch name, set by CI. Undefined in local builds. */
  readonly VITE_BRANCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
