// Copies the Stockfish lite single-threaded build from node_modules into public/engine/.
// The npm package contains every engine flavour (about 205 MB); the app ships only these two files.
// public/engine/ is git-ignored, so this runs before `dev` and `build`.

import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'node_modules', 'stockfish', 'bin');
const targetDir = join(root, 'public', 'engine');

// Keep in sync with ENGINE_SCRIPT in src/engine/engine-files.ts.
const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'];

mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  const source = join(sourceDir, file);
  if (!existsSync(source)) {
    console.error(`copy-engine: missing ${source}. Run "npm ci" first.`);
    process.exit(1);
  }
  const target = join(targetDir, file);
  const upToDate = existsSync(target) && statSync(target).size === statSync(source).size;
  if (!upToDate) copyFileSync(source, target);
  const sizeKb = Math.round(statSync(target).size / 1024);
  console.log(`copy-engine: ${file} (${sizeKb} KB)${upToDate ? ' up to date' : ' copied'}`);
}
