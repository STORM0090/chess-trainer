import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  MATE_CP,
  chooseMove,
  paramsFor,
  parseCandidates,
  seededRandom,
  tunnelAppeal,
  type Analyse,
  type BotParams,
  type Candidate,
} from '../shared/bot/policy.ts';

const START = new Chess().fen();
/** After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5: Black must do something about f7. */
const FRIED = 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4';
/** White queen on h5 can take the defended pawn e5 (losing the queen) or mate on f7. */
const SCHOLAR = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';

const fixed = (candidates: Candidate[]): Analyse => async () => candidates;
const move = (fen: string, san: string) => {
  const chess = new Chess(fen);
  const found = chess.moves({ verbose: true }).find((candidate) => candidate.san === san);
  if (!found) throw new Error(`No move ${san}`);
  return found;
};
const params = (change: Partial<BotParams>): BotParams => ({ ...paramsFor(0.5), ...change });

describe('paramsFor', () => {
  it('goes from a weak, cheap bot to a strong one without a jump', () => {
    const low = paramsFor(0);
    const high = paramsFor(1);
    expect(low.nodes).toBe(300);
    expect(high.nodes).toBe(12_000);
    expect(low.tunnel).toBeGreaterThan(high.tunnel);
    expect(low.look).toBeLessThan(high.look);
    expect(low.temperature).toBeGreaterThan(high.temperature);
    let previous = paramsFor(0);
    for (let step = 1; step <= 20; step++) {
      const next = paramsFor(step / 20);
      expect(next.nodes).toBeGreaterThan(previous.nodes);
      expect(next.tunnel).toBeLessThan(previous.tunnel);
      previous = next;
    }
    // Out of range is clamped.
    expect(paramsFor(-1)).toEqual(low);
    expect(paramsFor(2)).toEqual(high);
  });
});

describe('parseCandidates', () => {
  it('keeps the deepest line of every rank, best first, and maps mates', () => {
    const lines = [
      'info depth 1 multipv 1 score cp 10 nodes 20 pv e2e4',
      'info depth 5 seldepth 7 multipv 1 score cp 31 nodes 900 nps 1000 pv d2d4 d7d5',
      'info depth 5 seldepth 7 multipv 2 score cp -12 upperbound nodes 900 pv g1f3',
      'info depth 5 multipv 3 score mate 2 nodes 900 pv h5f7',
      'info depth 5 multipv 4 score mate -1 nodes 900 pv a2a3',
      'info string something else',
      'bestmove d2d4 ponder d7d5',
    ];
    expect(parseCandidates(lines)).toEqual([
      { uci: 'd2d4', cp: 31 },
      { uci: 'g1f3', cp: -12 },
      { uci: 'h5f7', cp: MATE_CP - 200 },
      { uci: 'a2a3', cp: -MATE_CP + 100 },
    ]);
  });

  it('reads a single line without a multipv number', () => {
    expect(parseCandidates(['info depth 3 score cp 5 pv e2e4 e7e5'])).toEqual([{ uci: 'e2e4', cp: 5 }]);
  });
});

describe('tunnelAppeal', () => {
  it('always goes for a mate it can see', () => {
    expect(tunnelAppeal(SCHOLAR, move(SCHOLAR, 'Qxf7#'), false)).toBe(MATE_CP);
  });

  it('grabs a defended pawn with the queen when it does not look, and refuses when it does', () => {
    const grab = move(SCHOLAR, 'Qxe5+');
    const quiet = move(SCHOLAR, 'Nf3');
    expect(tunnelAppeal(SCHOLAR, grab, false)).toBeGreaterThan(tunnelAppeal(SCHOLAR, quiet, false));
    expect(tunnelAppeal(SCHOLAR, grab, true)).toBeLessThan(tunnelAppeal(SCHOLAR, quiet, true));
  });

  it('likes natural opening moves more than a rook pawn', () => {
    const appeal = (san: string) => tunnelAppeal(START, move(START, san), true);
    expect(appeal('e4')).toBeGreaterThan(appeal('a3'));
    expect(appeal('Nf3')).toBeGreaterThan(appeal('h4'));
  });

  it('wants to move a piece that is attacked by a pawn, when it looks', () => {
    // 1.e4 Nf6 2.e5: the knight on f6 is attacked by the pawn.
    const fen = 'rnbqkb1r/pppppppp/5n2/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2';
    expect(tunnelAppeal(fen, move(fen, 'Nd5'), true)).toBeGreaterThan(tunnelAppeal(fen, move(fen, 'd6'), true));
    // Without looking the escape is just another move.
    expect(tunnelAppeal(fen, move(fen, 'Nd5'), false)).toBeLessThanOrEqual(tunnelAppeal(fen, move(fen, 'd5'), false));
  });
});

