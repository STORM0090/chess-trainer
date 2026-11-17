/** App version from package.json, injected by Vite (see vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Short commit hash, set by CI. Undefined in local builds. */
  readonly VITE_COMMIT?: string;
  /** Branch name, set by CI. Undefined in local builds. */
  readonly VITE_BRANCH?: string;
  /** "1" in local test builds: the test clock exists outside the previews too. */
  readonly VITE_TEST_CLOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
