// IndexedDB through idb. Four stores; every record is a plain object from core/progress.ts
// or core/tactics.ts.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  emptyData,
  emptyProgress,
  type AppData,
  type GameEntry,
  type Settings,
  type TrapProgress,
} from '../core/progress';
import type { PuzzleStat, TacticsState } from '../core/tactics';
import { DATABASE_NAME } from '../build-info';

/** Each preview has a database of its own; the site root and the APK keep `chess-trainer`. */
const DB_NAME = DATABASE_NAME;
/** Version 2 added the `puzzles` store; the tactics level lives in `settings` under its own key. */
const DB_VERSION = 2;
const SETTINGS_KEY = 'settings';
const TACTICS_KEY = 'tactics';

interface Schema extends DBSchema {
  traps: { key: string; value: TrapProgress };
  games: { key: string; value: GameEntry };
  settings: { key: string; value: Settings | TacticsState };
  puzzles: { key: string; value: PuzzleStat };
}

const STORES = ['traps', 'games', 'settings', 'puzzles'] as const;

let opening: Promise<IDBPDatabase<Schema>> | undefined;

export interface DatabaseInfo {
  name: string;
  /** The version found in the browser; `null` until the database was opened. */
  version: number | null;
  /** The version this build knows. */
  known: number;
}

let found: number | null = null;

/** For the diagnostics page. */
export function databaseInfo(): DatabaseInfo {
  return { name: DB_NAME, version: found, known: DB_VERSION };
}

/** True for the error of opening a database that a newer build has upgraded. */
export function isNewerDatabase(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'VersionError';
}

function database(): Promise<IDBPDatabase<Schema>> {
  opening ??= openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('traps', { keyPath: 'id' });
        db.createObjectStore('games', { keyPath: 'id' });
        db.createObjectStore('settings');
      }
      if (oldVersion < 2) db.createObjectStore('puzzles', { keyPath: 'id' });
    },
  });
  return opening;
}

export async function loadAll(): Promise<AppData> {
  const db = await database();
  found = db.version;
  return readAll(db);
}

/**
 * Reads a database that a newer build has upgraded, without changing it: opened at its own
 * version, so nothing is upgraded, and closed again. Newer builds only add stores, so every
 * store this build knows is there. The caller keeps the result in memory, read-only.
 */
export async function loadNewer(): Promise<AppData> {
  const db = await openDB<Schema>(DB_NAME);
  try {
    found = db.version;
    return await readAll(db);
  } finally {
    db.close();
  }
}

async function readAll(db: IDBPDatabase<Schema>): Promise<AppData> {
  const tx = db.transaction(STORES);
  const [traps, games, settings, tactics, puzzles] = await Promise.all([
    tx.objectStore('traps').getAll(),
    tx.objectStore('games').getAll(),
    tx.objectStore('settings').get(SETTINGS_KEY) as Promise<Settings | undefined>,
    tx.objectStore('settings').get(TACTICS_KEY) as Promise<TacticsState | undefined>,
    tx.objectStore('puzzles').getAll(),
  ]);
  await tx.done;
  const data = emptyData();
  // Records written by an older build may lack fields that were added later.
  for (const trap of traps) data.traps[trap.id] = { ...emptyProgress(trap.id), ...trap };
  data.games = games.sort((a, b) => a.at - b.at);
  if (settings) data.settings = { ...data.settings, ...settings };
  if (tactics) data.tactics = { ...data.tactics, ...tactics };
  for (const puzzle of puzzles) data.puzzles[puzzle.id] = puzzle;
  return data;
}

/** A solved or failed puzzle and what it did to the level, in one transaction. */
export async function savePuzzle(puzzle: PuzzleStat, tactics: TacticsState): Promise<void> {
  const db = await database();
  const tx = db.transaction(['puzzles', 'settings'], 'readwrite');
  await Promise.all([
    tx.objectStore('puzzles').put(puzzle),
    tx.objectStore('settings').put(tactics, TACTICS_KEY),
  ]);
  await tx.done;
}

export async function saveTactics(tactics: TacticsState): Promise<void> {
  await (await database()).put('settings', tactics, TACTICS_KEY);
}

export async function saveTrap(trap: TrapProgress): Promise<void> {
  await (await database()).put('traps', trap);
}

export async function saveGame(game: GameEntry): Promise<void> {
  await (await database()).put('games', game);
}

export async function deleteGame(id: string): Promise<void> {
  await (await database()).delete('games', id);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await database()).put('settings', settings, SETTINGS_KEY);
}

/** Replaces everything in one transaction: either the whole import lands or nothing does. */
export async function replaceAll(data: AppData): Promise<void> {
  const db = await database();
  const tx = db.transaction(STORES, 'readwrite');
  const traps = tx.objectStore('traps');
  const games = tx.objectStore('games');
  const settings = tx.objectStore('settings');
  const puzzles = tx.objectStore('puzzles');
  await Promise.all([traps.clear(), games.clear(), settings.clear(), puzzles.clear()]);
  await Promise.all([
    ...Object.values(data.traps).map((trap) => traps.put(trap)),
    ...data.games.map((game) => games.put(game)),
    ...Object.values(data.puzzles).map((puzzle) => puzzles.put(puzzle)),
    settings.put(data.settings, SETTINGS_KEY),
    settings.put(data.tactics, TACTICS_KEY),
  ]);
  await tx.done;
}
