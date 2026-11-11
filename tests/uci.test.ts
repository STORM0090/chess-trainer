import { describe, expect, it } from 'vitest';
import { parseBestMove, parseIdName, parseInfo } from '../src/engine/uci';

describe('parseInfo', () => {
  it('reads depth, nodes, speed, score and the principal variation', () => {
    const info = parseInfo(
      'info depth 12 seldepth 16 multipv 1 score cp 34 nodes 51234 nps 410000 time 125 pv e2e4 e7e5 g1f3',
    );
    expect(info).toEqual({
      depth: 12,
      multipv: 1,
      score: { type: 'cp', value: 34 },
      nodes: 51234,
      nps: 410000,
      time: 125,
      pv: ['e2e4', 'e7e5', 'g1f3'],
    });
  });

  it('reads mate scores, including being mated', () => {
    expect(parseInfo('info depth 3 score mate 1 pv a1a8')?.score).toEqual({ type: 'mate', value: 1 });
    expect(parseInfo('info depth 3 score mate -2 pv g8h8')?.score).toEqual({ type: 'mate', value: -2 });
  });

  it('skips a score bound marker without losing later fields', () => {
    const info = parseInfo('info depth 8 score cp 20 lowerbound nodes 900 pv d2d4');
    expect(info?.score).toEqual({ type: 'cp', value: 20 });
    expect(info?.nodes).toBe(900);
    expect(info?.pv).toEqual(['d2d4']);
  });

  it('ignores free-text info lines and non-info lines', () => {
    expect(parseInfo('info string NNUE evaluation using nn-lite.nnue')).toBeUndefined();
    expect(parseInfo('bestmove e2e4')).toBeUndefined();
    expect(parseInfo('')).toBeUndefined();
  });
});

describe('parseBestMove', () => {
  it('reads the move and the ponder move', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toEqual({ bestMove: 'e2e4', ponder: 'e7e5' });
    expect(parseBestMove('bestmove e7e8q')).toEqual({ bestMove: 'e7e8q' });
  });

  it('reports no move when the position has no legal moves', () => {
    expect(parseBestMove('bestmove (none)')).toEqual({ bestMove: undefined });
  });

  it('ignores other lines', () => {
    expect(parseBestMove('info depth 1')).toBeUndefined();
  });
});

describe('parseIdName', () => {
  it('extracts the engine name', () => {
    expect(parseIdName('id name Stockfish 19 Lite')).toBe('Stockfish 19 Lite');
    expect(parseIdName('id author the Stockfish developers')).toBeUndefined();
  });
});
