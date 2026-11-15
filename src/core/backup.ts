// The progress file for export and import. It is plain JSON with a format number, and every
// field is checked on the way in: an imported file replaces what is on the device.

import { DAILY_NORMS, type DailyNorm, type DayRecord, type SessionItem } from './daily';
import { isDayKey, type DayKey } from './days';
import { isReminderTime } from './ics';
import {
  defaultSettings,
  type AppData,
  type GameEntry,
  type GameOutcome,
  type LineStat,
  type Settings,
  type TrapProgress,
} from './progress';
import type { StoredCard } from './schedule';
import {
  emptyTactics,
  migratePuzzleStat,
  TEST_SIZE,
  type PuzzleStat,
  type TacticsState,
  type TestRecord,
} from './tactics';
import { TOP_LEVEL } from '../../shared/puzzle-types.ts';

export const BACKUP_APP = 'chess-trainer';
/**
 * Format 2 (M4) added puzzles and the tactics level. Format 3 (M5) added the daily log, the
 * FSRS cards of failed puzzles and new settings. Older files are still read and brought up
 * to the current shape.
 */
export const BACKUP_FORMAT = 3;

export interface BackupFile {
  app: typeof BACKUP_APP;
  format: number;
  /** ISO date and time of the export. */
  exportedAt: string;
  appVersion: string;
  data: AppData;
}

export function makeBackup(data: AppData, now: number, appVersion: string): BackupFile {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: new Date(now).toISOString(),
    appVersion,
    data,
  };
}

/** "chess-trainer-2026-11-14.json", by the local date. */
export function backupFileName(now: number): string {
  const date = new Date(now);
  const two = (value: number) => String(value).padStart(2, '0');
  return `${BACKUP_APP}-${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}.json`;
}

export type BackupProblem =
  /** Not JSON at all. */
  | 'notJson'
  /** JSON, but not a file made by this app. */
  | 'notBackup'
  /** Made by a newer version of the app. */
  | 'newerFormat'
  /** A field is missing or has the wrong type. */
  | 'damaged';

export type ParsedBackup =
  | { ok: true; data: AppData; exportedAt: string; appVersion: string }
  | { ok: false; problem: BackupProblem };

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** The largest time a Date can hold. Anything above is not a real time. */
const MAX_TIME = 8.64e15;

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_TIME;
}

function isTimeOrNull(value: unknown): value is number | null {
  return value === null || isTime(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value);
}

const CARD_NUMBERS = ['stability', 'stabilityFast', 'difficulty', 'state', 'reps', 'lapses', 'scheduledDays', 'learningStep'];

/**
 * An FSRS card. Every number must be finite, the learning state one of the four FSRS states,
 * stability positive and the counters whole: a card the scheduler cannot work with would
 * fail later, in the middle of an exercise. Only the known fields are copied.
 */
function readCard(value: unknown): StoredCard | null | undefined {
  if (value === null) return null;
  if (!isObject(value)) return undefined;
  for (const name of CARD_NUMBERS) {
    const field = value[name];
    if (typeof field !== 'number' || !Number.isFinite(field)) return undefined;
  }
  const card = value as unknown as StoredCard;
  if (!Number.isInteger(card.state) || card.state < 0 || card.state > 3) return undefined;
  if (!(card.stability > 0) || card.difficulty < 0 || card.stabilityFast < 0) return undefined;
  if (!isCount(card.reps) || !isCount(card.lapses) || !isCount(card.learningStep)) return undefined;
  if (card.scheduledDays < 0) return undefined;
  if (!isTime(value.dueAt) || !isTimeOrNull(value.lastReviewAt)) return undefined;
  if (typeof value.cardId !== 'string' || value.cardId.length > 80) return undefined;
  if (typeof value.scheduleStatus !== 'string' || !/^[a-z]{1,20}$/.test(value.scheduleStatus)) return undefined;
  return {
    cardId: card.cardId,
    stability: card.stability,
    stabilityFast: card.stabilityFast,
    difficulty: card.difficulty,
    state: card.state,
    scheduleStatus: card.scheduleStatus,
    dueAt: card.dueAt,
    lastReviewAt: card.lastReviewAt,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduledDays,
    learningStep: card.learningStep,
  };
}

function readLines(value: unknown): Record<string, LineStat> | undefined {
  if (!isObject(value)) return undefined;
  const lines: Record<string, LineStat> = {};
  for (const [key, stat] of Object.entries(value)) {
    if (!/^[0-9a-f]{8}$/.test(key) || !isObject(stat)) return undefined;
    if (!isCount(stat.clean) || !isCount(stat.failed) || typeof stat.skipped !== 'boolean') return undefined;
    lines[key] = { clean: stat.clean, failed: stat.failed, skipped: stat.skipped };
  }
  return lines;
}

