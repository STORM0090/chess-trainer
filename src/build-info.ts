// Facts about this build that depend on where it is served. Pure functions take the base path
// as an argument so the tests can try every case; the constants apply them to this build.

/** The database of the site root and of the installed app. Never changes: it holds real progress. */
export const ROOT_DATABASE = 'chess-trainer';

/** The stage branch of a preview base such as `/chess-trainer/preview/m4/`, or `undefined`. */
export function previewBranch(base: string): string | undefined {
  return /\/preview\/([^/]+)\/?$/.exec(base)?.[1];
}

/**
 * The IndexedDB database of a build. All previews and the site root are served from one
 * origin, and a database belongs to the origin, not to the path: without a name of its own,
 * a preview would upgrade the root's database and the root build could no longer open it.
 */
export function databaseName(base: string): string {
  const branch = previewBranch(base);
  return branch === undefined ? ROOT_DATABASE : `${ROOT_DATABASE}@preview/${branch}`;
}

/**
 * Whether the test clock ("На день вперёд") exists. Only in previews, the dev server and test
 * builds made with VITE_TEST_CLOCK=1; never in the site root or the APK, where it would move
 * the dates of real progress.
 */
export function testClockAllowed(base: string, dev: boolean, flag: string | undefined): boolean {
  return dev || previewBranch(base) !== undefined || flag === '1';
}

export const DATABASE_NAME = databaseName(import.meta.env.BASE_URL);
export const TEST_CLOCK = testClockAllowed(
  import.meta.env.BASE_URL,
  import.meta.env.DEV,
  import.meta.env.VITE_TEST_CLOCK,
);
