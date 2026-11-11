import { describe, expect, it } from 'vitest';
import { parseRoute, routeHref } from '../src/router';

describe('parseRoute', () => {
  it('maps an empty hash to the board', () => {
    expect(parseRoute('')).toEqual({ name: 'board' });
    expect(parseRoute('#')).toEqual({ name: 'board' });
    expect(parseRoute('#/')).toEqual({ name: 'board' });
  });

  it('maps #/diag to diagnostics, with or without a trailing slash', () => {
    expect(parseRoute('#/diag')).toEqual({ name: 'diag' });
    expect(parseRoute('#/diag/')).toEqual({ name: 'diag' });
  });

  it('reports unknown paths', () => {
    expect(parseRoute('#/nope')).toEqual({ name: 'notFound', path: 'nope' });
  });

  it('round-trips with routeHref', () => {
    expect(parseRoute(routeHref('board'))).toEqual({ name: 'board' });
    expect(parseRoute(routeHref('diag'))).toEqual({ name: 'diag' });
  });
});
