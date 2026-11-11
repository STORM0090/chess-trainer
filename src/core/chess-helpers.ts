import type { Chess, Square } from 'chess.js';

export type Color = 'white' | 'black';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

/** Legal destinations per origin square, in the shape the board component expects. */
export type Dests = Map<Square, Square[]>;

export function legalDests(chess: Chess): Dests {
  const dests: Dests = new Map();
  for (const move of chess.moves({ verbose: true })) {
    const targets = dests.get(move.from);
    if (!targets) dests.set(move.from, [move.to]);
    else if (!targets.includes(move.to)) targets.push(move.to);
  }
  return dests;
}

/** True when moving from `from` to `to` is a legal pawn promotion (the UI must ask for a piece). */
export function isPromotionMove(chess: Chess, from: Square, to: Square): boolean {
  return chess
    .moves({ verbose: true, square: from })
    .some((move) => move.to === to && move.promotion !== undefined);
}

export function turnColor(chess: Chess): Color {
  return chess.turn() === 'w' ? 'white' : 'black';
}

export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

export function gameStatus(chess: Chess): GameStatus {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isDraw()) return 'draw';
  if (chess.isCheck()) return 'check';
  return 'playing';
}

/** The last move as a [from, to] pair, for highlighting. */
export function lastMoveSquares(chess: Chess): [Square, Square] | undefined {
  const last = chess.history({ verbose: true }).at(-1);
  return last ? [last.from, last.to] : undefined;
}
