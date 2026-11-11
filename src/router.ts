/** Hash-based routes. GitHub Pages has no SPA fallback, so the path never changes. */
export type Route = { name: 'board' } | { name: 'diag' } | { name: 'notFound'; path: string };

/** Turns `location.hash` (for example "#/diag") into a route. */
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+|\/+$/g, '');
  switch (path) {
    case '':
      return { name: 'board' };
    case 'diag':
      return { name: 'diag' };
    default:
      return { name: 'notFound', path };
  }
}

export function routeHref(name: 'board' | 'diag'): string {
  return name === 'board' ? '#/' : `#/${name}`;
}
