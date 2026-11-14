// Puzzle content. Unlike the traps it is loaded on first use: the file is a separate chunk,
// and the service worker caches it on install together with the rest of the app, so puzzles
// work offline.

import { useEffect, useState } from 'preact/hooks';
import type { PuzzleEntry, PuzzleFile } from '../../shared/puzzle-types.ts';

const loaders = import.meta.glob<PuzzleFile>('../../content/puzzles/*.json', { import: 'default' });

let loading: Promise<PuzzleEntry[]> | undefined;

/** Every puzzle of every source file. Loaded once; a failed load can be tried again. */
export function loadPuzzles(): Promise<PuzzleEntry[]> {
  if (!loading) {
    const attempt = Promise.all(Object.values(loaders).map((load) => load())).then((files) =>
      files.flatMap((file) => file.puzzles),
    );
    loading = attempt;
    attempt.catch(() => {
      if (loading === attempt) loading = undefined;
    });
  }
  return loading;
}

export type PuzzlePool =
  | { state: 'loading' }
  | { state: 'failed' }
  | { state: 'ready'; puzzles: PuzzleEntry[] };

export function usePuzzles(): PuzzlePool {
  const [pool, setPool] = useState<PuzzlePool>({ state: 'loading' });
  useEffect(() => {
    let alive = true;
    loadPuzzles().then(
      (puzzles) => alive && setPool({ state: 'ready', puzzles }),
      () => alive && setPool({ state: 'failed' }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return pool;
}
