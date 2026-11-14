// The app's saved state in memory. Screens read it through `useAppData` and change it through
// the functions below; every change is written to IndexedDB right away.

import { useEffect, useState } from 'preact/hooks';
import { DAY_MS } from '../core/days';
import {
  emptyData,
  emptyProgress,
  type AppData,
  type GameEntry,
  type GameOutcome,
  type TrapProgress,
} from '../core/progress';
import * as db from './db';

export interface StoreState {
  data: AppData;
  /**
   * `saved`: changes reach IndexedDB. `memory`: the database could not be opened (for example
   * a private window), progress lives until the page is closed. `failed`: a write failed.
   */
  storage: 'saved' | 'memory' | 'failed';
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
  if (state.storage === 'memory') return;
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
  try {
    publish({ data: await db.loadAll(), storage: 'saved' });
  } catch {
    publish({ data: emptyData(), storage: 'memory' });
  }
}

export function getStore(): StoreState {
  return state;
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

export function setClockShift(days: number): void {
  const settings = { ...state.data.settings, clockShiftDays: Math.max(0, Math.round(days)) };
  setData({ ...state.data, settings });
  persist(() => db.saveSettings(settings));
}

/** Replaces everything with imported data. Resolves to `false` when it could not be saved. */
export async function replaceData(data: AppData): Promise<boolean> {
  if (state.storage !== 'memory') {
    try {
      await db.replaceAll(data);
    } catch {
      publish({ ...state, storage: 'failed' });
      return false;
    }
  }
  publish({ data, storage: state.storage === 'memory' ? 'memory' : 'saved' });
  return true;
}
