// Exercises from the player's own games. A PGN text is read on the device, the engine looks
// at the player's moves, and positions where one move was clearly best and the player chose
// another become exercises. Pure functions; the engine is passed in.
//
// Privacy: nothing about a game is kept except positions and moves. No names, no dates, no
// links: the names in the PGN are used only on the import screen, to ask which side the
// player had, and are gone when the screen is closed.

import { Chess } from 'chess.js';
import type { PuzzleEntry } from '../../shared/puzzle-types.ts';
import type { Analyse } from '../../shared/bot/policy.ts';

/** An exercise made from a game of the player. It is solved like a puzzle. */
export interface OwnExercise {
  /** "own" and eight hex digits: a hash of the position and the best move. */
  id: string;
  /** The position before the opponent's last move, so the exercise starts with that move. */
  fen: string;
  /** Two moves in UCI notation: the opponent's move, then the best move. */
  moves: string;
  /** What the player played in the game, in SAN, to show after the exercise. */
  played: string;
  /** Centipawns the played move gave up against the best one (capped). */
  loss: number;
  addedAt: number;
}

export interface ReadGame {
  white: string;
  black: string;
  /** Moves in SAN. */
  moves: string[];
}

/** Splits a text with several PGN games into single games. */
export function splitPgn(text: string): string[] {
  const clean = text.replace(/\r\n?/g, '\n').trim();
  if (clean === '') return [];
  // A new game starts at a tag line that follows a blank line (or at the very beginning).
  const parts = clean.split(/\n\s*\n(?=\[)/);
  const games: string[] = [];
  for (const part of parts) {
    const last = games.at(-1);
    // A tag block without moves belongs to the move text that follows it.
    if (last !== undefined && /^\[[^\]]*\]\s*$/m.test(last) && !/\n\s*\n/.test(last) && !part.startsWith('[')) {
      games[games.length - 1] = `${last}\n\n${part}`;
    } else games.push(part);
  }
  return games.filter((game) => game.trim() !== '');
}

/**
 * Reads one game. Returns `undefined` for anything that is not a standard game from the
 * usual starting position (variants, set-up positions, broken move text, no moves).
 */
export function readGame(pgn: string): ReadGame | undefined {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return undefined;
  }
  const headers = chess.getHeaders();
  if (headers.FEN !== undefined || headers.SetUp === '1') return undefined;
  if (headers.Variant !== undefined && !/^standard$/i.test(headers.Variant)) return undefined;
  const moves = chess.history();
  if (moves.length < 2) return undefined;
  return { white: headers.White ?? '?', black: headers.Black ?? '?', moves };
}

/** Names that take part in every game: the player is one of them (usually the only one). */
export function commonPlayers(games: ReadGame[]): string[] {
  const first = games[0];
  if (!first) return [];
  return [...new Set([first.white, first.black])].filter(
    (name) => name !== '?' && games.every((game) => game.white === name || game.black === name),
  );
}

/** FNV-1a, as eight hex digits. */
function hash(text: string): string {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value.toString(16).padStart(8, '0');
}

export interface MiningRules {
  /** Engine nodes per search. */
  nodes: number;
  /** The played move must give up at least this much. */
  minLoss: number;
  /** The best move must be better than the second best by at least this much. */
  minGap: number;
  /** Positions where the player is already lost by more than this are skipped. */
  lostBelow: number;
  /** Positions where even the second-best move wins by more than this are skipped. */
  wonAbove: number;
}

export const MINING_RULES: MiningRules = { nodes: 30_000, minLoss: 150, minGap: 120, lostBelow: -300, wonAbove: 500 };
const CAP = 2000;
const cap = (cp: number) => Math.max(-CAP, Math.min(CAP, cp));

/**
 * The positions of one game worth an exercise: the player's move gave up at least
 * `minLoss`, one move was clearly best, and the game was neither lost already nor won by
 * any reasonable move. The first move of a game is never an exercise (it has no opponent
 * move before it).
 */
export async function mineGame(
  moves: string[],
  player: 'white' | 'black',
  analyse: Analyse,
  now: number,
  rules: MiningRules = MINING_RULES,
  onProgress?: (done: number, total: number) => void,
  isAlive: () => boolean = () => true,
): Promise<OwnExercise[]> {
  const chess = new Chess();
  const own = player === 'white' ? 0 : 1;
  const total = moves.filter((_, ply) => ply % 2 === own && ply > 0).length;
  const found: OwnExercise[] = [];
  let done = 0;
  let previousFen = chess.fen();
  let previousUci = '';
  for (let ply = 0; ply < moves.length; ply++) {
    const san = moves[ply] ?? '';
    if (ply % 2 !== own || ply === 0) {
      previousFen = chess.fen();
      const move = chess.move(san);
      previousUci = `${move.from}${move.to}${move.promotion ?? ''}`;
      continue;
    }
    if (!isAlive()) throw new Error('The analysis was stopped');
    const fen = chess.fen();
    const [best, second] = await analyse(fen, { nodes: rules.nodes, multipv: 2 });
    const played = chess.move(san);
    const playedUci = `${played.from}${played.to}${played.promotion ?? ''}`;
    done++;
    onProgress?.(done, total);
    if (!best || best.uci === playedUci) continue;
    const bestCp = cap(best.cp);
    // With one legal move there is no second line, and nothing to learn either.
    if (!second) continue;
    if (bestCp < rules.lostBelow || cap(second.cp) > rules.wonAbove) continue;
    if (bestCp - cap(second.cp) < rules.minGap) continue;
    let after = CAP;
    if (!chess.isCheckmate()) {
      if (chess.isDraw() || chess.isStalemate()) after = 0;
      else {
        if (!isAlive()) throw new Error('The analysis was stopped');
        const [reply] = await analyse(chess.fen(), { nodes: rules.nodes, multipv: 1 });
        after = -cap(reply?.cp ?? 0);
      }
    }
    const loss = bestCp - after;
    if (loss < rules.minLoss) continue;
    found.push({
      id: `own${hash(`${fen.split(' ').slice(0, 4).join(' ')}|${best.uci}`)}`,
      fen: previousFen,
      moves: `${previousUci} ${best.uci}`,
      played: played.san,
      loss,
      addedAt: now,
    });
  }
  return found;
}

/** The exercise in the shape the puzzle drill takes. It belongs to no theme and has no rating. */
export function ownEntry(exercise: OwnExercise): PuzzleEntry {
  return { id: exercise.id, fen: exercise.fen, moves: exercise.moves, rating: 0, themes: [] };
}

export function isOwnId(id: string): boolean {
  return /^own[0-9a-f]{8}$/.test(id);
}

/** Checks a stored or imported exercise by playing it: a legal position and two legal moves. */
export function isValidExercise(value: OwnExercise): boolean {
  if (!isOwnId(value.id)) return false;
  const moves = value.moves.split(' ');
  if (moves.length !== 2) return false;
  try {
    const chess = new Chess(value.fen);
    for (const uci of moves) {
      if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return false;
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    }
    return true;
  } catch {
    return false;
  }
}
