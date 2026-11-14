import { describe, expect, it } from 'vitest';
import { parseRoute, routeHref, type Route } from '../src/router';

describe('parseRoute', () => {
  it('maps an empty hash to the home screen', () => {
    expect(parseRoute('')).toEqual({ name: 'today' });
    expect(parseRoute('#')).toEqual({ name: 'today' });
    expect(parseRoute('#/')).toEqual({ name: 'today' });
    expect(parseRoute('#/traps')).toEqual({ name: 'traps' });
    expect(parseRoute('#/session')).toEqual({ name: 'session' });
    expect(parseRoute('#/more')).toEqual({ name: 'more' });
    expect(parseRoute('#/settings')).toEqual({ name: 'settings' });
  });

  it('maps fixed screens, with or without a trailing slash', () => {
    expect(parseRoute('#/diag')).toEqual({ name: 'diag' });
    expect(parseRoute('#/diag/')).toEqual({ name: 'diag' });
    expect(parseRoute('#/board')).toEqual({ name: 'board' });
    expect(parseRoute('#/data')).toEqual({ name: 'data' });
    expect(parseRoute('#/puzzles')).toEqual({ name: 'puzzles' });
    expect(parseRoute('#/puzzles/test')).toEqual({ name: 'puzzleTest' });
  });

  it('reads the puzzle theme and refuses an unknown one', () => {
    expect(parseRoute('#/puzzles/theme/mateIn1')).toEqual({ name: 'puzzleTheme', theme: 'mateIn1' });
    expect(parseRoute('#/puzzles/theme/zugzwang')).toEqual({ name: 'notFound', path: 'puzzles/theme/zugzwang' });
  });

  it('reads the trap id for View and Learn', () => {
    expect(parseRoute('#/trap/legal-mate')).toEqual({ name: 'trap', id: 'legal-mate' });
    expect(parseRoute('#/trap/legal-mate/learn')).toEqual({ name: 'learn', id: 'legal-mate' });
    expect(parseRoute('#/trap/legal-mate/chain')).toEqual({ name: 'chain', id: 'legal-mate' });
    expect(parseRoute('#/trap/legal-mate/review')).toEqual({ name: 'review', id: 'legal-mate' });
  });

  it('reports unknown paths', () => {
    expect(parseRoute('#/nope')).toEqual({ name: 'notFound', path: 'nope' });
    expect(parseRoute('#/trap/')).toEqual({ name: 'notFound', path: 'trap' });
    expect(parseRoute('#/trap/Bad_Id')).toEqual({ name: 'notFound', path: 'trap/Bad_Id' });
    expect(parseRoute('#/trap/legal-mate/other')).toEqual({
      name: 'notFound',
      path: 'trap/legal-mate/other',
    });
  });

  it('round-trips with routeHref', () => {
    const routes: Exclude<Route, { name: 'notFound' }>[] = [
      { name: 'today' },
      { name: 'traps' },
      { name: 'session' },
      { name: 'more' },
      { name: 'settings' },
      { name: 'board' },
      { name: 'diag' },
      { name: 'trap', id: 'englund-trap' },
      { name: 'learn', id: 'englund-trap' },
      { name: 'chain', id: 'englund-trap' },
      { name: 'review', id: 'englund-trap' },
      { name: 'data' },
      { name: 'puzzles' },
      { name: 'puzzleTest' },
      { name: 'puzzleTheme', theme: 'backRankMate' },
    ];
    for (const route of routes) expect(parseRoute(routeHref(route))).toEqual(route);
  });
});
