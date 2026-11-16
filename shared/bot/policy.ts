// How the bot chooses a move. Pure code: the engine is passed in as a function, so the same
// policy runs in the app (engine in a Web Worker) and in the calibration script (engine in
// Node), and a test can feed it fixed candidates.
//
// The engine at full strength is far too strong for a beginner even with a tiny search, and
// its own limiter (UCI_Elo) does not go below 1320. So the weakness is ours, and it is
// modelled on how beginners actually lose games, not on random moves:
//
//   "tunnel" move: the bot looks only at its own idea. It takes what can be taken, gives a
//     check when there is one, otherwise makes a natural move (development, castling, a
//     centre pawn). It does not ask what the opponent threatens, and often does not even
//     ask whether the square it goes to is attacked. This is where hung pieces, captured
//     defended pawns and missed threats come from.
//   "careful" move: the bot compares the engine's best moves and usually plays a good one,
//     with a preference that gets sharper as the level goes up.
//
// A level is a point on one scale, `strength` from 0 to 1, which sets how often the bot has
// tunnel vision, how often it at least checks the square it moves to, how sharply it tells
// good moves from bad ones, and how many nodes the engine may search.

import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';

/** A move the engine suggests, with its score for the side to move in centipawns. */
export interface Candidate {
  /** UCI notation: "e2e4", "e7e8q". */
  uci: string;
  cp: number;
}

export interface AnalyseOptions {
  nodes: number;
  multipv: number;
}

/** Asks the engine for its best moves in a position, best first. */
export type Analyse = (fen: string, options: AnalyseOptions) => Promise<Candidate[]>;

/** Score used for a forced mate: far above anything material can give. */
export const MATE_CP = 30_000;

export interface BotParams {
  /** Engine nodes per move. Small on purpose: a phone should not get warm. */
  nodes: number;
  /** Engine lines per move. */
  multipv: number;
  /** Chance of a tunnel move. */
  tunnel: number;
  /** In a tunnel move: chance that the bot checks whether its target square is attacked. */
  look: number;
  /** In a careful move: how many centipawns of loss halve the chance of a move, roughly. */
  temperature: number;
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** The parameters for a strength between 0 (weakest) and 1 (strongest). */
export function paramsFor(strength: number): BotParams {
  const s = Math.min(1, Math.max(0, strength));
  return {
    // Geometric: 300 nodes at the bottom, 12,000 at the top.
    nodes: Math.round(300 * 40 ** s),
    multipv: 8,
    tunnel: lerp(0.6, 0.02, s),
    look: lerp(0.15, 0.9, s),
    temperature: lerp(220, 30, s),
  };
}

export const PIECE_CP: Record<PieceSymbol, number> = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

const other = (color: Color): Color => (color === 'w' ? 'b' : 'w');

function uciOf(move: Move): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function cheapestAttacker(chess: Chess, square: Square, by: Color): number | undefined {
  let cheapest: number | undefined;
  for (const from of chess.attackers(square, by)) {
    const piece = chess.get(from);
    if (!piece) continue;
    // A king "attacks" a square but cannot take a defended piece; it is the last resort.
    const value = piece.type === 'k' ? 10_000 : PIECE_CP[piece.type];
    if (cheapest === undefined || value < cheapest) cheapest = value;
  }
  return cheapest;
}

/**
 * What a piece standing on `square` would lose there at once: its whole value when it is
 * attacked and not defended, the difference when a cheaper piece attacks it, nothing
 * otherwise. A one-move look, the way a careful beginner checks a square.
 */
function exposure(chess: Chess, square: Square, owner: Color, value: number): number {
  const attacker = cheapestAttacker(chess, square, other(owner));
  if (attacker === undefined) return 0;
  const defended = chess.attackers(square, owner).length > 0;
  if (!defended) return value;
  return attacker < value ? value - attacker : 0;
}

const BACK_RANK: Record<Color, string> = { w: '1', b: '8' };
const CENTRE = new Set(['e4', 'd4', 'e5', 'd5']);

/** How much a move appeals to a player who looks only at their own idea. */
export function tunnelAppeal(fen: string, move: Move, looks: boolean): number {
  const mover = move.color;
  const value = PIECE_CP[move.piece];
  let appeal = 0;

  const after = new Chess(fen);
  after.move({ from: move.from, to: move.to, promotion: move.promotion });
  if (after.isCheckmate()) return MATE_CP;

  if (move.captured) appeal += PIECE_CP[move.captured];
  if (move.promotion) appeal += PIECE_CP[move.promotion] - 100;
  if (after.isCheck()) appeal += 60;

  if (looks) {
    // The square it goes to, and the square it leaves when the piece was in danger there.
    appeal -= exposure(after, move.to, mover, move.promotion ? PIECE_CP[move.promotion] : value);
    const before = new Chess(fen);
    appeal += 0.7 * exposure(before, move.from, mover, value);
  }

  // Natural moves: develop a minor piece, castle, put a pawn in the centre.
  if ((move.piece === 'n' || move.piece === 'b') && move.from[1] === BACK_RANK[mover]) appeal += 35;
  if (move.san.startsWith('O-O')) appeal += 50;
  if (move.piece === 'p' && CENTRE.has(move.to)) appeal += 30;
  return appeal;
}

function sample<T>(items: T[], weights: number[], random: () => number): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let index = 0; index < items.length; index++) {
    roll -= weights[index] ?? 0;
    if (roll <= 0) return items[index] as T;
  }
  return items[items.length - 1] as T;
}

