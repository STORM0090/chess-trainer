// The app's saved state in memory. Screens read it through `useAppData` and change it through
// the functions below; every change is written to IndexedDB right away.

import { useEffect, useState } from 'preact/hooks';
import { nextBotLevel } from '../../shared/bot/levels.ts';
import type { GameResult } from '../core/bot-game';
import type { ChainStep } from '../core/chain';
import {
  applyActivity,
  completeItem,
  emptyDay,
  type ActivityKind,
  type DayRecord,
  type SessionItem,
} from '../core/daily';
import { DAY_MS, dayKey, type DayKey } from '../core/days';
import {
  applyChainRun,
  applyReview,
  BOT_RESULTS_KEPT,
  emptyData,
  emptyProgress,
  isClean,
  type AppData,
  type GameEntry,
  type GameOutcome,
  type RunResult,
  type Settings,
  type TrapProgress,
} from '../core/progress';
import type { OwnExercise } from '../core/own-games';
import type { Grade } from '../core/schedule';
import {
  newOwnStat,
  applyPuzzleStat,
  applyPuzzleToLevel,
  applyTest,
  type AttemptResult,
  type TacticsState,
} from '../core/tactics';
import * as db from './db';

export interface StoreState {
  data: AppData;
  /**
   * `saved`: changes reach IndexedDB. `memory`: the database could not be opened (for example
   * a private window), progress lives until the page is closed. `failed`: a write failed.
   * `blocked`: another tab of an older version holds the database. `outdated`: a newer
   * version was opened in another tab; this page must be reloaded.
   */
  storage: 'saved' | 'memory' | 'failed' | 'blocked' | 'outdated';
}

let state: StoreState = { data: emptyData(), storage: 'saved' };
const listeners = new Set<(next: StoreState) => void>();

function publish(next: StoreState): void {
  state = next;
  for (const listener of listeners) listener(state);
}

function setData(data: AppData): void {
  publish({ ...state, data });
}

/** Runs a write and remembers when it fails, so the UI can say that progress is not saved. */
function persist(write: () => Promise<void>): void {
  if (state.storage !== 'saved' && state.storage !== 'failed') return;
  write().then(
    () => void askForPersistentStorage(),
    () => publish({ ...state, storage: 'failed' }),
  );
}

let askedToPersist = false;

/**
 * Asks the browser not to evict the database when the device runs low on space. Browsers
 * decide by themselves (an installed PWA usually gets it); nothing depends on the answer.
 */
async function askForPersistentStorage(): Promise<void> {
  if (askedToPersist) return;
  askedToPersist = true;
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Not supported: the data stays "best effort", which is the default anyway.
  }
}

/** Reads the saved state. Called once before the first render. */
export async function loadStore(): Promise<void> {
  db.databaseEvents.onOutdated = () => publish({ ...state, storage: 'outdated' });
  // The upgrade of the database waits while an older version is open in another tab. The
  // app does not wait with a blank screen: it starts from memory and says why.
  const blocked = new Promise<'blocked'>((resolve) => {
    db.databaseEvents.onBlocked = () => resolve('blocked');
  });
  try {
    const loaded = await Promise.race([db.loadAll(), blocked]);
    if (loaded === 'blocked') publish({ data: emptyData(), storage: 'blocked' });
    else publish({ data: loaded, storage: 'saved' });
  } catch {
    publish({ data: emptyData(), storage: 'memory' });
  }
}

export function getStore(): StoreState {
  return state;
}

/** Calls `listener` after every change. Returns the function that stops it. */
export function subscribeStore(listener: (next: StoreState) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function useStore(): StoreState {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    // The state may have changed between the first render and this effect.
    setCurrent(state);
    return () => void listeners.delete(setCurrent);
  }, []);
  return current;
}

/** The app's clock: the device time, plus the test shift from the "Данные" screen. */
export function appNow(): number {
  return Date.now() + state.data.settings.clockShiftDays * DAY_MS;
}

