// The bundled lite single-threaded Stockfish as an "analyse" function for the bot policy.
// The same engine file the app ships, driven with a fixed node count and a cleared hash, so
// an answer depends only on the position and the limits and can be cached by FEN.

import { createRequire } from 'node:module';
import { parseCandidates, type Analyse, type Candidate } from '../../shared/bot/policy.ts';

const require = createRequire(import.meta.url);

interface RawEngine {
  listener?: (line: string) => void;
  processCommand(command: string): void;
  terminate?(): void;
}

export interface BotEngine {
  analyse: Analyse;
  /** Lines the engine printed for `uci`: its name and options. */
  identity: string[];
  /** Searches done and answers served from the cache. */
  stats: { searches: number; cached: number };
  setOption(name: string, value: string | number): void;
  quit(): void;
}

export async function startBotEngine(cache = new Map<string, Candidate[]>()): Promise<BotEngine> {
  const init = require('stockfish') as (flavour: string) => RawEngine;
  const raw = init('lite-single');
  let waiting: { done: (line: string) => boolean; resolve: (lines: string[]) => void; lines: string[] } | undefined;
  raw.listener = (text) => {
    for (const line of String(text).split('\n')) {
      if (line.length === 0 || !waiting) continue;
      waiting.lines.push(line);
      if (waiting.done(line)) {
        const { resolve, lines } = waiting;
        waiting = undefined;
        resolve(lines);
      }
    }
  };
  const exchange = (command: string, done: (line: string) => boolean) =>
    new Promise<string[]>((resolve) => {
      waiting = { done, resolve, lines: [] };
      raw.processCommand(command);
    });

  const identity = (await exchange('uci', (line) => line === 'uciok')).filter(
    (line) => line.startsWith('id ') || line.startsWith('option '),
  );
  raw.processCommand('setoption name Hash value 16');
  await exchange('isready', (line) => line === 'readyok');

  const stats = { searches: 0, cached: 0 };
  // Options changed from their defaults, as part of the cache key.
  const changed = new Map<string, string>();
  let options = '';
  const analyse: Analyse = async (fen, { nodes, multipv }) => {
    const key = `${options}|${nodes}|${multipv}|${fen}`;
    const known = cache.get(key);
    if (known) {
      stats.cached++;
      return known;
    }
    stats.searches++;
    raw.processCommand(`setoption name MultiPV value ${multipv}`);
    // A new game clears the hash: the answer must not depend on what was searched before.
    raw.processCommand('ucinewgame');
    raw.processCommand(`position fen ${fen}`);
    const lines = await exchange(`go nodes ${nodes}`, (line) => line.startsWith('bestmove'));
    const candidates = parseCandidates(lines);
    cache.set(key, candidates);
    return candidates;
  };

  return {
    analyse,
    identity,
    stats,
    setOption(name, value) {
      if (changed.get(name) === String(value)) return;
      raw.processCommand(`setoption name ${name} value ${value}`);
      changed.set(name, String(value));
      options = [...changed.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([key, text]) => `${key}=${text}`)
        .join(';');
    },
    quit: () => raw.terminate?.(),
  };
}
