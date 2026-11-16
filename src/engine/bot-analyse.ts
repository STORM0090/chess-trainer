// The engine in a Web Worker as the bot's "analyse" function. One engine for the whole app,
// started on first use and kept, so a game does not reload 1.9 MB for every move.

import { parseCandidates, type Analyse } from '../../shared/bot/policy.ts';
import { engineScriptUrl } from './engine-files';
import { UciEngine } from './uci-client';

/**
 * No search may take longer than this, whatever the node count: on a slow or hot phone the
 * engine stops early and the bot plays a little weaker instead of making the player wait.
 */
export const MOVE_TIME_LIMIT_MS = 1500;

let starting: Promise<UciEngine> | undefined;
/** Searches run one after another: the engine can do one at a time. */
let queue: Promise<unknown> = Promise.resolve();

function engine(): Promise<UciEngine> {
  if (!starting) {
    const attempt = (async () => {
      const uci = new UciEngine(engineScriptUrl());
      await uci.init();
      return uci;
    })();
    starting = attempt;
    // A failed start (offline before the engine was ever cached) can be tried again later.
    attempt.catch(() => {
      if (starting === attempt) starting = undefined;
    });
  }
  return starting;
}

/** Starts the engine early, so the first move of the bot does not wait for the download. */
export function warmUpEngine(): Promise<void> {
  return engine().then(() => undefined);
}

/**
 * Drops the engine after a failure (the worker crashed, or a search timed out and may still
 * be running): the next search starts a fresh worker instead of waiting on a dead one.
 */
function discard(uci: UciEngine): void {
  uci.terminate();
  void starting?.then((current) => {
    if (current === uci) starting = undefined;
  });
}

export const browserAnalyse: Analyse = (fen, { nodes, multipv }) => {
  const run = queue.then(async () => {
    const uci = await engine();
    try {
      const lines = await uci.lines(fen, { nodes, movetime: MOVE_TIME_LIMIT_MS }, multipv);
      return parseCandidates(lines);
    } catch (error) {
      discard(uci);
      throw error;
    }
  });
  queue = run.catch(() => undefined);
  return run;
};