export interface BotChoice {
  uci: string;
  mode: 'tunnel' | 'careful' | 'forced';
  /** Centipawns given up against the engine's best move, when the engine rated the move. */
  loss: number | undefined;
}

/** Spread of appeal, in centipawns, that halves the chance of a tunnel move. */
const TUNNEL_TEMPERATURE = 45;
/** Losses beyond this count the same: the bot does not tell "awful" from "very awful". */
const LOSS_CAP = 900;

/**
 * Chooses the bot's move in `fen`. `random` gives numbers in [0, 1); with the same numbers
 * and the same engine answers the choice is the same.
 */
export async function chooseMove(
  fen: string,
  params: BotParams,
  analyse: Analyse,
  random: () => number,
): Promise<BotChoice> {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) throw new Error(`No legal move in ${fen}`);
  const only = legal[0];
  if (legal.length === 1 && only) return { uci: uciOf(only), mode: 'forced', loss: 0 };

  const candidates = (await analyse(fen, { nodes: params.nodes, multipv: params.multipv })).filter((candidate) =>
    legal.some((move) => uciOf(move) === candidate.uci),
  );
  const best = candidates[0];
  if (!best) {
    // The engine gave nothing usable: any legal move keeps the game going.
    const fallback = legal[Math.floor(random() * legal.length)] ?? only;
    return { uci: fallback ? uciOf(fallback) : '', mode: 'forced', loss: undefined };
  }
  const lossOf = (uci: string): number | undefined => {
    const rated = candidates.find((candidate) => candidate.uci === uci);
    return rated ? best.cp - rated.cp : undefined;
  };

  if (random() < params.tunnel) {
    const looks = random() < params.look;
    // What a beginner considers: every capture, check and promotion on the board, and the
    // sensible quiet moves (the engine's list stands in for "moves that look normal").
    const rated = new Set(candidates.map((candidate) => candidate.uci));
    const pool = legal.filter(
      (move) => move.captured || move.promotion || move.san.includes('+') || move.san.includes('#') || rated.has(uciOf(move)),
    );
    const appeals = pool.map((move) => tunnelAppeal(fen, move, looks));
    const top = Math.max(...appeals);
    const weights = appeals.map((appeal) => 2 ** ((appeal - top) / TUNNEL_TEMPERATURE));
    const chosen = uciOf(sample(pool, weights, random));
    return { uci: chosen, mode: 'tunnel', loss: lossOf(chosen) };
  }

  const weights = candidates.map((candidate) => 2 ** (-Math.min(LOSS_CAP, best.cp - candidate.cp) / params.temperature));
  const chosen = sample(candidates, weights, random);
  return { uci: chosen.uci, mode: 'careful', loss: best.cp - chosen.cp };
}

/** Parses the engine's "info ... multipv N score ... pv move" lines into candidates. */
export function parseCandidates(lines: string[]): Candidate[] {
  const byRank = new Map<number, Candidate>();
  for (const line of lines) {
    if (!line.startsWith('info ') || !line.includes(' pv ')) continue;
    const rank = Number(/ multipv (\d+)/.exec(line)?.[1] ?? '1');
    const score = / score (cp|mate) (-?\d+)/.exec(line);
    const uci = / pv (\S+)/.exec(line)?.[1];
    if (!score || !uci) continue;
    const amount = Number(score[2]);
    // "mate 3" is better than "mate 5"; "mate -1" is the worst there is.
    const cp = score[1] === 'cp' ? amount : amount > 0 ? MATE_CP - amount * 100 : -MATE_CP - amount * 100;
    // Later lines of the same rank come from a deeper search and replace earlier ones.
    byRank.set(rank, { uci, cp });
  }
  return [...byRank.entries()].sort(([a], [b]) => a - b).map(([, candidate]) => candidate);
}

/** A small seeded generator, so a game can be replayed: the same seed, the same numbers. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}
