// The reviewed explanation texts live in docs/explanations/batch-<n>.md as tables. This
// module reads those tables, so the texts in the trap files can be written from them and a
// test can check that the two never drift apart.

import { parseMovetext } from '../../shared/movetext.ts';
import type { ExplanationSource, LineExplanation, TrapFile } from '../../shared/trap-types.ts';

export interface BatchRow {
  trapId: string;
  /** Number in the first column of the table. */
  number: number;
  /** Move text of the line, as in the trap file (marks included). */
  moves: string;
  explanation: LineExplanation;
}

const SECTION = /^## .*\(`([a-z0-9-]+)`\)/;
const SOURCE_WORDS: Record<string, ExplanationSource> = {
  'по доске': 'board',
  'по оценке движка': 'engine',
};

/** Reads every table row of a batch file. Throws on a row it cannot understand. */
export function parseBatch(markdown: string): BatchRow[] {
  const rows: BatchRow[] = [];
  let trapId: string | undefined;
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const section = SECTION.exec(line)?.[1];
    if (section) {
      trapId = section;
      continue;
    }
    if (line.startsWith('## ')) trapId = undefined;
    if (!trapId || !line.startsWith('|')) continue;
    const cells = line
      .slice(1, line.lastIndexOf('|'))
      .split('|')
      .map((cell) => cell.trim());
    const number = Number(cells[0]);
    // The header row and the rule under it have no number.
    if (!Number.isInteger(number) || number <= 0) continue;
    const [, lineCell, text, sourceCell] = cells;
    if (!lineCell || !text || !sourceCell) throw new Error(`Row ${number}: an empty cell`);
    const sources: ExplanationSource[] = [];
    let link: string | undefined;
    for (const part of sourceCell.split(';').map((item) => item.trim())) {
      const source = SOURCE_WORDS[part];
      if (source) sources.push(source);
      else if (/^https:\/\/\S+$/.test(part)) link = part;
      else throw new Error(`Row ${number}: unknown source mark "${part}"`);
    }
    if (sources.length === 0 && !link) throw new Error(`Row ${number}: no source mark`);
    rows.push({
      trapId,
      number,
      moves: lineCell.replace(/^Main:\s*/, ''),
      explanation: { ru: text, sources, ...(link ? { link } : {}) },
    });
  }
  return rows;
}

function sanKey(moves: string): string {
  return parseMovetext(moves)
    .map((move) => move.san)
    .join(' ');
}

/** Index of the line of `trap` that a row describes, by its moves; -1 when there is none. */
export function lineIndexFor(trap: TrapFile, row: BatchRow): number {
  const key = sanKey(row.moves);
  return trap.lines.findIndex((line) => sanKey(line.moves) === key);
}
