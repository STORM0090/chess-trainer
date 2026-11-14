import { beforeAll, describe, expect, it } from 'vitest';
import { TACTICS_LEVELS, TOP_LEVEL, type PuzzleEntry, type PuzzleTheme } from '../shared/puzzle-types.ts';
import { compilePuzzle } from '../src/core/puzzle-model';
import { judgeMove } from '../src/core/learn';
import { DAY_MS, startOfNextLocalDay } from '../src/core/days';
import { initSchedule } from '../src/core/schedule';
import { fenAtPly } from '../src/core/trap-model';
import {
  LEVEL_WINDOW,
  applyPuzzleStat,
  applyPuzzleToLevel,
  applyTest,
  bandFor,
  duePuzzleIds,
  emptyTactics,
  isPuzzleDue,
  migratePuzzleStat,
  levelFromTest,
  nextPuzzle,
  pickTestPuzzles,
  solvedCount,
  type PuzzleStat,
  type TacticsState,
} from '../src/core/tactics';

beforeAll(initSchedule);

const CLEAN = { errors: 0, hints: 0 };
const WRONG = { errors: 1, hints: 0 };
const HINTED = { errors: 0, hints: 2 };
const NOW = new Date(2026, 10, 14, 21, 30).getTime();
const YESTERDAY = new Date(2026, 10, 13, 12, 0).getTime();

/** A real puzzle of the Lichess database: Black to move blunders, White mates in one. */
const MATE: PuzzleEntry = {
  id: 'cfxZa',
  fen: 'r4b1r/2k3pp/1nP5/1P1pR3/p3bB2/2P2N2/P4PPP/R5K1 b - - 2 22',
  moves: 'c7c8 e5e8',
  rating: 400,
  themes: ['mateIn1'],
};

function fake(id: string, rating: number, ...themes: PuzzleTheme[]): PuzzleEntry {
  return { ...MATE, id, rating, themes };
}

function stat(id: string, lastClean: boolean, lastAt: number): PuzzleStat {
  return applyPuzzleStat(undefined, id, lastClean ? CLEAN : WRONG, lastAt);
}

describe('compilePuzzle', () => {
  const puzzle = compilePuzzle(MATE);

  it('gives the player the side that does not move first', () => {
    expect(puzzle.side).toBe('white');
    expect(puzzle.line.steps.map((step) => step.mover)).toEqual(['black', 'white']);
  });

  it('starts from the position of the puzzle and numbers the moves of the game', () => {
    expect(fenAtPly(puzzle.line, 0)).toBe(MATE.fen);
    expect(puzzle.line.steps.map((step) => `${step.moveNumber} ${step.san}`)).toEqual(['22 Kc8', '23 Re8#']);
    expect(puzzle.line.steps.map((step) => step.ply)).toEqual([0, 1]);
    expect(puzzle.line.steps[1]?.kind).toBe('mate');
  });

  it('is judged by the same judge as a trap', () => {
    expect(judgeMove(puzzle, puzzle.line, 1, { from: 'e5', to: 'e8', promotion: undefined })).toEqual({
      kind: 'correct',
    });
    expect(judgeMove(puzzle, puzzle.line, 1, { from: 'e5', to: 'e7', promotion: undefined })).toEqual({
      kind: 'wrong',
    });
  });

  it('refuses an illegal move', () => {
    expect(() => compilePuzzle({ ...MATE, moves: 'c7c8 e5e1' })).toThrow();
  });
});

