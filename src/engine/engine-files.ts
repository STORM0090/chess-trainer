// Keep in sync with the file list in scripts/copy-engine.mjs.
const ENGINE_SCRIPT = 'stockfish-19-lite-single.js';

/** URL of the engine worker script. The matching .wasm file sits next to it. */
export function engineScriptUrl(): string {
  return `${import.meta.env.BASE_URL}engine/${ENGINE_SCRIPT}`;
}
