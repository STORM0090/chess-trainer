import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  gameStatus,
  isPromotionMove,
  lastMoveSquares,
  legalDests,
  turnColor,
} from '../src/core/chess-helpers';

describe('legalDests', () => {
  it('lists the 20 legal first moves grouped by origin square', () => {
    const dests = legalDests(new Chess());
    expect(dests.size).toBe(10); // 8 pawns and 2 knights can move
    expect(dests.get('e2')).toEqual(['e3', 'e4']);
    expect(dests.get('g1')?.sort()).toEqual(['f3', 'h3']);
    expect(dests.has('e1')).toBe(false);
  });

  it('lists a promotion square once, not once per promotion piece', () => {
    const chess = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1');
    expect(legalDests(chess).get('a7')).toEqual(['a8']);
  });

  it('is empty when the side to move is checkmated', () => {
    const chess = new Chess();
    for (const move of ['f3', 'e5', 'g4', 'Qh4#']) chess.move(move);
    expect(legalDests(chess).size).toBe(0);
  });
});

describe('isPromotionMove', () => {
  it('detects a pawn reaching the last rank', () => {
    const chess = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1');
    expect(isPromotionMove(chess, 'a7', 'a8')).toBe(true);
  });

  it('is false for ordinary moves', () => {
    expect(isPromotionMove(new Chess(), 'e2', 'e4')).toBe(false);
  });
});

describe('gameStatus', () => {
  it('reports playing, check, checkmate and stalemate', () => {
    expect(gameStatus(new Chess())).toBe('playing');
    expect(gameStatus(new Chess('4k3/8/8/8/8/8/8/4R1K1 b - - 0 1'))).toBe('check');
    expect(gameStatus(new Chess('R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1'))).toBe('checkmate');
    expect(gameStatus(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toBe('stalemate');
  });

  it('reports a draw by insufficient material', () => {
    expect(gameStatus(new Chess('8/8/8/8/8/8/8/k6K w - - 0 1'))).toBe('draw');
  });
});

describe('turnColor and lastMoveSquares', () => {
  it('follow the moves played', () => {
    const chess = new Chess();
    expect(turnColor(chess)).toBe('white');
    expect(lastMoveSquares(chess)).toBeUndefined();
    chess.move('e4');
    expect(turnColor(chess)).toBe('black');
    expect(lastMoveSquares(chess)).toEqual(['e2', 'e4']);
  });
});