describe('entry test', () => {
  it('puts the player on the first level with a missed puzzle', () => {
    expect(levelFromTest([false, true, true, true, true, true, true, true, true, true])).toBe(0);
    expect(levelFromTest([true, true, true, false, true, true, true, true, true, true])).toBe(1);
    expect(levelFromTest([true, true, true, true, true, true, true, true, true, false])).toBe(4);
    expect(levelFromTest(Array(10).fill(true))).toBe(TOP_LEVEL);
    // An unfinished test counts what is missing as missed.
    expect(levelFromTest([true, true, true])).toBe(1);
    expect(levelFromTest([])).toBe(0);
  });

  it('saves the level and clears the window of the old level', () => {
    const results = [true, true, true, true, false, true, true, true, true, true];
    expect(applyTest(results, NOW)).toEqual({
      level: 2,
      test: { at: NOW, results, level: 2 },
      recent: [],
      updatedAt: NOW,
    });
  });

  it('takes two puzzles with different themes from the middle of every band', () => {
    const pool: PuzzleEntry[] = [];
    TACTICS_LEVELS.forEach((level, index) => {
      const middle = (level.min + level.max) / 2;
      for (const theme of ['mateIn1', 'hangingPiece', 'fork', 'backRankMate', 'pin', 'mateIn2'] as const) {
        pool.push(fake(`${theme}${index}`, middle, theme));
        // The edges of a band overlap with its neighbours: never taken for this level.
        pool.push(fake(`${theme}${index}low`, level.min, theme));
        pool.push(fake(`${theme}${index}high`, level.max - 1, theme));
      }
    });
    for (const random of [() => 0, () => 0.5, () => 0.999]) {
      const test = pickTestPuzzles(pool, random);
      expect(test).toHaveLength(10);
      expect(new Set(test.map((puzzle) => puzzle.id)).size).toBe(10);
      test.forEach((puzzle, index) => {
        const level = TACTICS_LEVELS[Math.floor(index / 2)];
        const quarter = ((level?.max ?? 0) - (level?.min ?? 0)) / 4;
        expect(puzzle.rating).toBeGreaterThanOrEqual((level?.min ?? 0) + quarter);
        expect(puzzle.rating).toBeLessThan((level?.max ?? 0) - quarter);
      });
      // The first levels test the themes they introduce.
      expect(test.slice(0, 2).map((puzzle) => puzzle.themes[0]).sort()).toEqual(['hangingPiece', 'mateIn1']);
      // Level 2 introduces three themes; the pool has puzzles for two of them.
      expect(test.slice(2, 4).map((puzzle) => puzzle.themes[0]).sort()).toEqual(['backRankMate', 'fork']);
    }
  });
});

describe('nextPuzzle', () => {
  const pool = [
    fake('low', 450, 'mateIn1'),
    fake('mid', 650, 'mateIn1'),
    fake('high', 1300, 'mateIn1'),
    fake('fork', 650, 'fork'),
    fake('pin', 900, 'pin'),
  ];

  it('serves a new puzzle of the theme from the band of the level', () => {
    expect(nextPuzzle(pool, 'mateIn1', 0, {}, NOW, () => 0)?.id).toBe('low');
    expect(nextPuzzle(pool, 'mateIn1', 0, {}, NOW, () => 0.99)?.id).toBe('mid');
    expect(nextPuzzle(pool, 'mateIn1', 4, {}, NOW, () => 0)?.id).toBe('high');
    expect(nextPuzzle(pool, 'fork', 0, {}, NOW, () => 0)?.id).toBe('fork');
  });

  it('uses the band of the theme when the theme starts above the level', () => {
    expect(bandFor(0, 'pin')).toEqual({ min: 800, max: 1100 });
    expect(bandFor(4, 'pin')).toEqual({ min: 1150, max: 1400 });
    expect(nextPuzzle(pool, 'pin', 0, {}, NOW, () => 0)?.id).toBe('pin');
  });

  it('brings back a failed puzzle when its review is due, not on the day it was failed', () => {
    expect(nextPuzzle(pool, 'mateIn1', 0, { mid: stat('mid', false, YESTERDAY) }, NOW, () => 0)?.id).toBe('mid');
    expect(nextPuzzle(pool, 'mateIn1', 0, { mid: stat('mid', false, NOW) }, NOW, () => 0)?.id).toBe('low');
  });

  it('goes to the nearest rating when the band has nothing new, then to the oldest solved', () => {
    const solved = { low: stat('low', true, YESTERDAY), mid: stat('mid', true, NOW) };
    expect(nextPuzzle(pool, 'mateIn1', 0, solved, NOW, () => 0)?.id).toBe('high');
    const all = { ...solved, high: stat('high', true, NOW) };
    expect(nextPuzzle(pool, 'mateIn1', 0, all, NOW, () => 0)?.id).toBe('low');
  });

  it('does not repeat the puzzle just solved, and says when a theme is empty', () => {
    expect(nextPuzzle(pool, 'fork', 0, {}, NOW, () => 0, 'fork')).toBeUndefined();
    expect(nextPuzzle(pool, 'skewer', 0, {}, NOW, () => 0)).toBeUndefined();
  });
});

