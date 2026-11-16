import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { BOT_LEVELS, botLevel, nextBotLevel } from '../shared/bot/levels.ts';
import type { Analyse, Candidate } from '../shared/bot/policy.ts';
import type { TrapFile } from '../shared/trap-types.ts';
import { bookMoves, findMistakes, gameEnd, insideTrapLines, resultFor } from '../src/core/bot-game';
import { compileTrap } from '../src/core/trap-model';

// Files are read through Vite, as the app reads them: the app's tests have no Node types.
const trapFiles = import.meta.glob<TrapFile>('../content/traps/*.json', { eager: true, import: 'default' });
const trapOf = (id: string) => {
  const file = trapFiles[`../content/traps/${id}.json`];
  if (!file) throw new Error(`No trap ${id}`);
  return compileTrap(file);
};
const calibration = import.meta.glob<{ runs: { label: string; players: { strength: number | null; rating: number }[] }[] }>(
  '../content/bot/calibration.json',
  { eager: true, import: 'default' },
);

describe('bookMoves', () => {
  const fools = trapOf('fools-mate');

  it('gives the bot the opponent moves of every line that matches the game so far', () => {
    // The player is Black: the bot (White) opens with the first moves of the lines.
    expect(bookMoves(fools, [])).toEqual(['f3', 'g4']);
    expect(bookMoves(fools, ['f3', 'e5'])).toEqual(['g4', 'h3', 'e4', 'Nc3']);
    expect(bookMoves(fools, ['f3', 'e5', 'h3', 'Qh4+'])).toEqual(['g3']);
  });

  it('gives nothing on the player turn, after the lines end, or once the game left them', () => {
    expect(bookMoves(fools, ['f3'])).toEqual([]);
    expect(bookMoves(fools, ['f3', 'e5', 'g4', 'Qh4#'])).toEqual([]);
    expect(bookMoves(fools, ['f3', 'd5'])).toEqual([]);
    expect(insideTrapLines(fools, ['f3', 'e5'])).toBe(true);
    expect(insideTrapLines(fools, ['f3', 'd5'])).toBe(false);
  });

  it('punishes a mistake of the player along the trap file', () => {
    // Legal Trap, the player is White; the mistake line 5.Nxe5?? is answered with Nxe5.
    const legal = trapOf('legal-mate');
    expect(bookMoves(legal, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'd6', 'Nc3', 'Bg4', 'Nxe5'])).toEqual(['Nxe5']);
  });
});

