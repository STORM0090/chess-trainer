// Worker thread: owns one engine instance and evaluates positions on request.

import { parentPort, workerData } from 'node:worker_threads';
import { Engine, type EngineFlavour } from './engine.ts';

interface Setup {
  flavour: EngineFlavour;
  hashMb: number;
  nodes: number;
}

const setup = workerData as Setup;
const port = parentPort;
if (!port) throw new Error('eval-worker must run as a worker thread');

const engine = await Engine.start(setup.flavour, setup.hashMb);

port.on('message', (fen: string) => {
  engine.evaluate(fen, setup.nodes).then(
    (result) => port.postMessage({ fen, result }),
    (error: unknown) => port.postMessage({ fen, error: String(error) }),
  );
});
port.postMessage({ ready: true });