describe('progress in puzzles', () => {
  it('counts attempts and clean solutions', () => {
    const first = applyPuzzleStat(undefined, 'a', WRONG, YESTERDAY);
    expect(first).toMatchObject({ id: 'a', attempts: 1, clean: 0, lastAt: YESTERDAY, lastClean: false });
    expect(applyPuzzleStat(first, 'a', CLEAN, NOW)).toMatchObject({
      id: 'a',
      attempts: 2,
      clean: 1,
      lastAt: NOW,
      lastClean: true,
    });
    const pool = [fake('a', 500, 'mateIn1'), fake('b', 500, 'mateIn1')];
    expect(solvedCount(pool, 'mateIn1', { a: applyPuzzleStat(first, 'a', CLEAN, NOW), b: first })).toBe(1);
  });

  it('schedules nothing for a puzzle solved cleanly at once', () => {
    expect(applyPuzzleStat(undefined, 'a', CLEAN, NOW)).toMatchObject({ card: null, dueAt: null });
    expect(isPuzzleDue(applyPuzzleStat(undefined, 'a', CLEAN, NOW), NOW + 400 * DAY_MS)).toBe(false);
  });

  it('gives a failed puzzle a review card, due tomorrow at the earliest', () => {
    for (const result of [WRONG, HINTED]) {
      const failed = applyPuzzleStat(undefined, 'a', result, NOW);
      expect(failed.card).not.toBeNull();
      expect(failed.dueAt).toBe(startOfNextLocalDay(NOW));
      expect(isPuzzleDue(failed, NOW)).toBe(false);
      expect(isPuzzleDue(failed, startOfNextLocalDay(NOW))).toBe(true);
    }
  });

  it('moves the review further away after every good answer and brings it back after a bad one', () => {
    let puzzle = applyPuzzleStat(undefined, 'a', WRONG, NOW);
    const gaps: number[] = [];
    let at = puzzle.dueAt ?? 0;
    for (let round = 0; round < 4; round++) {
      puzzle = applyPuzzleStat(puzzle, 'a', CLEAN, at);
      const gap = Math.round(((puzzle.dueAt ?? 0) - at) / DAY_MS);
      gaps.push(gap);
      at = puzzle.dueAt ?? 0;
    }
    expect(gaps.every((gap) => gap >= 1)).toBe(true);
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
    expect(gaps.at(-1)).toBeGreaterThan(gaps[0] ?? 0);
    const lapsed = applyPuzzleStat(puzzle, 'a', WRONG, at);
    expect(Math.round(((lapsed.dueAt ?? 0) - at) / DAY_MS)).toBeLessThan(gaps.at(-1) ?? 0);
    expect(lapsed.card?.lapses).toBe((puzzle.card?.lapses ?? 0) + 1);
  });

  it('leaves the schedule alone when a puzzle is tried again before its day', () => {
    const failed = applyPuzzleStat(undefined, 'a', WRONG, NOW);
    const again = applyPuzzleStat(failed, 'a', CLEAN, NOW + 60_000);
    expect(again.card).toEqual(failed.card);
    expect(again.dueAt).toBe(failed.dueAt);
    expect(again).toMatchObject({ attempts: 2, clean: 1, lastClean: true });
  });

  it('starts a card when a puzzle that was once solved is failed later', () => {
    const solved = applyPuzzleStat(undefined, 'a', CLEAN, YESTERDAY);
    const failed = applyPuzzleStat(solved, 'a', WRONG, NOW);
    expect(failed.card).not.toBeNull();
    expect(failed.dueAt).toBe(startOfNextLocalDay(NOW));
  });

  it('lists due puzzles, the longest waiting first', () => {
    const stats = {
      b: applyPuzzleStat(undefined, 'b', WRONG, NOW - 2 * DAY_MS),
      a: applyPuzzleStat(undefined, 'a', WRONG, NOW - 5 * DAY_MS),
      c: applyPuzzleStat(undefined, 'c', WRONG, NOW),
      d: applyPuzzleStat(undefined, 'd', CLEAN, NOW - 5 * DAY_MS),
    };
    expect(duePuzzleIds(stats, NOW)).toEqual(['a', 'b']);
  });

  it('gives records of the M4 build a card when the last attempt failed', () => {
    const old = { id: 'a', attempts: 2, clean: 0, lastAt: YESTERDAY, lastClean: false };
    const migrated = migratePuzzleStat(old);
    expect(migrated).toMatchObject(old);
    expect(migrated.card).not.toBeNull();
    // Due on the day after the failed attempt: the day the old rule brought it back.
    expect(migrated.dueAt).toBe(startOfNextLocalDay(YESTERDAY));
    expect(isPuzzleDue(migrated, NOW)).toBe(true);
    expect(migratePuzzleStat({ ...old, clean: 1, lastClean: true })).toMatchObject({ card: null, dueAt: null });
    // A record that already has the fields is returned as it is.
    expect(migratePuzzleStat(migrated)).toBe(migrated);
  });

  it('raises the level after a full window solved well enough', () => {
    let tactics: TacticsState = { ...emptyTactics(), level: 1 };
    let levelUp = false;
    for (let index = 0; index < LEVEL_WINDOW; index++) {
      // 21 of 30 clean is exactly 70%.
      ({ tactics, levelUp } = applyPuzzleToLevel(tactics, 700, index >= 9, NOW));
      if (index < LEVEL_WINDOW - 1) expect(levelUp).toBe(false);
    }
    expect(levelUp).toBe(true);
    expect(tactics).toMatchObject({ level: 2, recent: [] });
  });

  it('keeps the level when the window is not good enough, and slides the window', () => {
    let tactics: TacticsState = { ...emptyTactics(), level: 1 };
    for (let index = 0; index < LEVEL_WINDOW + 5; index++) {
      tactics = applyPuzzleToLevel(tactics, 700, index % 2 === 0, NOW).tactics;
    }
    expect(tactics.level).toBe(1);
    expect(tactics.recent).toHaveLength(LEVEL_WINDOW);
  });

  it('ignores puzzles outside the band of the level, and stops at the top level', () => {
    const tactics = { ...emptyTactics(), level: 0 };
    expect(applyPuzzleToLevel(tactics, 900, true, NOW)).toEqual({ tactics, levelUp: false });
    let top: TacticsState = { ...emptyTactics(), level: TOP_LEVEL };
    for (let index = 0; index < LEVEL_WINDOW; index++) top = applyPuzzleToLevel(top, 1200, true, NOW).tactics;
    expect(top.level).toBe(TOP_LEVEL);
  });

  it('starts counting from the bottom level when no test was taken', () => {
    let tactics = emptyTactics();
    for (let index = 0; index < LEVEL_WINDOW; index++) tactics = applyPuzzleToLevel(tactics, 500, true, NOW).tactics;
    expect(tactics.level).toBe(1);
  });
});