describe('chooseMove', { timeout: 30_000 }, () => {
  const candidates: Candidate[] = [
    { uci: 'd7d5', cp: 10 },
    { uci: 'f8c5', cp: -90 },
    { uci: 'h7h6', cp: -400 },
  ];

  it('plays the only legal move without asking the engine', async () => {
    // A check on the back rank with one way out: Kh2.
    const fen = '6k1/8/8/8/8/8/5PP1/3r2K1 w - - 0 1';
    expect(new Chess(fen).moves()).toEqual(['Kh2']);
    const analyse: Analyse = async () => {
      throw new Error('the engine must not be asked');
    };
    await expect(chooseMove(fen, params({}), analyse, () => 0)).resolves.toEqual({ uci: 'g1h2', mode: 'forced', loss: 0 });
  });

  it('in a careful mood prefers the best move, the more so the lower the temperature', async () => {
    const counts = { sharp: 0, vague: 0 };
    const random = seededRandom(7);
    for (let game = 0; game < 120; game++) {
      const sharp = await chooseMove(FRIED, params({ tunnel: 0, temperature: 30 }), fixed(candidates), random);
      const vague = await chooseMove(FRIED, params({ tunnel: 0, temperature: 220 }), fixed(candidates), random);
      expect(sharp.mode).toBe('careful');
      if (sharp.uci === 'd7d5') counts.sharp++;
      if (vague.uci === 'd7d5') counts.vague++;
    }
    expect(counts.sharp).toBeGreaterThan(100);
    expect(counts.vague).toBeGreaterThan(40);
    expect(counts.vague).toBeLessThan(counts.sharp);
  });

  it('reports what the chosen move gives up', async () => {
    const choice = await chooseMove(FRIED, params({ tunnel: 0, temperature: 1 }), fixed(candidates), () => 0.999);
    expect(choice).toEqual({ uci: 'd7d5', mode: 'careful', loss: 0 });
  });

  it('in a tunnel mood takes material and misses the threat', async () => {
    // The engine sees that taking e5 with the queen loses it; a bot that does not look takes.
    const rated: Candidate[] = [
      { uci: 'h5f7', cp: MATE_CP - 100 },
      { uci: 'g1f3', cp: 60 },
      { uci: 'h5e5', cp: -800 },
    ];
    // With the mate on the board every tunnel move is the mate: checks are what beginners try.
    const mate = await chooseMove(SCHOLAR, params({ tunnel: 1, look: 0 }), fixed(rated), seededRandom(1));
    expect(mate).toMatchObject({ uci: 'h5f7', mode: 'tunnel' });

    // The same position without the bishop on c4: no mate, the pawn on e5 is still defended.
    const noMate = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/4P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    const list: Candidate[] = [
      { uci: 'h5e2', cp: 0 },
      { uci: 'h5f3', cp: -10 },
    ];
    let grabs = 0;
    let careful = 0;
    const random = seededRandom(3);
    for (let game = 0; game < 80; game++) {
      const blind = await chooseMove(noMate, params({ tunnel: 1, look: 0 }), fixed(list), random);
      if (blind.uci === 'h5e5' || blind.uci === 'h5f7' || blind.uci === 'h5h7') grabs++;
      const looking = await chooseMove(noMate, params({ tunnel: 1, look: 1 }), fixed(list), random);
      if (looking.uci === 'h5e5' || looking.uci === 'h5f7' || looking.uci === 'h5h7') careful++;
    }
    // Blind: it almost always grabs a pawn with the queen. Looking: almost never.
    expect(grabs).toBeGreaterThan(68);
    expect(careful).toBeLessThan(6);
  });

  it('never plays a move that is not legal, whatever the engine says', async () => {
    const broken: Candidate[] = [
      { uci: 'e2e5', cp: 500 },
      { uci: 'e2e4', cp: 20 },
    ];
    for (let seed = 1; seed <= 30; seed++) {
      const choice = await chooseMove(START, params({ tunnel: 0.5 }), fixed(broken), seededRandom(seed));
      const chess = new Chess(START);
      expect(() => chess.move({ from: choice.uci.slice(0, 2), to: choice.uci.slice(2, 4) })).not.toThrow();
    }
    // Nothing usable from the engine: still a legal move.
    const lost = await chooseMove(START, params({}), fixed([]), seededRandom(2));
    expect(new Chess(START).moves({ verbose: true }).some((legal) => `${legal.from}${legal.to}` === lost.uci)).toBe(true);
  });

  it('is repeatable: the same seed gives the same game', async () => {
    const play = async (seed: number) => {
      const random = seededRandom(seed);
      const moves: string[] = [];
      for (let index = 0; index < 20; index++) moves.push((await chooseMove(FRIED, params({}), fixed(candidates), random)).uci);
      return moves.join(' ');
    };
    expect(await play(11)).toBe(await play(11));
    expect(await play(11)).not.toBe(await play(12));
  });
});
