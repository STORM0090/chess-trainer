// Stockfish in Node for the verify script. Uses the pinned `stockfish` npm package.
// The engine runs synchronously inside processCommand, so listeners are attached before sending.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Score from the point of view of the side to move. Exactly one field is set. */
export interface EngineScore {
  cp?: number;
  /** Mate in N moves; negative when the side to move is being mated. */
  mate?: number;
}

export interface EngineResult {
  score: EngineScore;
  best: string;
}

export type EngineFlavour = 'single' | 'lite-single';

interface RawEngine {
  listener?: (line: string) => void;
  processCommand(command: string): void;
  terminate?(): void;
}

export function enginePackageVersion(): string {
  const path = require.resolve('stockfish/package.json');
  return (JSON.parse(readFileSync(path, 'utf8')) as { version: string }).version;
}

export class Engine {
  private readonly raw: RawEngine;
  private readonly listeners = new Set<(line: string) => void>();

  private constructor(raw: RawEngine) {
    this.raw = raw;
    raw.listener = (text) => {
      for (const line of String(text).split('\n')) {
        if (line.length > 0) this.listeners.forEach((listener) => listener(line));
      }
    };
  }

  static async start(flavour: EngineFlavour, hashMb: number): Promise<Engine> {
    const init = require('stockfish') as (flavour: string) => RawEngine;
    const engine = new Engine(init(flavour));
    await engine.exchange('uci', (line) => line === 'uciok');
    engine.raw.processCommand('setoption name Threads value 1');
    engine.raw.processCommand(`setoption name Hash value ${hashMb}`);
    await engine.exchange('isready', (line) => line === 'readyok');
    return engine;
  }

  /** Searches a position with a fixed node budget. The hash is cleared first, so results repeat. */
  async evaluate(fen: string, nodes: number): Promise<EngineResult> {
    let score: EngineScore | undefined;
    const collect = (line: string) => {
      if (/\b(lowerbound|upperbound)\b/.test(line)) return;
      const match = /\bscore (cp|mate) (-?\d+)/.exec(line);
      if (match) score = match[1] === 'cp' ? { cp: Number(match[2]) } : { mate: Number(match[2]) };
    };
    this.listeners.add(collect);
    try {
      this.raw.processCommand('ucinewgame');
      this.raw.processCommand(`position fen ${fen}`);
      const line = await this.exchange(`go nodes ${nodes}`, (text) => text.startsWith('bestmove'));
      if (!score) throw new Error(`The engine returned no score for ${fen}`);
      return { score, best: line.split(' ')[1] ?? '' };
    } finally {
      this.listeners.delete(collect);
    }
  }

  quit(): void {
    this.raw.terminate?.();
  }

  private exchange(command: string, done: (line: string) => boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`No answer from the engine to "${command}"`));
      }, 600_000);
      const listener = (line: string) => {
        if (!done(line)) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        resolve(line);
      };
      this.listeners.add(listener);
      this.raw.processCommand(command);
    });
  }
}
