import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import type { Analyse, Candidate } from '../shared/bot/policy.ts';
import {
  commonPlayers,
  isOwnId,
  isValidExercise,
  mineGame,
  ownEntry,
  readGame,
  splitPgn,
} from '../src/core/own-games';
import { compilePuzzle } from '../src/core/puzzle-model';

// Made-up names: nothing here comes from a real game.
const GAME_A = `[Event "Live Chess"]
[Site "Chess.com"]
[White "alpha"]
[Black "beta"]
[Result "1-0"]

1. e4 {[%clk 0:09:58]} 1... e5 {[%clk 0:09:57.1]} 2. Qh5 {[%clk 0:09:50]} 2... Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;
const GAME_B = `[Event "Live Chess"]
[White "gamma"]
[Black "alpha"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1`;

const key = (fen: string) => fen.split(' ').slice(0, 4).join(' ');
const position = (moves: string[]) => {
  const chess = new Chess();
  for (const san of moves) chess.move(san);
  return key(chess.fen());
};
function engine(table: Record<string, Candidate[]>): Analyse {
  return async (fen, { multipv }) => (table[key(fen)] ?? [{ uci: 'a2a3', cp: 0 }, { uci: 'a2a4', cp: 0 }]).slice(0, multipv);
}

describe('reading PGN', () => {
  it('splits a text into games and reads moves through clock comments', () => {
    const games = splitPgn(`${GAME_A}\n\n${GAME_B}\n`);
    expect(games).toHaveLength(2);
    expect(readGame(games[0] ?? '')).toEqual({
      white: 'alpha',
      black: 'beta',
      moves: ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'],
    });
    expect(readGame(games[1] ?? '')?.moves).toEqual(['f3', 'e5', 'g4', 'Qh4#']);
    expect(splitPgn('')).toEqual([]);
    expect(splitPgn(GAME_A.replace(/\n/g, '\r\n'))).toHaveLength(1);
  });

  it('reads move text without tags', () => {
    expect(readGame('1. e4 e5 2. Nf3 Nc6')?.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('refuses broken games, variants and set-up positions', () => {
    expect(readGame('1. e4 e5 2. Ke3')).toBeUndefined();
    expect(readGame('hello')).toBeUndefined();
    expect(readGame('[Variant "Chess960"]\n\n1. e4 e5')).toBeUndefined();
    expect(readGame('[SetUp "1"]\n[FEN "8/8/8/8/8/8/4K3/4k3 w - - 0 1"]\n\n1. Kd3')).toBeUndefined();
    expect(readGame('1. e4')).toBeUndefined();
  });

  it('finds the name that plays in every game', () => {
    const games = [GAME_A, GAME_B].map((pgn) => readGame(pgn)).filter((game) => game !== undefined);
    expect(commonPlayers(games)).toEqual(['alpha']);
    expect(commonPlayers(games.slice(0, 1))).toEqual(['alpha', 'beta']);
    expect(commonPlayers([])).toEqual([]);
  });
});

describe('mineGame', () => {
  // 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#: Black (the player) had 3...Qe7.
  const moves = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'];
  const table: Record<string, Candidate[]> = {
    [position(moves.slice(0, 5))]: [
      { uci: 'd8e7', cp: -20 },
      { uci: 'g7g6', cp: -180 },
    ],
    [position(moves.slice(0, 6))]: [{ uci: 'h5f7', cp: 29_900 }],
  };

  it('makes an exercise where one move was clearly best and another was played', async () => {
    const progress: number[] = [];
    const found = await mineGame(moves, 'black', engine(table), 123, undefined, (done) => progress.push(done));
    expect(found).toHaveLength(1);
    const [exercise] = found;
    expect(exercise).toMatchObject({ moves: 'f1c4 d8e7', played: 'Nf6', addedAt: 123 });
    expect(exercise && isOwnId(exercise.id)).toBe(true);
    expect(exercise?.loss).toBeGreaterThan(1000);
    // The exercise starts with the opponent's move, like a puzzle, and holds no names.
    expect(key(exercise?.fen ?? '')).toBe(position(moves.slice(0, 4)));
    expect(Object.keys(exercise ?? {}).sort()).toEqual(['addedAt', 'fen', 'id', 'loss', 'moves', 'played']);
    expect(progress).toEqual([1, 2, 3]);
    const puzzle = compilePuzzle(ownEntry(exercise as never));
    expect(puzzle.side).toBe('black');
    expect(puzzle.line.steps.map((step) => step.san)).toEqual(['Bc4', 'Qe7']);
    expect(isValidExercise(exercise as never)).toBe(true);
  });

  it('is the same exercise when the same position comes up again', async () => {
    const first = await mineGame(moves, 'black', engine(table), 1);
    const again = await mineGame(moves, 'black', engine(table), 2);
    expect(again[0]?.id).toBe(first[0]?.id);
  });

  it('skips a position without a clearly best move, a lost one, a won one and a small slip', async () => {
    const before = position(moves.slice(0, 5));
    const after = position(moves.slice(0, 6));
    const cases: Record<string, Candidate[]>[] = [
      // Two moves about as good.
      { [before]: [{ uci: 'd8e7', cp: -20 }, { uci: 'g7g6', cp: -60 }], [after]: [{ uci: 'h5f7', cp: 29_900 }] },
      // Lost anyway.
      { [before]: [{ uci: 'd8e7', cp: -700 }, { uci: 'g7g6', cp: -1200 }], [after]: [{ uci: 'h5f7', cp: 29_900 }] },
      // Won by anything.
      { [before]: [{ uci: 'd8e7', cp: 900 }, { uci: 'g7g6', cp: 700 }], [after]: [{ uci: 'h5f7', cp: -650 }] },
      // The played move was not much worse.
      { [before]: [{ uci: 'd8e7', cp: 150 }, { uci: 'g7g6', cp: 10 }], [after]: [{ uci: 'h5f7', cp: -60 }] },
    ];
    for (const fake of cases) expect(await mineGame(moves.slice(0, 6), 'black', engine(fake), 1)).toEqual([]);
  });

  it('does not count the best move as a mistake, and never the first move of the game', async () => {
    const good = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Qe7'];
    expect(await mineGame(good, 'black', engine(table), 1)).toEqual([]);
    const first: Record<string, Candidate[]> = {
      [position([])]: [{ uci: 'e2e4', cp: 300 }, { uci: 'd2d4', cp: 0 }],
      [position(['a3'])]: [{ uci: 'e7e5', cp: 400 }],
    };
    expect(await mineGame(['a3', 'e5'], 'white', engine(first), 1)).toEqual([]);
  });

  it('stops when it is no longer wanted', async () => {
    let alive = true;
    const run = mineGame(moves, 'black', engine(table), 1, undefined, () => (alive = false), () => alive);
    await expect(run).rejects.toThrow(/stopped/);
  });
});

describe('isValidExercise', () => {
  const good = { id: 'own0123abcd', fen: new Chess().fen(), moves: 'e2e4 e7e5', played: 'd5', loss: 200, addedAt: 1 };
  it('plays the exercise to check it', () => {
    expect(isValidExercise(good)).toBe(true);
    expect(isValidExercise({ ...good, id: 'abc' })).toBe(false);
    expect(isValidExercise({ ...good, moves: 'e2e5 e7e5' })).toBe(false);
    expect(isValidExercise({ ...good, moves: 'e2e4' })).toBe(false);
    expect(isValidExercise({ ...good, moves: 'e2e4 <script>' })).toBe(false);
    expect(isValidExercise({ ...good, fen: 'not a position' })).toBe(false);
  });
});
