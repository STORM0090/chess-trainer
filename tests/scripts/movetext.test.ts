import { describe, expect, it } from 'vitest';
import {
  divergencePly,
  formatMoves,
  measureLine,
  parseMovetext,
} from '../../shared/movetext.ts';
import { formatResult, injectCatalog, CATALOG_END, CATALOG_START } from '../../scripts/lib/catalog.ts';

describe('parseMovetext', () => {
  it('reads moves with and without spaces after the move number', () => {
    const moves = parseMovetext('1.e4 e5 2. Nf3 Nc6 3.Bc4');
    expect(moves.map((move) => move.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    expect(moves.map((move) => move.ply)).toEqual([0, 1, 2, 3, 4]);
  });

  it('separates annotation marks from the move', () => {
    const moves = parseMovetext('1.e4 e5 2.Nf3 f6? 3.Nxe5! fxe5?? 4.Qh5+ Ke7?! 5.Qxe5+');
    expect(moves[3]).toMatchObject({ san: 'f6', mark: '?' });
    expect(moves[4]).toMatchObject({ san: 'Nxe5', mark: '!' });
    expect(moves[5]).toMatchObject({ san: 'fxe5', mark: '??' });
    expect(moves[6]).toMatchObject({ san: 'Qh5+', mark: undefined });
    expect(moves[7]).toMatchObject({ san: 'Ke7', mark: '?!' });
  });

  it('accepts "3...Nf6" style numbers, castling, promotion and mate', () => {
    const moves = parseMovetext('1.e4 e5 2.Nf3 Nc6 3.Bb5 3...Nf6 4.O-O fxg1=N+ Qh4#');
    expect(moves.map((move) => move.san)).toEqual([
      'e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'fxg1=N+', 'Qh4#',
    ]);
  });
});

describe('formatMoves', () => {
  it('round-trips a line', () => {
    const text = '1.e4 e5 2.Nf3 f6? 3.Nxe5 fxe5?? 4.Qh5+';
    expect(formatMoves(parseMovetext(text))).toBe(text);
  });

  it('prints a suffix that starts with a black move', () => {
    const moves = parseMovetext('1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6? 5.Nxe5');
    expect(formatMoves(moves, 7)).toBe('4...g6? 5.Nxe5');
    expect(formatMoves(moves, 8)).toBe('5.Nxe5');
  });
});

describe('measureLine', () => {
  it('counts setup and blow moves around the decisive mistake', () => {
    const legal = parseMovetext('1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6? 5.Nxe5 Bxd1?? 6.Bxf7+ Ke7 7.Nd5#');
    expect(measureLine(legal, 'white')).toMatchObject({ setupMoves: 4, blowMoves: 3, firstBlowMove: 'capture' });
  });

  it('ignores "?!" and the player\'s own marks', () => {
    const blackburne = parseMovetext('1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxe5? Qg5 5.Nxf7?? Qxg2 6.Rf1 Qxe4+ 7.Be2 Nf3#');
    expect(measureLine(blackburne, 'black')).toMatchObject({ setupMoves: 3, blowMoves: 4, firstBlowMove: 'quiet' });
    const petrov = parseMovetext('1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nxe4?! 4.Qe2 Nf6?? 5.Nc6+ Qe7 6.Nxe7');
    expect(measureLine(petrov, 'white')).toMatchObject({ setupMoves: 4, blowMoves: 2, firstBlowMove: 'check' });
  });

  it('recognises a one-move mate and a line without a marked mistake', () => {
    expect(measureLine(parseMovetext('1.f3 e5 2.g4?? Qh4#'), 'black')).toMatchObject({
      setupMoves: 1, blowMoves: 1, firstBlowMove: 'mate',
    });
    expect(measureLine(parseMovetext('1.e4 e5 2.Qh5 Nc6'), 'black')).toMatchObject({
      setupMoves: 2, blowMoves: 0, firstBlowMove: 'none', mistakePly: undefined,
    });
  });
});

describe('divergencePly', () => {
  it('finds the first move where two lines differ', () => {
    const a = parseMovetext('1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6');
    const b = parseMovetext('1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 Nf6 5.h3');
    expect(divergencePly(a, b)).toBe(7);
  });
});

describe('catalogue helpers', () => {
  it('formats results from the player\'s point of view', () => {
    expect(formatResult({ end: 'checkmate', ok: true })).toBe('checkmate');
    expect(formatResult({ cp: 230, ok: true })).toBe('+2.3');
    expect(formatResult({ cp: -242, ok: true })).toBe('-2.4');
    expect(formatResult({ mate: 3, ok: true })).toBe('forced mate in 3');
    expect(formatResult({ mate: -2, ok: true })).toBe('mated in 2');
  });

  it('replaces only the text between the markers', () => {
    const doc = `intro\n${CATALOG_START}\nold\n${CATALOG_END}\noutro\n`;
    const next = injectCatalog(doc, 'NEW');
    expect(next).toBe(`intro\n${CATALOG_START}\n\nNEW\n\n${CATALOG_END}\noutro\n`);
    expect(injectCatalog(next, 'NEW')).toBe(next);
    expect(injectCatalog('no markers', 'NEW')).toBe('no markers');
  });
});
