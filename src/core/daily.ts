// The daily log, the soft streak and the plan of the daily session. Pure functions over
// plain objects; nothing here reads the clock or the storage by itself.

import {
  TACTICS_LEVELS,
  type PuzzleEntry,
  type PuzzleTheme,
} from '../../shared/puzzle-types.ts';
import { addDays, dayKey, daysBetweenKeys, isDayKey, type DayKey } from './days';
import { duePuzzleIds, themesUpTo, type PuzzleStat } from './tactics';

/** What counts as one finished exercise. */
export type ActivityKind = 'puzzle' | 'trapStep' | 'review';

export type SessionItem =
  /** `warmup` and `new` are puzzles the player has not seen; `review` is a failed one that is due. */
  | { kind: 'puzzle'; id: string; role: 'warmup' | 'new' | 'review'; done: boolean; clean: boolean | null }
  /** A spaced review of a learned trap. */
  | { kind: 'trapReview'; id: string; done: boolean; clean: boolean | null }
  /** The next step of the backward chain of the trap in progress. */
  | { kind: 'trapStep'; id: string; done: boolean; clean: boolean | null };

/** What happened on one local calendar day. */
export interface DayRecord {
  date: DayKey;
  /** Finished exercises of any kind, in the session or outside it. */
  done: number;
  puzzles: number;
  cleanPuzzles: number;
  trapSteps: number;
  reviews: number;
  /** When the daily norm was reached; `null` while it is not. The norm of that moment counts. */
  metAt: number | null;
  /** The trap whose chain was started on this day. At most one new trap a day. */
  newTrap: string | null;
  /** The plan of the daily session; `null` until the session is opened. */
  session: SessionItem[] | null;
  sessionDoneAt: number | null;
  updatedAt: number;
}

export type DailyNorm = 1 | 3 | 5;
export const DAILY_NORMS: readonly DailyNorm[] = [1, 3, 5];

export function emptyDay(date: DayKey): DayRecord {
  return {
    date,
    done: 0,
    puzzles: 0,
    cleanPuzzles: 0,
    trapSteps: 0,
    reviews: 0,
    metAt: null,
    newTrap: null,
    session: null,
    sessionDoneAt: null,
    updatedAt: 0,
  };
}

/** Counts one finished exercise. The norm is checked once: a day that met it stays met. */
export function applyActivity(
  day: DayRecord,
  kind: ActivityKind,
  clean: boolean,
  norm: number,
  now: number,
): DayRecord {
  const done = day.done + 1;
  return {
    ...day,
    done,
    puzzles: day.puzzles + (kind === 'puzzle' ? 1 : 0),
    cleanPuzzles: day.cleanPuzzles + (kind === 'puzzle' && clean ? 1 : 0),
    trapSteps: day.trapSteps + (kind === 'trapStep' ? 1 : 0),
    reviews: day.reviews + (kind === 'review' ? 1 : 0),
    metAt: day.metAt ?? (done >= norm ? now : null),
    updatedAt: now,
  };
}

// --- Streak -------------------------------------------------------------------------------

/** One freeze is earned for every FREEZE_EVERY active days; at most MAX_FREEZES are kept. */
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;

export interface StreakState {
  /** Days in a row, counting days saved by a freeze as "not broken" but not as days. */
  current: number;
  best: number;
  /** Days with the norm met, ever. Never goes down. */
  totalDays: number;
  freezes: number;
  todayDone: boolean;
  /** Days a freeze was spent on. */
  frozen: DayKey[];
  /** Active days left until the next freeze is earned (0 when the store is full). */
  toNextFreeze: number;
}

/** Two sessions less than this apart are "one day after another", whatever the calendar says. */
const TRAVEL_GRACE_MS = 36 * 60 * 60 * 1000;

/**
 * A flight east can skip a local date: practice on the evening of the 14th at home and
 * twenty hours later on the 16th, just after midnight, somewhere else. The 15th has no
 * record, yet no day was missed. A single date without a record does not count as missed
 * when the sessions on both sides of it are less than 36 hours apart.
 */
function skippedByTravel(days: Record<DayKey, DayRecord>, active: DayKey[], key: DayKey): boolean {
  const before = days[addDays(key, -1)]?.metAt;
  const after = days[addDays(key, 1)]?.metAt;
  if (before == null || after == null || !active.includes(addDays(key, 1))) return false;
  return after - before > 0 && after - before < TRAVEL_GRACE_MS;
}

/**
 * The streak, worked out from the log alone, so an imported file or a changed clock cannot
 * leave a stale counter behind. A missed day spends a freeze when there is one; without a
 * freeze the streak quietly starts again. Today never breaks anything: it is still going on.
 * If the log has days after `today` (the clock was moved back), they count as they are.
 */
