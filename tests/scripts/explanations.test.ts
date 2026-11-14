import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lineIndexFor, parseBatch } from '../../scripts/lib/explanations.ts';
import type { TrapFile } from '../../shared/trap-types.ts';

const BATCH_DIR = 'docs/explanations';
const batches = readdirSync(BATCH_DIR).filter((name) => /^batch-\d+\.md$/.test(name));

function trapFile(id: string): TrapFile {
  return JSON.parse(readFileSync(`content/traps/${id}.json`, 'utf8')) as TrapFile;
}

describe('parseBatch', () => {
  const sample = [
    '## 1. Название (`some-trap`), вы играете белыми',
    '',
    '| # | Line | Text | Source | Checked |',
    '| --- | --- | --- | --- | --- |',
    '| 1 | Main: 1.e4 e5 2.Qh5 Ke7?? 3.Qxe5# | Текст. | по доске | Checkmate. |',
    '| 2 | 1.e4 e5 2.Qh5 Nc6 | Другой текст. | по доске; по оценке движка | Engine: 0.10. |',
    '',
    '## Review',
    '| 3 | not a row of a trap | x | по доске | x |',
  ].join('\n');

  it('reads the rows of a trap section and nothing else', () => {
    expect(parseBatch(sample)).toEqual([
      {
        trapId: 'some-trap',
        number: 1,
        moves: '1.e4 e5 2.Qh5 Ke7?? 3.Qxe5#',
        explanation: { ru: 'Текст.', sources: ['board'] },
      },
      {
        trapId: 'some-trap',
        number: 2,
        moves: '1.e4 e5 2.Qh5 Nc6',
        explanation: { ru: 'Другой текст.', sources: ['board', 'engine'] },
      },
    ]);
  });

  it('refuses a source mark it does not know', () => {
    expect(() => parseBatch(sample.replace('| по доске |', '| по памяти |'))).toThrow(/unknown source mark/);
  });
});

describe('explanation texts', () => {
  it('has at least the first batch', () => {
    expect(batches).toContain('batch-1.md');
  });

  it.each(batches)('%s is the same text as in the trap files', (name) => {
    const rows = parseBatch(readFileSync(`${BATCH_DIR}/${name}`, 'utf8'));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.map((row) => row.number)).toEqual([...new Set(rows.map((row) => row.number))]);
    for (const row of rows) {
      const trap = trapFile(row.trapId);
      const line = trap.lines[lineIndexFor(trap, row)];
      expect(line, `${name}, row ${row.number}`).toBeDefined();
      // A batch that is not applied yet (or whose commit was reverted) is fine: the app then
      // shows the general sentence. A batch that is applied must match word for word.
      if (trap.lines.every((other) => !other.explanation)) continue;
      expect(line?.explanation, `${name}, row ${row.number}`).toEqual(row.explanation);
    }
  });

  it('covers every line of a trap that has any text, and keeps the texts short', () => {
    for (const file of readdirSync('content/traps')) {
      const trap = JSON.parse(readFileSync(`content/traps/${file}`, 'utf8')) as TrapFile;
      const written = trap.lines.filter((line) => line.explanation);
      if (written.length === 0) continue;
      expect(written.length, trap.id).toBe(trap.lines.length);
      for (const line of written) {
        const text = line.explanation?.ru ?? '';
        expect(text.length, `${trap.id}: ${line.moves}`).toBeGreaterThan(10);
        // One or two sentences for the main line, a phrase for the others: never a paragraph.
        expect(text.length, `${trap.id}: ${line.moves}`).toBeLessThanOrEqual(line.main ? 260 : 240);
        expect(line.explanation?.sources.length || line.explanation?.link, trap.id).toBeTruthy();
      }
    }
  });
});
