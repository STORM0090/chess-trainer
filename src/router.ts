/** Hash-based routes. GitHub Pages has no SPA fallback, so the path never changes. */
export type Route =
  | { name: 'traps' }
  | { name: 'trap'; id: string }
  | { name: 'learn'; id: string }
  | { name: 'board' }
  | { name: 'diag' }
  | { name: 'notFound'; path: string };

const TRAP = /^trap\/([a-z0-9-]+)$/;
const LEARN = /^trap\/([a-z0-9-]+)\/learn$/;

/** Turns `location.hash` (for example "#/trap/legal-mate") into a route. */
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '');
  if (path === '') return { name: 'traps' };
  if (path === 'board') return { name: 'board' };
  if (path === 'diag') return { name: 'diag' };
  const trap = TRAP.exec(path)?.[1];
  if (trap) return { name: 'trap', id: trap };
  const learn = LEARN.exec(path)?.[1];
  if (learn) return { name: 'learn', id: learn };
  return { name: 'notFound', path };
}

export function routeHref(route: Exclude<Route, { name: 'notFound' }>): string {
  switch (route.name) {
    case 'traps':
      return '#/';
    case 'trap':
      return `#/trap/${route.id}`;
    case 'learn':
      return `#/trap/${route.id}/learn`;
    case 'board':
    case 'diag':
      return `#/${route.name}`;
  }
}
