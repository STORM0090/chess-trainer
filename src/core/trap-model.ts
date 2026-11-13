// Turns a trap file (move text per line) into positions the UI can show and check.

import { Chess, DEFAULT_POSITION, type Square } from 'chess.js';
import { parseMovetext, sideOfPly, type MoveMark, type Side } from '../../shared/movetext.ts';
import type { Expect, LineResult, LineTag, TrapFile } from '../../shared/trap-types.ts';
import type { PromotionPiece } from './chess-helpers';

export const START_FEN = DEFAULT_POSITION;

/** How a move looks to the player; the order follows the "checks, captures, threats" scan. */
export type MoveKind = 'mate' | 'check' | 'capture' | 'quiet';

export interface Step {
  /** 0 for White's first move. */
  ply: number;
  san: string;
  mark: MoveMark | undefined;
  mover: Side;
  from: Square;
  to: Square;
  promotion: PromotionPiece | undefined;
  fenBefore: string;
  fenAfter: string;
  kind: MoveKind;
}

export interface CompiledLine {
  /** Position of the line in the trap file. */
  index: number;
  tag: LineTag;
  main: boolean;
  expect: Expect;
  steps: Step[];
  result: LineResult | undefined;
}

export interface CompiledTrap {
  file: TrapFile;
  side: Side;
  lines: CompiledLine[];
  main: CompiledLine;
}

function compileLine(moves: string): Step[] {
  const chess = new Chess();
  return parseMovetext(moves).map((parsed) => {
    const fenBefore = chess.fen();
    // Throws on an illegal move. Trap files are checked by verify, so this cannot happen
    // with committed content.
    const move = chess.move(parsed.san);
    const kind: MoveKind = chess.isCheckmate()
      ? 'mate'
      : chess.isCheck()
        ? 'check'
        : move.captured
          ? 'capture'
          : 'quiet';
    return {
      ply: parsed.ply,
      san: parsed.san,
      mark: parsed.mark,
      mover: sideOfPly(parsed.ply),
      from: move.from,
      to: move.to,
      promotion: move.promotion as PromotionPiece | undefined,
      fenBefore,
      fenAfter: chess.fen(),
      kind,
    };
  });
}

export function compileTrap(file: TrapFile): CompiledTrap {
  const lines: CompiledLine[] = file.lines.map((line, index) => ({
    index,
    tag: line.tag,
    main: line.main === true,
    expect: line.expect,
    steps: compileLine(line.moves),
    result: line.result,
  }));
  const main = lines.find((line) => line.main);
  if (!main) throw new Error(`Trap "${file.id}" has no main line`);
  return { file, side: file.side, lines, main };
}

/** The position after `ply` moves of the line (0 gives the starting position). */
export function fenAtPly(line: CompiledLine, ply: number): string {
  return ply <= 0 ? START_FEN : (line.steps[Math.min(ply, line.steps.length) - 1]?.fenAfter ?? START_FEN);
}

/** Number of moves two lines share from the start. */
export function commonPrefix(a: CompiledLine, b: CompiledLine): number {
  let ply = 0;
  while (ply < a.steps.length && ply < b.steps.length && a.steps[ply]?.san === b.steps[ply]?.san) {
    ply++;
  }
  return ply;
}

/**
 * A FEN without its move counters. Two lines can reach the same position by different move
 * orders; the counters would make them look different.
 */
export function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}
