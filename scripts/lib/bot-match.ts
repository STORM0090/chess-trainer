// One game between two bot players, and the worker that plays a list of games.

import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { Chess } from 'chess.js';
import { chooseMove, paramsFor, seededRandom, PIECE_CP, type Analyse, type BotParams } from '../../shared/bot/policy.ts';
import { startBotEngine } from './bot-engine.ts';

export interface Player {
  name: string;
  /** A point on the bot's strength scale... */
  strength?: number;
  /** ...or the engine itself with one of its own limiters, as a reference opponent. */
  reference?: { option: 'Skill Level' | 'UCI_Elo'; value: number; nodes: number };
}

export interface GameJob {
  id: number;
  white: Player;
  black: Player;
  seed: number;
}

export interface GameResult {
  id: number;
  white: string;
  black: string;
  /** 1 White won, 0 Black won, 0.5 a draw. */
  score: number;
  end: 'mate' | 'draw' | 'material' | 'long';
  plies: number;
  /** Per side: moves made, of them tunnel moves, total centipawn loss where it is known, moves losing 300 or more. */
  stats: Record<'white' | 'black', { moves: number; tunnel: number; loss: number; rated: number; blunders: number }>;
}

/** A game this long is stopped and judged by material. */
const MAX_PLIES = 240;
/** Material lead (centipawns) that counts as a win when a game is stopped. */
const DECISIVE_CP = 500;

function materialLead(chess: Chess): number {
  let lead = 0;
  for (const row of chess.board()) {
    for (const cell of row) if (cell) lead += (cell.color === 'w' ? 1 : -1) * PIECE_CP[cell.type];
  }
  return lead;
}

export async function playGame(
  job: GameJob,
  analyse: Analyse,
  reference: (player: Player, fen: string) => Promise<string>,
): Promise<GameResult> {
  const chess = new Chess();
  const random = seededRandom(job.seed);
  const params: Record<'w' | 'b', BotParams | undefined> = {
    w: job.white.strength === undefined ? undefined : paramsFor(job.white.strength),
    b: job.black.strength === undefined ? undefined : paramsFor(job.black.strength),
  };
  const empty = () => ({ moves: 0, tunnel: 0, loss: 0, rated: 0, blunders: 0 });
  const stats = { white: empty(), black: empty() };
  let end: GameResult['end'] = 'long';
  let score = 0.5;

  for (let ply = 0; ply < MAX_PLIES; ply++) {
    if (chess.isCheckmate()) {
      end = 'mate';
      score = chess.turn() === 'w' ? 0 : 1;
      break;
    }
    if (chess.isDraw() || chess.isStalemate()) {
      end = 'draw';
      break;
    }
    const turn = chess.turn();
    const side = turn === 'w' ? stats.white : stats.black;
    const own = params[turn];
    let uci: string;
    if (own) {
      const choice = await chooseMove(chess.fen(), own, analyse, random);
      uci = choice.uci;
      side.moves++;
      if (choice.mode === 'tunnel') side.tunnel++;
      if (choice.loss !== undefined) {
        side.rated++;
        side.loss += Math.min(choice.loss, 1000);
        if (choice.loss >= 300) side.blunders++;
      }
    } else {
      uci = await reference(turn === 'w' ? job.white : job.black, chess.fen());
      side.moves++;
    }
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  }
  if (end === 'long') {
    const lead = materialLead(chess);
    if (Math.abs(lead) >= DECISIVE_CP) {
      end = 'material';
      score = lead > 0 ? 1 : 0;
    }
  }
  return { id: job.id, white: job.white.name, black: job.black.name, score, end, plies: chess.history().length, stats };
}

// As a worker: play the games in `workerData` and report each one.
if (!isMainThread && parentPort) {
  const port = parentPort;
  // An object, as in the verify worker: the engine script looks at workerData too.
  const { jobs } = workerData as { jobs: GameJob[] };
  // One engine per thread: the engine script cannot be started twice in the same thread.
  // The reference opponents switch its limiter on for their own moves and off again.
  const engine = await startBotEngine();
  const limiter = (option: 'none' | 'Skill Level' | 'UCI_Elo', value: number) => {
    engine.setOption('UCI_LimitStrength', option === 'UCI_Elo' ? 'true' : 'false');
    engine.setOption('Skill Level', option === 'Skill Level' ? value : 20);
    if (option === 'UCI_Elo') engine.setOption('UCI_Elo', value);
  };
  const analyse: typeof engine.analyse = (fen, options) => {
    limiter('none', 0);
    return engine.analyse(fen, options);
  };
  const reference = async (player: Player, fen: string): Promise<string> => {
    const ref = player.reference;
    if (!ref) throw new Error(`${player.name} is not a reference player`);
    limiter(ref.option, ref.value);
    // The limiter picks its move by itself; with one line the first candidate is that move.
    const [move] = await engine.analyse(fen, { nodes: ref.nodes, multipv: 1 });
    if (!move) throw new Error(`No move from the reference engine in ${fen}`);
    return move.uci;
  };
  for (const job of jobs) port.postMessage(await playGame(job, analyse, reference));
  engine.quit();
  port.postMessage({ done: true, searches: engine.stats.searches, cached: engine.stats.cached });
}
