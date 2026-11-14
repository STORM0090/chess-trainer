// Turns a puzzle (a position and moves in UCI notation) into the same compiled line that
// traps use, so the drill, the judge and the hint ladder work for both.

import { Chess, type Square } from 'chess.js';
import type { PuzzleEntry } from '../../shared/puzzle-types.ts';
import type { Side } from '../../shared/movetext.ts';
import type { PromotionPiece } from './chess-helpers';
import type { CompiledLine, Exercise, MoveKind, Step } from './trap-model';

export interface CompiledPuzzle extends Exercise {
  entry: PuzzleEntry;
  /** The only line: the opponent's move first, then the player and the opponent in turn. */
  line: CompiledLine;
}

/** Throws when a move is illegal. The puzzle file is replayed by the build script and a test. */
export function compilePuzzle(entry: PuzzleEntry): CompiledPuzzle {
  const chess = new Chess(entry.fen);
  // The side to move in the position makes the opponent's first move.
  const side: Side = chess.turn() === 'w' ? 'black' : 'white';
  const steps: Step[] = entry.moves.split(' ').map((uci, index) => {
    const fenBefore = chess.fen();
    const mover: Side = chess.turn() === 'w' ? 'white' : 'black';
    const moveNumber = chess.moveNumber();
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
    const kind: MoveKind = chess.isCheckmate()
      ? 'mate'
      : chess.isCheck()
        ? 'check'
        : move.captured
          ? 'capture'
          : 'quiet';
    return {
      ply: index,
      moveNumber,
      san: move.san,
      mark: undefined,
      mover,
      from: move.from as Square,
      to: move.to as Square,
      promotion: move.promotion as PromotionPiece | undefined,
      fenBefore,
      fenAfter: chess.fen(),
      kind,
    };
  });
  const line: CompiledLine = {
    index: 0,
    startFen: entry.fen,
    tag: 'trap',
    main: true,
    expect: 'win',
    steps,
    result: undefined,
    explanation: undefined,
  };
  return { entry, side, lines: [line], line };
}
