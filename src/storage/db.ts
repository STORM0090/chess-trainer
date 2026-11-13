// IndexedDB through idb. Three stores; every record is a plain object from core/progress.ts.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  emptyData,
  emptyProgress,
  type AppData,
  type GameEntry,
  type Settings,
  type TrapProgress,
} from '../core/progress';

const DB_NAME = 'chess-trainer';
const DB_VERSION = 1;
const SETTINGS_KEY = 'settings';

interface Schema extends DBSchema {
  traps: { key: string; value: TrapProgress };
  games: { key: string; value: GameEntry };
  settings: { key: string; value: Settings };
}

let opening: Promise<IDBPDatabase<Schema>> | undefined;

function database(): Promise<IDBPDatabase<Schema>> {
  opening ??= openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('traps', { keyPath: 'id' });
      db.createObjectStore('games', { keyPath: 'id' });
      db.createObjectStore('settings');
    },
  });
  return opening;
}

export async function loadAll(): Promise<AppData> {
  const db = await database();
  const tx = db.transaction(['traps', 'games', 'settings']);
  const [traps, games, settings] = await Promise.all([
    tx.objectStore('traps').getAll(),
    tx.objectStore('games').getAll(),
    tx.objectStore('settings').get(SETTINGS_KEY),
  ]);
  await tx.done;
  const data = emptyData();
  // Records written by an older build may lack fields that were added later.
  for (const trap of traps) data.traps[trap.id] = { ...emptyProgress(trap.id), ...trap };
  data.games = games.sort((a, b) => a.at - b.at);
  if (settings) data.settings = { ...data.settings, ...settings };
  return data;
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
  const tx = db.transaction(['traps', 'games', 'settings'], 'readwrite');
  const traps = tx.objectStore('traps');
  const games = tx.objectStore('games');
  const settings = tx.objectStore('settings');
  await Promise.all([traps.clear(), games.clear(), settings.clear()]);
  await Promise.all([
    ...Object.values(data.traps).map((trap) => traps.put(trap)),
    ...data.games.map((game) => games.put(game)),
    settings.put(data.settings, SETTINGS_KEY),
  ]);
  await tx.done;
}
