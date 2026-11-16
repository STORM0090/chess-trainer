// Writes public/licenses.txt: the full license texts of everything the app ships, taken from
// the installed packages themselves. Runs before every build (and before `dev`); the file is
// git-ignored and shown on the "Лицензии" screen.
//
// What ships: the runtime dependencies in package.json and everything they pull in, the
// Stockfish engine files (copied from the dev dependency `stockfish`), the parts of Workbox
// that go into the service worker, and, in the APK only, AndroidX libraries (Apache-2.0),
// whose text is taken from a package that carries the Apache license.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'licenses.txt');

interface PackageJson {
  name: string;
  version: string;
  license?: string;
  dependencies?: Record<string, string>;
  author?: string | { name?: string };
}

function readPackage(name: string): PackageJson | undefined {
  const path = join(ROOT, 'node_modules', name, 'package.json');
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as PackageJson) : undefined;
}

function licenseText(name: string): string | undefined {
  const dir = join(ROOT, 'node_modules', name);
  const file = readdirSync(dir).find((entry) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(entry));
  return file ? readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n').trim() : undefined;
}

/** Runtime dependencies and what they pull in, in a stable order. */
function runtimePackages(): string[] {
  const root = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as PackageJson;
  const seen = new Set<string>();
  const visit = (name: string) => {
    if (seen.has(name)) return;
    const pkg = readPackage(name);
    if (!pkg) return;
    seen.add(name);
    for (const dependency of Object.keys(pkg.dependencies ?? {})) visit(dependency);
  };
  for (const name of Object.keys(root.dependencies ?? {})) visit(name);
  // Shipped although they are build tools: the engine and the service worker runtime.
  for (const name of ['stockfish', 'workbox-window', 'workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies']) {
    visit(name);
  }
  return [...seen].sort();
}

const project = readFileSync(join(ROOT, 'LICENSE'), 'utf8').replace(/\r\n/g, '\n').trim();
const sections: string[] = [
  'Chess Trainer is free software: GNU General Public License, version 3 or later.',
  'Source code: https://github.com/STORM0090/chess-trainer',
  '',
  'Parts of the app and their licenses. Full texts follow; a text that is the same as an',
  'earlier one is not repeated.',
  '',
];
const texts: { text: string; owner: string }[] = [{ text: project, owner: 'Chess Trainer' }];
const entries: string[] = [];
for (const name of runtimePackages()) {
  const pkg = readPackage(name);
  if (!pkg) continue;
  const text = licenseText(name);
  const header = `${pkg.name} ${pkg.version} (${pkg.license ?? 'see text'})`;
  if (!text) {
    entries.push(`== ${header}\nNo license file in the package; the license field says ${pkg.license ?? 'nothing'}.`);
    continue;
  }
  const same = texts.find((known) => known.text === text);
  if (same) entries.push(`== ${header}\nSame text as ${same.owner}.`);
  else {
    texts.push({ text, owner: pkg.name });
    entries.push(`== ${header}\n\n${text}`);
  }
}
sections.push(
  '== Piece set "cburnett" by Colin M.L. Burnett (GPLv2 or later), shipped inside chessground.',
  '   See https://github.com/lichess-org/lila/blob/master/COPYING.md',
  '',
);
const apache = existsSync(join(ROOT, 'node_modules', '@playwright', 'test')) ? licenseText('@playwright/test') : undefined;
sections.push(
  '== AndroidX libraries (in the Android app only): Apache License 2.0.',
  apache ? `\n${apache}\n` : '   https://www.apache.org/licenses/LICENSE-2.0\n',
);
const output = [
  ...sections,
  ...entries.map((entry) => `${entry}\n`),
  '== Chess Trainer: GNU General Public License, version 3',
  '',
  project,
  '',
].join('\n');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, output);
console.log(`licenses: ${entries.length} packages, ${texts.length} different texts, ${Math.round(output.length / 1024)} KiB`);
