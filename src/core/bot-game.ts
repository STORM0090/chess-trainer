// A game against the bot: the opening book of a trap, how a game ends, and the short review
// after it. Pure functions; the engine is passed in.

import { Chess } from 'chess.js';
import type { Analyse } from '../../shared/bot/policy.ts';
import type { CompiledTrap } from './trap-model';

/**
 * The bot's next moves from the lines of a trap, when the game so far is the start of one or
 * more lines: one entry per different move, in the order of the lines. Empty when the game
 * has left every line, or no line has a move of the bot here. The lines with the player's
 * mistakes are included: the bot then punishes the mistake as the trap file shows.
 */
export function bookMoves(trap: CompiledTrap, history: string[]): string[] {
  const moves: string[] = [];
  for (const line of trap.lines) {
    if (line.steps.length <= history.length) continue;
    if (!history.every((san, index) => line.steps[index]?.san === san)) continue;
    const next = line.steps[history.length];
    if (next && next.mover !== trap.side && !moves.includes(next.san)) moves.push(next.san);
  }
  return moves;
}

/** Whether the game so far is still inside some line of the trap. */
export function insideTrapLines(trap: CompiledTrap, history: string[]): boolean {
  return trap.lines.some(
    (line) => line.steps.length >= history.length && history.every((san, index) => line.steps[index]?.san === san),
  );
}

export type GameEnd =
  | { kind: 'mate'; winner: 'white' | 'black' }
  | { kind: 'draw'; reason: 'stalemate' | 'repetition' | 'material' | 'fifty' }
  | { kind: 'resign'; winner: 'white' | 'black' };

export function gameEnd(chess: Chess): GameEnd | undefined {
  if (chess.isCheckmate()) return { kind: 'mate', winner: chess.turn() === 'w' ? 'black' : 'white' };
  if (chess.isStalemate()) return { kind: 'draw', reason: 'stalemate' };
  if (chess.isThreefoldRepetition()) return { kind: 'draw', reason: 'repetition' };
  if (chess.isInsufficientMaterial()) return { kind: 'draw', reason: 'material' };
  if (chess.isDraw()) return { kind: 'draw', reason: 'fifty' };
  return undefined;
}

export type GameResult = 'win' | 'draw' | 'loss';

export function resultFor(end: GameEnd, player: 'white' | 'black'): GameResult {
  if (end.kind === 'draw') return 'draw';
  return end.winner === player ? 'win' : 'loss';
}

export interface Mistake {
  /** Index of the move in the game (0 for White's first move). */
  ply: number;
  /** The move that was played, and the engine's choice instead, in SAN. */
  played: string;
  best: string;
  /** What the move gave up, in centipawns, from the player's side (capped for mates). */
  loss: number;
  /** The position before the move. */
  fen: string;
}

/** Losses below this are not worth a word for a beginner. */
export const MISTAKE_CP = 150;
const LOSS_CAP = 2000;

/**
 * The player's biggest mistakes in a game, at most `count`, in the order of the game. Every
 * position before a move of the player is searched once (best move and its score) and the
 * position after it once (the score against the player). Positions where the player was
 * already lost by far are skipped: "you were lost anyway" is not a lesson.
 */
export async function findMistakes(
  moves: string[],
  player: 'white' | 'black',
  analyse: Analyse,
  nodes: number,
  count = 3,
  onProgress?: (done: number, total: number) => void,
): Promise<Mistake[]> {
  const chess = new Chess();
  const own = player === 'white' ? 0 : 1;
  const total = moves.filter((_, ply) => ply % 2 === own).length;
  const found: Mistake[] = [];
  let done = 0;
  for (let ply = 0; ply < moves.length; ply++) {
    const san = moves[ply] ?? '';
    if (ply % 2 !== own) {
      chess.move(san);
      continue;
    }
    const fen = chess.fen();
    const [best] = await analyse(fen, { nodes, multipv: 1 });
    const played = chess.move(san);
    let after = 0;
    if (chess.isCheckmate()) after = LOSS_CAP;
    else if (!chess.isDraw()) {
      const [reply] = await analyse(chess.fen(), { nodes, multipv: 1 });
      after = -(reply?.cp ?? 0);
    }
    done++;
    onProgress?.(done, total);
    if (!best) continue;
    const before = Math.max(-LOSS_CAP, Math.min(LOSS_CAP, best.cp));
    const loss = before - Math.max(-LOSS_CAP, Math.min(LOSS_CAP, after));
    if (loss < MISTAKE_CP || before < -600) continue;
    const board = new Chess(fen);
    let bestSan = best.uci;
    try {
      bestSan = board.move({ from: best.uci.slice(0, 2), to: best.uci.slice(2, 4), promotion: best.uci[4] }).san;
    } catch {
      // The engine's move is always legal; keep the UCI text if chess.js disagrees.
    }
    if (bestSan === played.san) continue;
    found.push({ ply, played: played.san, best: bestSan, loss, fen });
  }
  return found
    .sort((a, b) => b.loss - a.loss)
    .slice(0, count)
    .sort((a, b) => a.ply - b.ply);
}