function readTrap(id: string, value: unknown): TrapProgress | undefined {
  if (!isObject(value) || value.id !== id || !isId(id)) return undefined;
  const lines = readLines(value.lines);
  const card = readCard(value.card);
  const runs = value.runs;
  if (!lines || card === undefined || !isObject(runs)) return undefined;
  if (!isCount(runs.clean) || !isCount(runs.failed)) return undefined;
  if (!isCount(value.chainDepth) || !isCount(value.reviews) || !isTime(value.updatedAt)) return undefined;
  if (
    !isTimeOrNull(value.seenAt) ||
    !isTimeOrNull(value.learnedAt) ||
    // Added after the first files were written: a file without the field means "not marked".
    !(value.knownAt === undefined || isTimeOrNull(value.knownAt)) ||
    !isTimeOrNull(value.dueAt) ||
    !isTimeOrNull(value.masteredAt)
  ) {
    return undefined;
  }
  return {
    id,
    seenAt: value.seenAt,
    chainDepth: value.chainDepth,
    lines,
    runs: { clean: runs.clean, failed: runs.failed },
    learnedAt: value.learnedAt,
    knownAt: value.knownAt ?? null,
    card,
    dueAt: value.dueAt,
    reviews: value.reviews,
    masteredAt: value.masteredAt,
    updatedAt: value.updatedAt,
  };
}

const OUTCOMES: GameOutcome[] = ['worked', 'declined', 'refuted'];

function readGame(value: unknown): GameEntry | undefined {
  if (!isObject(value)) return undefined;
  const { id, trapId, at, outcome } = value;
  if (typeof id !== 'string' || id.length === 0 || id.length > 80) return undefined;
  if (!isId(trapId) || !isTime(at)) return undefined;
  if (!OUTCOMES.includes(outcome as GameOutcome)) return undefined;
  return { id, trapId, at, outcome: outcome as GameOutcome };
}

function readSettings(value: unknown, format: number): Settings | undefined {
  if (!isObject(value)) return undefined;
  const shift = value.clockShiftDays;
  if (!isCount(shift) || shift > 3650) return undefined;
  // Formats 1 and 2 had the test clock only.
  if (format < 3) return { ...defaultSettings(), clockShiftDays: shift };
  if (!DAILY_NORMS.includes(value.dailyNorm as DailyNorm) || !isReminderTime(value.reminderTime)) return undefined;
  if (!isTimeOrNull(value.lastBackupAt) || !isTimeOrNull(value.backupSnoozedUntil)) return undefined;
  return {
    clockShiftDays: shift,
    dailyNorm: value.dailyNorm as DailyNorm,
    reminderTime: value.reminderTime,
    lastBackupAt: value.lastBackupAt,
    backupSnoozedUntil: value.backupSnoozedUntil,
  };
}

const PUZZLE_ID = /^[A-Za-z0-9]{1,12}$/;

function readSessionItem(value: unknown): SessionItem | undefined {
  if (!isObject(value) || typeof value.done !== 'boolean') return undefined;
  if (!(value.clean === null || typeof value.clean === 'boolean')) return undefined;
  const { done, clean } = value;
  if (value.kind === 'puzzle') {
    const role = value.role;
    if (typeof value.id !== 'string' || !PUZZLE_ID.test(value.id)) return undefined;
    if (role !== 'warmup' && role !== 'new' && role !== 'review') return undefined;
    return { kind: 'puzzle', id: value.id, role, done, clean };
  }
  if ((value.kind === 'trapReview' || value.kind === 'trapStep') && isId(value.id)) {
    return { kind: value.kind, id: value.id, done, clean };
  }
  return undefined;
}

function readDay(date: string, value: unknown): DayRecord | undefined {
  if (!isDayKey(date) || !isObject(value) || value.date !== date) return undefined;
  const counts = [value.done, value.puzzles, value.cleanPuzzles, value.trapSteps, value.reviews];
  if (!counts.every(isCount)) return undefined;
  if (!isTimeOrNull(value.metAt) || !isTimeOrNull(value.sessionDoneAt) || !isTime(value.updatedAt)) return undefined;
  if (!(value.newTrap === null || isId(value.newTrap))) return undefined;
  let session: SessionItem[] | null = null;
  if (value.session !== null) {
    if (!Array.isArray(value.session) || value.session.length > 40) return undefined;
    session = [];
    for (const raw of value.session) {
      const item = readSessionItem(raw);
      if (!item) return undefined;
      session.push(item);
    }
  }
  return {
    date,
    done: value.done as number,
    puzzles: value.puzzles as number,
    cleanPuzzles: value.cleanPuzzles as number,
    trapSteps: value.trapSteps as number,
    reviews: value.reviews as number,
    metAt: value.metAt,
    newTrap: value.newTrap,
    session,
    sessionDoneAt: value.sessionDoneAt,
    updatedAt: value.updatedAt,
  };
}

