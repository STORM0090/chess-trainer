import { isPuzzleTheme, type PuzzleTheme } from '../shared/puzzle-types.ts';

/** Hash-based routes. GitHub Pages has no SPA fallback, so the path never changes. */
export type Route =
  | { name: 'today' }
  | { name: 'session' }
  | { name: 'more' }
  | { name: 'settings' }
  | { name: 'traps' }
  | { name: 'trap'; id: string }
  | { name: 'learn'; id: string }
  | { name: 'chain'; id: string }
  | { name: 'review'; id: string }
  | { name: 'puzzles' }
  | { name: 'puzzleTest' }
  | { name: 'puzzleTheme'; theme: PuzzleTheme }
  | { name: 'board' }
  | { name: 'data' }
  | { name: 'diag' }
  | { name: 'notFound'; path: string };

const TRAP = /^trap\/([a-z0-9-]+)$/;
const MODE = /^trap\/([a-z0-9-]+)\/(learn|chain|review)$/;
const THEME = /^puzzles\/theme\/([A-Za-z0-9]+)$/;

/** Turns `location.hash` (for example "#/trap/legal-mate") into a route. */
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '');
  if (path === '') return { name: 'today' };
  if (path === 'traps') return { name: 'traps' };
  if (path === 'session') return { name: 'session' };
  if (path === 'more') return { name: 'more' };
  if (path === 'settings') return { name: 'settings' };
  if (path === 'puzzles') return { name: 'puzzles' };
  if (path === 'puzzles/test') return { name: 'puzzleTest' };
  const theme = THEME.exec(path)?.[1];
  if (isPuzzleTheme(theme)) return { name: 'puzzleTheme', theme };
  if (path === 'board') return { name: 'board' };
  if (path === 'data') return { name: 'data' };
  if (path === 'diag') return { name: 'diag' };
  const trap = TRAP.exec(path)?.[1];
  if (trap) return { name: 'trap', id: trap };
  const mode = MODE.exec(path);
  if (mode?.[1] && mode[2]) return { name: mode[2] as 'learn' | 'chain' | 'review', id: mode[1] };
  return { name: 'notFound', path };
}

export function routeHref(route: Exclude<Route, { name: 'notFound' }>): string {
  switch (route.name) {
    case 'today':
      return '#/';
    case 'trap':
      return `#/trap/${route.id}`;
    case 'learn':
    case 'chain':
    case 'review':
      return `#/trap/${route.id}/${route.name}`;
    case 'puzzleTest':
      return '#/puzzles/test';
    case 'puzzleTheme':
      return `#/puzzles/theme/${route.theme}`;
    case 'traps':
    case 'session':
    case 'more':
    case 'settings':
    case 'puzzles':
    case 'board':
    case 'data':
    case 'diag':
      return `#/${route.name}`;
  }
}
