// Puzzles: the entry test, the player's level, which puzzle comes next, and what a solved or
// failed puzzle changes. Pure functions over plain objects.

import {
  PUZZLE_THEMES,
  TACTICS_LEVELS,
  TOP_LEVEL,
  themeLevel,
  type PuzzleEntry,
  type PuzzleTheme,
} from '../../shared/puzzle-types.ts';
import { startOfNextLocalDay } from './days';
import { nextReviewDay, reviewCard, startCard, type Grade, type StoredCard } from './schedule';

/** What the app remembers about one puzzle. */
export interface PuzzleStat {
  id: string;
  attempts: number;
  /** Attempts without errors and hints. */
  clean: number;
  lastAt: number;
  lastClean: boolean;
  /**
   * FSRS state. A puzzle gets a card when an attempt was not clean; a puzzle solved cleanly
   * at once never comes back by itself.
   */
  card: StoredCard | null;
  /** The review opens at this time (the start of a local day); `null` without a card. */
  dueAt: number | null;
}

/** Errors and hints of one attempt. */
export interface AttemptResult {
  errors: number;
  hints: number;
}

function gradeOfAttempt(result: AttemptResult): Grade {
  if (result.errors > 0) return 'again';
  return result.hints > 0 ? 'hard' : 'good';
}

export function isPuzzleDue(stat: PuzzleStat | undefined, now: number): boolean {
  return stat != null && stat.card !== null && stat.dueAt !== null && stat.dueAt <= now;
}

/** Puzzles whose review is open, the longest waiting first. */
export function duePuzzleIds(stats: Record<string, PuzzleStat>, now: number): string[] {
  return Object.values(stats)
    .filter((stat) => isPuzzleDue(stat, now))
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0) || (a.id < b.id ? -1 : 1))
    .map((stat) => stat.id);
}

/**
 * The record of an exercise that has just been made from the player's own game: the move
 * was missed in a real game, so it is due at once and then follows the FSRS schedule.
 */
export function newOwnStat(id: string, now: number): PuzzleStat {
  return { id, attempts: 0, clean: 0, lastAt: now, lastClean: false, card: startCard(id, 'again', now), dueAt: now };
}

/**
 * A record written before puzzles had FSRS cards (the M4 build, progress file format 2).
 * A puzzle that was failed last time gets a card as if it had been failed under the new
 * rule: it is due on the day after that attempt, which is when the old rule brought it back.
 */
export function migratePuzzleStat(stat: Omit<PuzzleStat, 'card' | 'dueAt'> & Partial<PuzzleStat>): PuzzleStat {
  if (stat.card !== undefined && stat.dueAt !== undefined) return stat as PuzzleStat;
  if (stat.lastClean) return { ...stat, card: null, dueAt: null };
  return {
    ...stat,
    card: startCard(stat.id, 'again', stat.lastAt),
    dueAt: startOfNextLocalDay(stat.lastAt),
  };
}

export interface TestRecord {
  at: number;
  /** One entry per test puzzle, easiest first: solved without errors and hints or not. */
  results: boolean[];
  level: number;
}

export interface TacticsState {
  /** Index into TACTICS_LEVELS; `null` until the entry test is taken. */
  level: number | null;
  /** The last entry test. */
  test: TestRecord | null;
  /** Results of the latest puzzles of the current level, newest last, at most LEVEL_WINDOW. */
  recent: boolean[];
  updatedAt: number;
}

export function emptyTactics(): TacticsState {
  return { level: null, test: null, recent: [], updatedAt: 0 };
}

/** Puzzles of the entry test per level. */
export const TEST_PER_LEVEL = 2;
export const TEST_SIZE = TACTICS_LEVELS.length * TEST_PER_LEVEL;
/** A level is passed when the last LEVEL_WINDOW puzzles are solved at LEVEL_PASS or better. */
export const LEVEL_WINDOW = 30;
export const LEVEL_PASS = 0.7;

/** The level puzzles are served from: without a test the player starts at the bottom. */
export function currentLevel(tactics: TacticsState): number {
  return tactics.level ?? 0;
}

/** The rating band served for a theme: the player's level, or the theme's own if it is higher. */
export function bandFor(level: number, theme: PuzzleTheme): { min: number; max: number } {
  const index = Math.min(Math.max(level, themeLevel(theme)), TOP_LEVEL);
  const band = TACTICS_LEVELS[index] ?? TACTICS_LEVELS[0];
  if (!band) throw new Error('no tactics levels');
  return { min: band.min, max: band.max };
}

/** Themes the levels up to `level` have introduced. */
export function themesUpTo(level: number): PuzzleTheme[] {
  return PUZZLE_THEMES.filter((theme) => themeLevel(theme) <= level);
}

function pick<T>(items: T[], random: () => number): T | undefined {
  return items[Math.min(Math.floor(random() * items.length), items.length - 1)];
}

/**
 * The entry test: two puzzles per level, easiest level first. A test puzzle comes from the
 * middle half of its level's band, because neighbouring bands overlap at the edges, and the
 * two puzzles of a level have different themes. Levels that introduce themes use them.
 */