export function streakState(days: Record<DayKey, DayRecord>, today: DayKey): StreakState {
  const active = Object.keys(days)
    .filter((key) => isDayKey(key) && days[key]?.metAt != null)
    .sort();
  const state: StreakState = {
    current: 0,
    best: 0,
    totalDays: active.length,
    freezes: 0,
    todayDone: days[today]?.metAt != null,
    frozen: [],
    toNextFreeze: FREEZE_EVERY,
  };
  const first = active[0];
  const last = active.at(-1);
  if (first === undefined || last === undefined) return state;

  const isActive = new Set(active);
  const end = last > today ? last : today;
  let counted = 0;
  // A gap longer than the freezes can cover always resets the streak, so it is not walked
  // day by day: after MAX_FREEZES + 1 missed days in a row the loop jumps to the next
  // active day.
  let key = first;
  while (key <= end) {
    if (isActive.has(key)) {
      state.current++;
      counted++;
      if (counted % FREEZE_EVERY === 0) state.freezes = Math.min(MAX_FREEZES, state.freezes + 1);
      state.best = Math.max(state.best, state.current);
    } else if (key !== today || key < end) {
      // A day that is over (or lies before a later record) without the norm.
      if (state.current > 0 && skippedByTravel(days, active, key)) {
        // Not a missed day: the calendar jumped, the player did not.
      } else if (state.current > 0 && state.freezes > 0) {
        state.freezes--;
        state.frozen.push(key);
      } else if (state.current > 0) {
        state.current = 0;
        const next = active.find((candidate) => candidate > key);
        if (next === undefined) break;
        key = next;
        continue;
      }
    }
    key = addDays(key, 1);
  }
  state.toNextFreeze = state.freezes >= MAX_FREEZES ? 0 : FREEZE_EVERY - (counted % FREEZE_EVERY);
  return state;
}

export type DayMark = 'done' | 'frozen' | 'missed' | 'today' | 'none';

/** The last `count` days ending with today, oldest first, for the row of marks on the home screen. */
export function recentDays(
  days: Record<DayKey, DayRecord>,
  today: DayKey,
  count: number,
): { date: DayKey; mark: DayMark }[] {
  const streak = streakState(days, today);
  const frozen = new Set(streak.frozen);
  const firstActive = Object.keys(days)
    .filter((key) => days[key]?.metAt != null)
    .sort()[0];
  const result: { date: DayKey; mark: DayMark }[] = [];
  for (let back = count - 1; back >= 0; back--) {
    const date = addDays(today, -back);
    let mark: DayMark;
    if (days[date]?.metAt != null) mark = 'done';
    else if (date === today) mark = 'today';
    else if (frozen.has(date)) mark = 'frozen';
    else mark = firstActive !== undefined && date > firstActive ? 'missed' : 'none';
    result.push({ date, mark });
  }
  return result;
}

// --- New traps ----------------------------------------------------------------------------

/**
 * At most one new trap a day: a trap whose chain has never been run cannot be started on a
 * day when another trap was started. Traps already in progress are never held back.
 */
export function newTrapHeldBack(
  day: DayRecord | undefined,
  trapId: string,
  trapHasRuns: boolean,
): boolean {
  if (trapHasRuns) return false;
  return day != null && day.newTrap !== null && day.newTrap !== trapId;
}

// --- Session plan -------------------------------------------------------------------------

/** About five minutes: six or seven short exercises. */
export const SESSION_TARGET = 6;
const MAX_PUZZLE_REVIEWS = 2;
const MAX_TRAP_STEPS = 2;
const MIN_NEW_PUZZLES = 2;

export interface SessionInput {
  pool: PuzzleEntry[];
  puzzles: Record<string, PuzzleStat>;
  /** The player's tactics level (0 when the entry test was not taken). */
  level: number;
  /** Learned traps whose review is open, the longest waiting first. */
  dueTraps: string[];
  /** The open trap that is not learned yet and may be practised today, with the steps left. */
  trap: { id: string; stepsLeft: number } | undefined;
  now: number;
  random: () => number;
}

function pick<T>(items: T[], random: () => number): T | undefined {
  return items[Math.min(Math.floor(random() * items.length), items.length - 1)];
}

/** New puzzles of different themes from the band of the level, easiest first. */
function newPuzzles(input: SessionInput, count: number, taken: Set<string>): PuzzleEntry[] {
  const band = TACTICS_LEVELS[input.level] ?? TACTICS_LEVELS[0];
  if (!band) return [];
  const fresh = input.pool.filter(
    (puzzle) =>
      input.puzzles[puzzle.id] === undefined &&
      !taken.has(puzzle.id) &&
      puzzle.rating >= band.min &&
      puzzle.rating < band.max,
  );
  let themes = themesUpTo(input.level);
  const chosen: PuzzleEntry[] = [];
  while (chosen.length < count) {
    if (themes.length === 0) themes = themesUpTo(input.level);
    const theme: PuzzleTheme | undefined = pick(themes, input.random);
    if (!theme) break;
    themes = themes.filter((other) => other !== theme);
    const puzzle = pick(
      fresh.filter((candidate) => candidate.themes.includes(theme) && !chosen.includes(candidate)),
      input.random,
    );
    if (puzzle) chosen.push(puzzle);
    else if (fresh.every((candidate) => chosen.includes(candidate))) break;
  }
  return chosen.sort((a, b) => a.rating - b.rating);
}