describe('gameEnd and resultFor', () => {
  it('knows mate, stalemate and the draws', () => {
    const mate = new Chess();
    for (const san of ['f3', 'e5', 'g4', 'Qh4#']) mate.move(san);
    const end = gameEnd(mate);
    expect(end).toEqual({ kind: 'mate', winner: 'black' });
    expect(end && resultFor(end, 'black')).toBe('win');
    expect(end && resultFor(end, 'white')).toBe('loss');
    expect(gameEnd(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toEqual({ kind: 'draw', reason: 'stalemate' });
    expect(gameEnd(new Chess('7k/8/6K1/8/8/8/8/8 w - - 0 1'))).toEqual({ kind: 'draw', reason: 'material' });
    expect(gameEnd(new Chess())).toBeUndefined();
    expect(resultFor({ kind: 'draw', reason: 'repetition' }, 'white')).toBe('draw');
    expect(resultFor({ kind: 'resign', winner: 'black' }, 'white')).toBe('loss');
  });
});

describe('findMistakes', () => {
  /** A fake engine: scores from a table by FEN, best move given per position. */
  function engine(table: Record<string, Candidate>): Analyse {
    return async (fen) => {
      const key = fen.split(' ').slice(0, 4).join(' ');
      const hit = table[key];
      return hit ? [hit] : [{ uci: '', cp: 0 }];
    };
  }
  const position = (moves: string[]) => {
    const chess = new Chess();
    for (const san of moves) chess.move(san);
    return chess.fen().split(' ').slice(0, 4).join(' ');
  };

  it('finds the move that gave up the most, and says what was better', async () => {
    // 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? (the player is Black) 4.Qxf7#: the engine knows mate
    // was coming. Here the analysis is faked: before 3...Nf6 the best was Qe7 at 0, after
    // 3...Nf6 White's best is +big.
    const moves = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'];
    const table: Record<string, Candidate> = {
      [position(moves.slice(0, 1))]: { uci: 'e7e5', cp: 0 },
      [position(moves.slice(0, 2))]: { uci: 'd1h5', cp: 0 },
      [position(moves.slice(0, 3))]: { uci: 'b8c6', cp: 0 },
      [position(moves.slice(0, 4))]: { uci: 'f1c4', cp: 0 },
      [position(moves.slice(0, 5))]: { uci: 'd8e7', cp: -10 },
      [position(moves.slice(0, 6))]: { uci: 'h5f7', cp: 29_900 },
    };
    const progress: number[] = [];
    const found = await findMistakes(moves, 'black', engine(table), 1000, 3, (done) => progress.push(done));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ ply: 5, played: 'Nf6', best: 'Qe7' });
    expect(found[0]?.loss).toBeGreaterThan(1000);
    expect(progress).toEqual([1, 2, 3]);
  });

  it('keeps the three biggest, in the order of the game, and skips the small ones', async () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5'];
    // Every White move "loses": 100, 400, 300, 200, 500 centipawns.
    const losses = [100, 400, 300, 200, 500];
    const table: Record<string, Candidate> = {};
    moves.forEach((_, ply) => {
      if (ply % 2 === 0) table[position(moves.slice(0, ply))] = { uci: 'a2a3', cp: 0 };
      else table[position(moves.slice(0, ply))] = { uci: 'a7a6', cp: losses[(ply - 1) / 2] ?? 0 };
    });
    const found = await findMistakes(moves, 'white', engine(table), 1000);
    expect(found.map((mistake) => mistake.ply)).toEqual([2, 4, 8]);
    expect(found.map((mistake) => mistake.loss)).toEqual([400, 300, 500]);
  });

  it('stops when it is no longer wanted', async () => {
    let searches = 0;
    const counting: Analyse = async () => {
      searches++;
      return [{ uci: '', cp: 0 }];
    };
    let alive = true;
    const review = findMistakes(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], 'white', counting, 1000, 3, (done) => {
      if (done === 1) alive = false;
    }, () => alive);
    await expect(review).rejects.toThrow(/stopped/);
    expect(searches).toBe(2);
  });

  it('does not count a move that was the best move', async () => {
    const moves = ['e4', 'e5'];
    const table = { [position([])]: { uci: 'e2e4', cp: 0 }, [position(['e4'])]: { uci: 'e7e5', cp: 900 } };
    expect(await findMistakes(moves, 'white', engine(table), 1000)).toEqual([]);
  });
});

describe('bot levels', () => {
  it('go up in strength and rating, from the weakest to the strongest bot', () => {
    expect(BOT_LEVELS[0]).toMatchObject({ number: 1, strength: 0 });
    BOT_LEVELS.forEach((level, index) => {
      expect(level.number).toBe(index + 1);
      const previous = BOT_LEVELS[index - 1];
      if (previous) {
        expect(level.strength).toBeGreaterThan(previous.strength);
        expect(level.rating).toBeGreaterThan(previous.rating);
      }
    });
    expect(botLevel(0).number).toBe(1);
    expect(botLevel(99).number).toBe(BOT_LEVELS.length);
  });

  it('offer the next level after a win and the one below after two losses', () => {
    expect(nextBotLevel(3, ['win'])).toBe(4);
    expect(nextBotLevel(3, ['loss'])).toBe(3);
    expect(nextBotLevel(3, ['loss', 'loss'])).toBe(2);
    expect(nextBotLevel(3, ['loss', 'draw'])).toBe(3);
    expect(nextBotLevel(1, ['loss', 'loss'])).toBe(1);
    expect(nextBotLevel(BOT_LEVELS.length, ['win'])).toBe(BOT_LEVELS.length);
  });

  it('match the calibration file they were taken from', () => {
    const file = Object.values(calibration)[0];
    const grid = file?.runs.find((run) => run.label === 'grid-v1');
    expect(grid).toBeDefined();
    const points = (grid?.players ?? []).filter((player) => player.strength !== null);
    // Interpolating the grid at a level's strength gives back its rating, within 15 points.
    for (const level of BOT_LEVELS) {
      const upper = points.findIndex((point) => (point.strength ?? 0) >= level.strength);
      const high = points[Math.max(upper, 0)];
      const low = points[Math.max(upper - 1, 0)];
      if (!high || !low) continue;
      const span = (high.strength ?? 0) - (low.strength ?? 0);
      const rating = span === 0 ? high.rating : low.rating + ((level.strength - (low.strength ?? 0)) / span) * (high.rating - low.rating);
      expect(Math.abs(rating - level.rating), `level ${level.number}`).toBeLessThan(15);
    }
  });
});
