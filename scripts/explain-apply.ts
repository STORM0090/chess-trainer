// Copies the reviewed explanation texts from docs/explanations/batch-<n>.md into the trap
// files (field `explanation` of a line). The batch file is the text the owner reviews; the
// trap files are what the app ships. A unit test keeps the two the same.
//
// Usage: node scripts/explain-apply.ts docs/explanations/batch-1.md [more batch files]

import { readFileSync, writeFileSync } from 'node:fs';
import { lineIndexFor, parseBatch } from './lib/explanations.ts';
import { serialiseTrap } from './lib/trap-file.ts';
import type { TrapFile } from '../shared/trap-types.ts';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/explain-apply.ts docs/explanations/batch-<n>.md');
  process.exit(1);
}
for (const file of files) {
  const rows = parseBatch(readFileSync(file, 'utf8'));
  const traps = new Map<string, TrapFile>();
  for (const row of rows) {
    const path = `content/traps/${row.trapId}.json`;
    const trap = traps.get(path) ?? (JSON.parse(readFileSync(path, 'utf8')) as TrapFile);
    traps.set(path, trap);
    const line = trap.lines[lineIndexFor(trap, row)];
    if (!line) throw new Error(`${file}, row ${row.number}: no line "${row.moves}" in ${row.trapId}`);
    line.explanation = row.explanation;
  }
  for (const [path, trap] of traps) {
    const missing = trap.lines.filter((line) => !line.explanation).length;
    if (missing > 0) throw new Error(`${path}: ${missing} line(s) without a text in ${file}`);
    writeFileSync(path, serialiseTrap(trap));
  }
  console.log(`${file}: ${rows.length} texts written into ${traps.size} trap files`);
}