/** The easiest kind of puzzle from the lower third of the band: something to start with. */
function warmUp(input: SessionInput, taken: Set<string>): PuzzleEntry | undefined {
  const band = TACTICS_LEVELS[input.level] ?? TACTICS_LEVELS[0];
  if (!band) return undefined;
  const top = band.min + (band.max - band.min) / 3;
  const easy = input.pool.filter(
    (puzzle) =>
      input.puzzles[puzzle.id] === undefined &&
      !taken.has(puzzle.id) &&
      puzzle.rating >= band.min &&
      puzzle.rating < top &&
      puzzle.moves.split(' ').length <= 4,
  );
  return pick(easy, input.random);
}

/**
 * Today's session. A warm-up puzzle, then what is due (one trap review, up to two failed
 * puzzles), then up to two steps of the trap in progress, then new puzzles from easy to
 * hard. What the day holds decides the shape, so sessions differ from day to day.
 */
export function planSession(input: SessionInput): SessionItem[] {
  const items: SessionItem[] = [];
  const taken = new Set<string>();

  const first = warmUp(input, taken);
  if (first) {
    taken.add(first.id);
    items.push({ kind: 'puzzle', id: first.id, role: 'warmup', done: false, clean: null });
  }

  const dueTrap = input.dueTraps[0];
  if (dueTrap !== undefined) items.push({ kind: 'trapReview', id: dueTrap, done: false, clean: null });

  const known = new Set(input.pool.map((puzzle) => puzzle.id));
  for (const id of duePuzzleIds(input.puzzles, input.now).filter((due) => known.has(due)).slice(0, MAX_PUZZLE_REVIEWS)) {
    taken.add(id);
    items.push({ kind: 'puzzle', id, role: 'review', done: false, clean: null });
  }

  if (input.trap && input.trap.stepsLeft > 0 && input.trap.id !== dueTrap) {
    for (let step = 0; step < Math.min(MAX_TRAP_STEPS, input.trap.stepsLeft); step++) {
      items.push({ kind: 'trapStep', id: input.trap.id, done: false, clean: null });
    }
  }

  const wanted = Math.max(MIN_NEW_PUZZLES, SESSION_TARGET - items.length);
  for (const puzzle of newPuzzles(input, wanted, taken)) {
    items.push({ kind: 'puzzle', id: puzzle.id, role: 'new', done: false, clean: null });
  }
  return items;
}

export type SessionShape = 'trap' | 'review' | 'puzzles';

/** What today's session is mostly about, for its title. */
export function sessionShape(items: SessionItem[]): SessionShape {
  if (items.some((item) => item.kind === 'trapStep')) return 'trap';
  const reviews = items.filter(
    (item) => item.kind === 'trapReview' || (item.kind === 'puzzle' && item.role === 'review'),
  ).length;
  return reviews > 0 ? 'review' : 'puzzles';
}

export function sessionProgress(items: SessionItem[] | null): { done: number; total: number } {
  return { done: items?.filter((item) => item.done).length ?? 0, total: items?.length ?? 0 };
}

/** Marks one item of the plan as finished. The session is over when every item is. */
export function completeItem(day: DayRecord, index: number, clean: boolean, now: number): DayRecord {
  const current = day.session?.[index];
  if (!day.session || !current || current.done) return day;
  const session = day.session.map((item, at) => (at === index ? { ...item, done: true, clean } : item));
  return {
    ...day,
    session,
    sessionDoneAt: day.sessionDoneAt ?? (session.every((item) => item.done) ? now : null),
    updatedAt: now,
  };
}

// --- Backup hint --------------------------------------------------------------------------

/** A gentle hint once a month: the progress lives on this device only. */
export const BACKUP_EVERY_DAYS = 30;

export function backupHintDue(
  settings: { lastBackupAt: number | null; backupSnoozedUntil: number | null },
  days: Record<DayKey, DayRecord>,
  now: number,
): boolean {
  if (settings.backupSnoozedUntil !== null && now < settings.backupSnoozedUntil) return false;
  const today = dayKey(now);
  if (settings.lastBackupAt !== null) {
    return daysBetweenKeys(dayKey(settings.lastBackupAt), today) >= BACKUP_EVERY_DAYS;
  }
  // Never saved: the hint waits until there is a month of practice worth keeping.
  const first = Object.keys(days).filter(isDayKey).sort()[0];
  return first !== undefined && daysBetweenKeys(first, today) >= BACKUP_EVERY_DAYS;
}
