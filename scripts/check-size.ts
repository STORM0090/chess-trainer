// Checks the built site in `dist` against the size budget of docs/PLAN.md. Run after
// `npm run build`; CI fails when a number is over its budget.
//
// What is measured:
//   precache: every file the service worker installs for offline use (the same patterns as
//     `workbox.globPatterns` in vite.config.ts, without the engine);
//   largest script: the biggest .js file, gzipped;
//   start-up scripts: the entry script and everything it imports statically, gzipped.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const KIB = 1024;

/** Budgets. Change a number only together with a note in docs/DECISIONS.md. */
const BUDGET = {
  precacheKiB: 1200,
  largestScriptGzipKB: 130,
  startupGzipKB: 130,
};

const PRECACHED = /\.(js|css|html|svg|png|webmanifest|txt)$/;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const gzipKB = (file: string) => gzipSync(readFileSync(file)).length / 1000;

const files = walk(DIST).map((file) => relative(DIST, file).replaceAll('\\', '/'));
const precached = files.filter(
  // The service worker and its runtime are not part of their own cache list.
  (file) => PRECACHED.test(file) && !file.startsWith('engine/') && file !== 'sw.js' && !/^workbox-.*\.js$/.test(file),
);
const precacheKiB = precached.reduce((sum, file) => sum + statSync(join(DIST, file)).size, 0) / KIB;

const scripts = files.filter((file) => file.endsWith('.js') && !file.startsWith('engine/'));
const largest = scripts
  .map((file) => ({ file, size: gzipKB(join(DIST, file)) }))
  .sort((a, b) => b.size - a.size)[0];

/** The entry script from index.html and, transitively, its static imports. */
function startupScripts(): string[] {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const entry = /<script[^>]+type="module"[^>]+src="([^"]+)"/.exec(html)?.[1];
  if (!entry) throw new Error('No entry script in dist/index.html');
  const start = `assets/${entry.split('/assets/').pop() ?? ''}`;
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    const code = readFileSync(join(DIST, file), 'utf8');
    // Static imports only: `import ... from "./x.js"` and bare `import "./x.js"`.
    for (const match of code.matchAll(/(?:^|[;\n}])\s*import\s*(?:[^"'()]*?\sfrom\s*)?["']\.\/([^"']+\.js)["']/g)) {
      queue.push(`assets/${match[1]}`);
    }
  }
  return [...seen];
}

const startup = startupScripts();
const startupGzipKB = startup.reduce((sum, file) => sum + gzipKB(join(DIST, file)), 0);

const rows: [string, number, number, string][] = [
  ['precache', precacheKiB, BUDGET.precacheKiB, 'KiB'],
  [`largest script, gzipped (${largest?.file ?? 'none'})`, largest?.size ?? 0, BUDGET.largestScriptGzipKB, 'kB'],
  [`start-up scripts, gzipped (${startup.length} files)`, startupGzipKB, BUDGET.startupGzipKB, 'kB'],
];
let failed = false;
for (const [name, value, budget, unit] of rows) {
  const over = value > budget;
  failed ||= over;
  console.log(`${over ? 'OVER' : 'ok  '} ${name}: ${value.toFixed(1)} ${unit} of ${budget} ${unit}`);
}
if (failed) {
  console.error('check-size: over budget. See "Size budget" in docs/PLAN.md.');
  process.exit(1);
}