export function updateTrap(id: string, change: (progress: TrapProgress) => TrapProgress): void {
  const before = state.data.traps[id] ?? emptyProgress(id);
  const after = change(before);
  if (after === before) return;
  setData({ ...state.data, traps: { ...state.data.traps, [id]: after } });
  persist(() => db.saveTrap(after));
}

export function logGame(trapId: string, outcome: GameOutcome): void {
  const at = appNow();
  const game: GameEntry = { id: `${at.toString(36)}-${Math.random().toString(36).slice(2, 8)}`, trapId, at, outcome };
  setData({ ...state.data, games: [...state.data.games, game] });
  persist(() => db.saveGame(game));
}

export function removeGame(id: string): void {
  setData({ ...state.data, games: state.data.games.filter((game) => game.id !== id) });
  persist(() => db.deleteGame(id));
}

function saveSettings(settings: Settings): void {
  setData({ ...state.data, settings });
  persist(() => db.saveSettings(settings));
}

export function setClockShift(days: number): void {
  saveSettings({ ...state.data.settings, clockShiftDays: Math.max(0, Math.round(days)) });
}

export function updateSettings(change: Partial<Omit<Settings, 'clockShiftDays'>>): void {
  saveSettings({ ...state.data.settings, ...change });
}

/** Today's record of the daily log, as it is now. */
export function today(now = appNow()): DayRecord {
  const date = dayKey(now);
  return state.data.days[date] ?? emptyDay(date);
}

/** Today's record with one more finished exercise. */
function dayWith(kind: ActivityKind, clean: boolean, now: number): DayRecord {
  return applyActivity(today(now), kind, clean, state.data.settings.dailyNorm, now);
}

/**
 * Records one attempt at a puzzle. `counts` is false for the entry test, which sets the
 * level by its own rule. Only the first attempt at a puzzle counts for the level: a review
 * of a failed puzzle is a repetition, not a measurement. Returns true when this puzzle
 * moved the player one level up.
 */
export function recordPuzzle(id: string, rating: number, result: AttemptResult, counts: boolean): boolean {
  const now = appNow();
  const before = state.data.puzzles[id];
  const clean = result.errors === 0 && result.hints === 0;
  const stat = applyPuzzleStat(before, id, result, now, counts);
  const applied =
    counts && before === undefined
      ? applyPuzzleToLevel(state.data.tactics, rating, clean, now)
      : { tactics: state.data.tactics, levelUp: false };
  const day = dayWith('puzzle', clean, now);
  setData({
    ...state.data,
    puzzles: { ...state.data.puzzles, [id]: stat },
    tactics: applied.tactics,
    days: { ...state.data.days, [day.date]: day },
  });
  persist(() => db.savePuzzle(stat, applied.tactics, day));
  return applied.levelUp;
}

/** Saves the entry test: the level starts from its result. */
export function recordTest(results: boolean[]): TacticsState {
  const tactics = applyTest(results, appNow());
  setData({ ...state.data, tactics });
  persist(() => db.saveTactics(tactics));
  return tactics;
}

function saveTrapRun(id: string, after: TrapProgress, day: DayRecord): void {
  setData({
    ...state.data,
    traps: { ...state.data.traps, [id]: after },
    days: { ...state.data.days, [day.date]: day },
  });
  persist(() => db.saveTrapAndDay(after, day));
}

/** Records one run of a chain step. The first run of a trap makes it today's new trap. */
export function recordChainRun(
  id: string,
  step: Pick<ChainStep, 'kind' | 'depth' | 'key'>,
  length: number,
  result: RunResult,
): void {
  const now = appNow();
  const before = state.data.traps[id] ?? emptyProgress(id);
  const firstRun = before.runs.clean + before.runs.failed === 0 && before.learnedAt === null;
  const day = dayWith('trapStep', isClean(result), now);
  saveTrapRun(id, applyChainRun(before, step, length, result, now), {
    ...day,
    newTrap: firstRun ? (day.newTrap ?? id) : day.newTrap,
  });
}

/**
 * Records a finished game against the bot: today's log, and the level to offer next. A game
 * at another level than the one offered (chosen by hand) moves the offer to that level first.
 */
