// Evaluates many positions in parallel, one engine per worker thread.
// Every search is independent (one thread, fixed nodes, cleared hash), so running several at once
// does not change any result.

import { Worker } from 'node:worker_threads';
import type { EngineFlavour, EngineResult } from './engine.ts';

interface Reply {
  ready?: boolean;
  fen?: string;
  result?: EngineResult;
  error?: string;
}

export async function evaluateAll(
  fens: string[],
  options: { flavour: EngineFlavour; hashMb: number; nodes: number; jobs: number },
  onProgress: (done: number, total: number) => void,
): Promise<Map<string, EngineResult>> {
  const results = new Map<string, EngineResult>();
  if (fens.length === 0) return results;

  const queue = [...fens];
  const workerCount = Math.max(1, Math.min(options.jobs, fens.length));

  await new Promise<void>((resolve, reject) => {
    const workers: Worker[] = [];
    let finished = 0;
    const stopAll = () => workers.forEach((worker) => void worker.terminate());

    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(new URL('./eval-worker.ts', import.meta.url), {
        workerData: { flavour: options.flavour, hashMb: options.hashMb, nodes: options.nodes },
      });
      workers.push(worker);
      const next = () => {
        const fen = queue.shift();
        if (fen !== undefined) worker.postMessage(fen);
      };
      worker.on('error', (error) => {
        stopAll();
        reject(error);
      });
      worker.on('message', (reply: Reply) => {
        if (reply.error) {
          stopAll();
          reject(new Error(reply.error));
          return;
        }
        if (reply.fen && reply.result) {
          results.set(reply.fen, reply.result);
          finished++;
          onProgress(finished, fens.length);
          if (finished === fens.length) {
            stopAll();
            resolve();
            return;
          }
        }
        next();
      });
    }
  });
  return results;
}