export function pickTestPuzzles(pool: PuzzleEntry[], random: () => number): PuzzleEntry[] {
  const test: PuzzleEntry[] = [];
  TACTICS_LEVELS.forEach((level, index) => {
    const quarter = (level.max - level.min) / 4;
    const themes = level.themes.length > 0 ? [...level.themes] : themesUpTo(index);
    const inBand = pool.filter(
      (puzzle) =>
        puzzle.rating >= level.min + quarter &&
        puzzle.rating < level.max - quarter &&
        !test.includes(puzzle),
    );
    const used: PuzzleTheme[] = [];
    for (let count = 0; count < TEST_PER_LEVEL; count++) {
      // Themes not used on this level first; a theme without puzzles in the band is dropped.
      let free = themes.filter((theme) => !used.includes(theme));
      let puzzle: PuzzleEntry | undefined;
      while (!puzzle && free.length > 0) {
        const theme = pick(free, random);
        if (!theme) break;
        puzzle = pick(
          inBand.filter((candidate) => candidate.themes.includes(theme) && !test.includes(candidate)),
          random,
        );
        if (puzzle) used.push(theme);
        else free = free.filter((other) => other !== theme);
      }
      // Nothing left with a new theme: any puzzle of the band will do.
      puzzle ??= pick(
        inBand.filter((candidate) => !test.includes(candidate)),
        random,
      );
      if (puzzle) test.push(puzzle);
    }
  });
  return test;
}

/**
 * The starting level: the first level where at least one of its test puzzles was missed.
 * With nothing missed it is the top level.
 */
export function levelFromTest(results: boolean[]): number {
  for (let level = 0; level <= TOP_LEVEL; level++) {
    const own = results.slice(level * TEST_PER_LEVEL, (level + 1) * TEST_PER_LEVEL);
    if (own.length < TEST_PER_LEVEL || own.includes(false)) return level;
  }
  return TOP_LEVEL;
}

export function applyTest(results: boolean[], now: number): TacticsState {
  const level = levelFromTest(results);
  return { level, test: { at: now, results, level }, recent: [], updatedAt: now };
}

/**
 * The next puzzle of a theme. In this order: a failed puzzle whose review is due, a new
 * puzzle from the band, a new puzzle with the nearest rating, and when the theme has
 * nothing new left, the puzzle tried longest ago.
 */
export function nextPuzzle(
  pool: PuzzleEntry[],
  theme: PuzzleTheme,
  level: number,
  stats: Record<string, PuzzleStat>,
  now: number,
  random: () => number,
  exclude?: string,
): PuzzleEntry | undefined {
  const band = bandFor(level, theme);
  const ofTheme = pool.filter((puzzle) => puzzle.themes.includes(theme) && puzzle.id !== exclude);

  const due = ofTheme
    .filter((puzzle) => isPuzzleDue(stats[puzzle.id], now))
    .sort((a, b) => (stats[a.id]?.dueAt ?? 0) - (stats[b.id]?.dueAt ?? 0));
  if (due[0]) return due[0];

  const fresh = ofTheme.filter((puzzle) => stats[puzzle.id] === undefined);
  const inBand = fresh.filter((puzzle) => puzzle.rating >= band.min && puzzle.rating < band.max);
  if (inBand.length > 0) return pick(inBand, random);
  if (fresh.length > 0) {
    const distance = (puzzle: PuzzleEntry) =>
      puzzle.rating < band.min ? band.min - puzzle.rating : Math.max(0, puzzle.rating - band.max + 1);
    return [...fresh].sort((a, b) => distance(a) - distance(b) || a.rating - b.rating)[0];
  }
  return [...ofTheme].sort((a, b) => (stats[a.id]?.lastAt ?? 0) - (stats[b.id]?.lastAt ?? 0))[0];
}

/**
 * Records one attempt. A first attempt that is not clean starts an FSRS card, due the next
 * day at the earliest. A puzzle with a card is graded when its review is due; an extra try
 * before that day changes nothing in the schedule. A clean first attempt schedules nothing.
 */
export function applyPuzzleStat(
  stat: PuzzleStat | undefined,
  id: string,
  result: AttemptResult,
  now: number,
  /**
   * False for the entry test: it reaches far above the player's level on purpose, and its
   * misses are a measurement, not something to repeat. Nothing is scheduled then.
   */
  schedule = true,
): PuzzleStat {
  const clean = result.errors === 0 && result.hints === 0;
  const grade = gradeOfAttempt(result);
  let card = stat?.card ?? null;
  let dueAt = stat?.dueAt ?? null;
  if (card === null) {
    if (!clean && schedule) {
      card = startCard(id, grade, now);
      dueAt = nextReviewDay(card, now);
    }
  } else if (dueAt !== null && dueAt <= now) {
    card = reviewCard(card, grade, now);
    dueAt = nextReviewDay(card, now);
  }
  return {
    id,
    attempts: (stat?.attempts ?? 0) + 1,
    clean: (stat?.clean ?? 0) + (clean ? 1 : 0),
    lastAt: now,
    lastClean: clean,
    card,
    dueAt,
  };
}

/**
 * Counts a puzzle towards the level when its rating is inside the level's band. When the
 * window is full and the share of clean solutions is high enough, the level goes up.
 */
export function applyPuzzleToLevel(
  tactics: TacticsState,
  rating: number,
  clean: boolean,
  now: number,
): { tactics: TacticsState; levelUp: boolean } {
  const level = currentLevel(tactics);
  const band = TACTICS_LEVELS[level];
  if (!band || rating < band.min || rating >= band.max) return { tactics, levelUp: false };
  const recent = [...tactics.recent, clean].slice(-LEVEL_WINDOW);
  const share = recent.filter(Boolean).length / recent.length;
  if (recent.length >= LEVEL_WINDOW && share >= LEVEL_PASS && level < TOP_LEVEL) {
    return { tactics: { ...tactics, level: level + 1, recent: [], updatedAt: now }, levelUp: true };
  }
  return { tactics: { ...tactics, recent, updatedAt: now }, levelUp: false };
}

/** Puzzles of a theme solved cleanly at least once. */
export function solvedCount(pool: PuzzleEntry[], theme: PuzzleTheme, stats: Record<string, PuzzleStat>): number {
  return pool.filter((puzzle) => puzzle.themes.includes(theme) && (stats[puzzle.id]?.clean ?? 0) > 0).length;
}
