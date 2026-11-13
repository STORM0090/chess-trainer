// Learn mode logic: which lines are practised, in what order, and how a move is judged.
// Pure functions, no UI.

import { Chess, type Square } from 'chess.js';
import type { LineResult, LineTag } from '../../shared/trap-types.ts';
import type { PromotionPiece } from './chess-helpers';
import {
  commonPrefix,
  positionKey,
  type CompiledLine,
  type CompiledTrap,
  type Step,
} from './trap-model';

/** Lines in which the player's moves are correct. `mistake` lines are shown, not practised. */
const PRACTICE_ORDER: LineTag[] = ['trap', 'decline', 'hold', 'punish', 'sound'];

export interface LearnItem {
  line: CompiledLine;
  /** The first ply that was not already played in an earlier item. Practice starts here. */
  startPly: number;
  /** Player moves from `startPly` to the end of the line. */
  playerMoves: number;
}

/**
 * The practice queue: the main line from move 1, then every other line from the point where
 * it leaves the lines before it. Lines that end with the opponent's move (nothing left for
 * the player to do) are skipped; View mode still shows them.
 */
export function learnQueue(trap: CompiledTrap): LearnItem[] {
  const others = trap.lines
    .filter((line) => !line.main && PRACTICE_ORDER.includes(line.tag))
    .sort(
      (a, b) => PRACTICE_ORDER.indexOf(a.tag) - PRACTICE_ORDER.indexOf(b.tag) || a.index - b.index,
    );
  const queue: LearnItem[] = [];
  for (const line of [trap.main, ...others]) {
    const startPly = Math.max(0, ...queue.map((item) => commonPrefix(item.line, line)));
    const playerMoves = line.steps.filter(
      (step) => step.ply >= startPly && step.mover === trap.side,
    ).length;
    if (playerMoves > 0) queue.push({ line, startPly, playerMoves });
  }
  return queue;
}

export interface KnownMistake {
  /** The player's bad move. */
  step: Step;
  /** The opponent's answer from the trap file, if the line goes on. */
  reply: Step | undefined;
  result: LineResult | undefined;
}

/** The player's errors that the trap file describes (lines tagged `mistake`). */
export function knownMistakes(trap: CompiledTrap): KnownMistake[] {
  const mistakes: KnownMistake[] = [];
  for (const line of trap.lines) {
    if (line.tag !== 'mistake') continue;
    const step = line.steps.find(
      (candidate) =>
        candidate.mover === trap.side && (candidate.mark === '?' || candidate.mark === '??'),
    );
    if (step) mistakes.push({ step, reply: line.steps[step.ply + 1], result: line.result });
  }
  return mistakes;
}

export interface PlayerMove {
  from: Square;
  to: Square;
  promotion: PromotionPiece | undefined;
}

function sameMove(step: Step, move: PlayerMove): boolean {
  return step.from === move.from && step.to === move.to && step.promotion === move.promotion;
}

export type Verdict =
  /** The move of the line. */
  | { kind: 'correct' }
  /** Not the move of the line, but it is checkmate, so it is accepted. */
  | { kind: 'otherMate'; fen: string; san: string }
  /** A mistake the trap file describes. */
  | { kind: 'knownMistake'; mistake: KnownMistake }
  /** A good move that belongs to another line of the same trap. */
  | { kind: 'otherLine' }
  | { kind: 'wrong' };

/** Judges the player's move in the position before `line.steps[ply]`. */
export function judgeMove(
  trap: CompiledTrap,
  line: CompiledLine,
  ply: number,
  move: PlayerMove,
): Verdict {
  const expected = line.steps[ply];
  if (!expected) return { kind: 'wrong' };
  if (sameMove(expected, move)) return { kind: 'correct' };

  const chess = new Chess(expected.fenBefore);
  try {
    const played = chess.move(move);
    if (chess.isCheckmate()) return { kind: 'otherMate', fen: chess.fen(), san: played.san };
  } catch {
    return { kind: 'wrong' };
  }

  const here = positionKey(expected.fenBefore);
  const mistake = knownMistakes(trap).find(
    (known) => positionKey(known.step.fenBefore) === here && sameMove(known.step, move),
  );
  if (mistake) return { kind: 'knownMistake', mistake };

  const inOtherLine = trap.lines.some(
    (other) =>
      other !== line &&
      PRACTICE_ORDER.includes(other.tag) &&
      other.steps.some(
        (step) =>
          step.mover === trap.side && positionKey(step.fenBefore) === here && sameMove(step, move),
      ),
  );
  return inOtherLine ? { kind: 'otherLine' } : { kind: 'wrong' };
}

/**
 * Hint ladder. 0: nothing. 1: which kind of move to look for (checks, captures, threats).
 * 2: the piece to move is marked. 3: the move is drawn as an arrow.
 */
export type HintLevel = 0 | 1 | 2 | 3;

export const MAX_HINT_LEVEL: HintLevel = 3;

/** The hint level the player has earned by making `errors` wrong moves in one position. */
export function hintLevelForErrors(errors: number): HintLevel {
  return Math.min(Math.max(errors, 0), MAX_HINT_LEVEL) as HintLevel;
}