export function recordBotGame(level: number, result: GameResult, rated = true): number {
  const now = appNow();
  const { settings } = state.data;
  if (!rated) {
    // Counts for the day, leaves the level and its results alone.
    const day = dayWith('game', result === 'win', now);
    setData({ ...state.data, days: { ...state.data.days, [day.date]: day } });
    persist(() => db.saveDay(day));
    return settings.botLevel;
  }
  const sameLevel = level === settings.botLevel;
  const results = [...(sameLevel ? settings.botResults : []), result].slice(-BOT_RESULTS_KEPT);
  const next = nextBotLevel(level, results);
  const after: Settings = { ...settings, botLevel: next, botResults: next === level ? results : [] };
  const day = dayWith('game', result === 'win', now);
  setData({ ...state.data, settings: after, days: { ...state.data.days, [day.date]: day } });
  persist(async () => {
    await db.saveSettings(after);
    await db.saveDay(day);
  });
  return next;
}

/** Records a spaced review of a learned trap. Does nothing when the review is not due. */
export function recordReview(id: string, grade: Grade): void {
  const now = appNow();
  const before = state.data.traps[id] ?? emptyProgress(id);
  const after = applyReview(before, grade, now);
  if (after === before) return;
  saveTrapRun(id, after, dayWith('review', grade === 'good', now));
}

/**
 * Adds exercises made from the player's own games. One that exists already is left as it
 * is, with its history. Returns how many were new.
 */
export function addOwnExercises(exercises: OwnExercise[]): number {
  const now = appNow();
  const fresh = exercises.filter(
    (exercise, index) =>
      state.data.own[exercise.id] === undefined && exercises.findIndex((other) => other.id === exercise.id) === index,
  );
  if (fresh.length === 0) return 0;
  const stats = fresh.map((exercise) => newOwnStat(exercise.id, now));
  const own = { ...state.data.own };
  const puzzles = { ...state.data.puzzles };
  for (const exercise of fresh) own[exercise.id] = exercise;
  for (const stat of stats) puzzles[stat.id] = stat;
  setData({ ...state.data, own, puzzles });
  persist(() => db.saveOwn(fresh, stats));
  return fresh.length;
}

/** Removes exercises from own games, with everything the app remembers about them. */
export function removeOwnExercises(ids: string[]): void {
  if (ids.length === 0) return;
  const own = { ...state.data.own };
  const puzzles = { ...state.data.puzzles };
  for (const id of ids) {
    delete own[id];
    delete puzzles[id];
  }
  setData({ ...state.data, own, puzzles });
  persist(() => db.deleteOwn(ids));
}

/**
 * Stores today's session plan. A plan that exists is kept: the session stays the same all
 * day. An empty plan is not stored, so a later visit can plan again.
 */
export function startSession(plan: SessionItem[]): DayRecord {
  const now = appNow();
  const day = today(now);
  if (day.session !== null || plan.length === 0) return day;
  const next: DayRecord = { ...day, session: plan, updatedAt: now };
  setData({ ...state.data, days: { ...state.data.days, [next.date]: next } });
  persist(() => db.saveDay(next));
  return next;
}

/** Marks one item of the session plan of `date` as finished. */
export function finishSessionItem(date: DayKey, index: number, clean: boolean | null): void {
  const day = state.data.days[date];
  if (!day) return;
  const next = completeItem(day, index, clean, appNow());
  if (next === day) return;
  setData({ ...state.data, days: { ...state.data.days, [date]: next } });
  persist(() => db.saveDay(next));
}

/** Replaces everything with imported data. Resolves to `false` when it could not be saved. */
export async function replaceData(data: AppData): Promise<boolean> {
  if (state.storage === 'saved' || state.storage === 'failed') {
    try {
      await db.replaceAll(data);
    } catch {
      publish({ ...state, storage: 'failed' });
      return false;
    }
  }
  publish({ data, storage: state.storage === 'failed' ? 'saved' : state.storage });
  return true;
}
