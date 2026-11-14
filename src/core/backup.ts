// The progress file for export and import. It is plain JSON with a format number, and every
// field is checked on the way in: an imported file replaces what is on the device.

import type { AppData, GameEntry, GameOutcome, LineStat, Settings, TrapProgress } from './progress';
import type { StoredCard } from './schedule';

export const BACKUP_APP = 'chess-trainer';
export const BACKUP_FORMAT = 1;

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

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isTimeOrNull(value: unknown): value is number | null {
  return value === null || isTime(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value);
}

const CARD_NUMBERS = ['stability', 'stabilityFast', 'difficulty', 'state', 'reps', 'lapses', 'scheduledDays', 'learningStep'];

function readCard(value: unknown): StoredCard | null | undefined {
  if (value === null) return null;
  if (!isObject(value)) return undefined;
  for (const name of CARD_NUMBERS) {
    const field = value[name];
    if (typeof field !== 'number' || !Number.isFinite(field)) return undefined;
  }
  if (!isTime(value.dueAt) || !isTimeOrNull(value.lastReviewAt)) return undefined;
  if (typeof value.cardId !== 'string' || typeof value.scheduleStatus !== 'string') return undefined;
  return value as unknown as StoredCard;
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

function readSettings(value: unknown): Settings | undefined {
  if (!isObject(value)) return undefined;
  const shift = value.clockShiftDays;
  if (!isCount(shift) || shift > 3650) return undefined;
  return { clockShiftDays: shift };
}

function readData(value: unknown): AppData | undefined {
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
  const settings = readSettings(value.settings);
  return settings ? { traps, games, settings } : undefined;
}

/** Reads a progress file. Progress for traps this version does not know is kept as it is. */
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
  const data = raw.format === BACKUP_FORMAT ? readData(raw.data) : undefined;
  if (!data || typeof raw.exportedAt !== 'string' || typeof raw.appVersion !== 'string') {
    return { ok: false, problem: 'damaged' };
  }
  return { ok: true, data, exportedAt: raw.exportedAt, appVersion: raw.appVersion };
}
