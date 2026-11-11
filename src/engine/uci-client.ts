import { parseBestMove, parseIdName, parseInfo, type UciInfo } from './uci';

export interface SearchLimit {
  depth?: number;
  nodes?: number;
  /** Milliseconds. */
  movetime?: number;
}

export interface SearchResult {
  bestMove: string | undefined;
  /** The last "info" line that carried a score. */
  info: UciInfo | undefined;
}

type LineHandler = (line: string) => void;

/**
 * Promise-based wrapper around a UCI engine running in a Web Worker.
 * One search at a time; callers await `go` before starting another.
 */
export class UciEngine {
  private readonly worker: Worker;
  private readonly lineHandlers = new Set<LineHandler>();
  private readonly failureHandlers = new Set<(error: Error) => void>();
  private failure: Error | undefined;

  constructor(scriptUrl: string) {
    this.worker = new Worker(scriptUrl);
    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      if (typeof event.data !== 'string') return;
      for (const line of event.data.split('\n')) {
        if (line.length > 0) this.lineHandlers.forEach((handler) => handler(line));
      }
    };
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.fail(new Error(event.message || 'The engine worker failed to load'));
    };
  }

  /** Starts the engine and returns its name ("Stockfish 19 ..."). */
  async init(timeoutMs = 30_000): Promise<string> {
    let name = 'unknown';
    const collectName: LineHandler = (line) => {
      name = parseIdName(line) ?? name;
    };
    this.lineHandlers.add(collectName);
    try {
      this.send('uci');
      await this.waitFor((line) => line === 'uciok', timeoutMs);
      this.send('isready');
      await this.waitFor((line) => line === 'readyok', timeoutMs);
    } finally {
      this.lineHandlers.delete(collectName);
    }
    return name;
  }

  /** Searches the position given as a FEN, or the starting position when `fen` is undefined. */
  async go(fen: string | undefined, limit: SearchLimit, timeoutMs = 60_000): Promise<SearchResult> {
    let info: UciInfo | undefined;
    const collectInfo: LineHandler = (line) => {
      const parsed = parseInfo(line);
      if (parsed?.score) info = parsed;
    };
    this.lineHandlers.add(collectInfo);
    try {
      this.send('ucinewgame');
      this.send(fen ? `position fen ${fen}` : 'position startpos');
      const limits = Object.entries(limit)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key} ${value}`)
        .join(' ');
      this.send(`go ${limits}`);
      const line = await this.waitFor((candidate) => candidate.startsWith('bestmove'), timeoutMs);
      return { bestMove: parseBestMove(line)?.bestMove, info };
    } finally {
      this.lineHandlers.delete(collectInfo);
    }
  }

  terminate(): void {
    this.worker.terminate();
    this.lineHandlers.clear();
    this.failureHandlers.clear();
  }

  private send(command: string): void {
    this.worker.postMessage(command);
  }

  private fail(error: Error): void {
    this.failure = error;
    this.failureHandlers.forEach((handler) => handler(error));
  }

  private waitFor(matches: (line: string) => boolean, timeoutMs: number): Promise<string> {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.lineHandlers.delete(onLine);
        this.failureHandlers.delete(onFailure);
      };
      const onLine: LineHandler = (line) => {
        if (!matches(line)) return;
        cleanup();
        resolve(line);
      };
      const onFailure = (error: Error) => {
        cleanup();
        reject(error);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`The engine did not answer within ${timeoutMs} ms`));
      }, timeoutMs);
      this.lineHandlers.add(onLine);
      this.failureHandlers.add(onFailure);
    });
  }
}