function isLevel(value: unknown): value is number {
  return isCount(value) && value <= TOP_LEVEL;
}

function isResults(value: unknown, max: number): value is boolean[] {
  return Array.isArray(value) && value.length <= max && value.every((item) => typeof item === 'boolean');
}

function readPuzzle(id: string, value: unknown, format: number): PuzzleStat | undefined {
  if (!isObject(value) || value.id !== id || !PUZZLE_ID.test(id)) return undefined;
  if (!isCount(value.attempts) || !isCount(value.clean) || value.clean > value.attempts) return undefined;
  if (!isTime(value.lastAt) || typeof value.lastClean !== 'boolean') return undefined;
  const base = { id, attempts: value.attempts, clean: value.clean, lastAt: value.lastAt, lastClean: value.lastClean };
  // Format 2 had no cards: a puzzle failed last time gets one, due as the old rule had it.
  if (format < 3) return migratePuzzleStat(base);
  const card = readCard(value.card);
  if (card === undefined || !isTimeOrNull(value.dueAt)) return undefined;
  // A due date belongs to a card, and a card always has one.
  if ((card === null) !== (value.dueAt === null)) return undefined;
  return { ...base, card, dueAt: value.dueAt };
}

function readTest(value: unknown): TestRecord | null | undefined {
  if (value === null) return null;
  if (!isObject(value) || !isTime(value.at) || !isLevel(value.level)) return undefined;
  if (!isResults(value.results, TEST_SIZE)) return undefined;
  return { at: value.at, results: value.results, level: value.level };
}

function readTactics(value: unknown): TacticsState | undefined {
  if (!isObject(value) || !isTime(value.updatedAt)) return undefined;
  const test = readTest(value.test);
  if (test === undefined || !(value.level === null || isLevel(value.level))) return undefined;
  if (!isResults(value.recent, 1000)) return undefined;
  return { level: value.level, test, recent: value.recent, updatedAt: value.updatedAt };
}

function readData(value: unknown, format: number): AppData | undefined {
  if (!isObject(value) || !isObject(value.traps) || !Array.isArray(value.games)) return undefined;
  const traps: Record<string, TrapProgress> = {};
  for (const [id, raw] of Object.entries(value.traps)) {
    const trap = readTrap(id, raw);
    if (!trap) return undefined;
    traps[id] = trap;
  }
  const games: GameEntry[] = [];
  for (const raw of value.games) {
    const game = readGame(raw);
    if (!game) return undefined;
    games.push(game);
  }
  const settings = readSettings(value.settings, format);
  if (!settings) return undefined;
  // Format 1 was written before puzzles existed.
  if (format < 2) return { traps, games, settings, puzzles: {}, tactics: emptyTactics(), days: {} };
  if (!isObject(value.puzzles)) return undefined;
  const puzzles: Record<string, PuzzleStat> = {};
  for (const [id, raw] of Object.entries(value.puzzles)) {
    const puzzle = readPuzzle(id, raw, format);
    if (!puzzle) return undefined;
    puzzles[id] = puzzle;
  }
  const tactics = readTactics(value.tactics);
  if (!tactics) return undefined;
  // Format 2 was written before the daily log existed: the streak starts from the import.
  if (format < 3) return { traps, games, settings, puzzles, tactics, days: {} };
  if (!isObject(value.days)) return undefined;
  const days: Record<DayKey, DayRecord> = {};
  for (const [date, raw] of Object.entries(value.days)) {
    const day = readDay(date, raw);
    if (!day) return undefined;
    days[date] = day;
  }
  return { traps, games, settings, puzzles, tactics, days };
}

/**
 * Reads a progress file. Progress for traps and puzzles this version does not know is kept
 * as it is.
 */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'notJson' };
  }
  if (!isObject(raw) || raw.app !== BACKUP_APP || typeof raw.format !== 'number') {
    return { ok: false, problem: 'notBackup' };
  }
  if (raw.format > BACKUP_FORMAT) return { ok: false, problem: 'newerFormat' };
  const known = Number.isInteger(raw.format) && raw.format >= 1 && raw.format <= BACKUP_FORMAT;
  const data = known ? readData(raw.data, raw.format) : undefined;
  if (!data || typeof raw.exportedAt !== 'string' || typeof raw.appVersion !== 'string') {
    return { ok: false, problem: 'damaged' };
  }
  return { ok: true, data, exportedAt: raw.exportedAt, appVersion: raw.appVersion };
}
