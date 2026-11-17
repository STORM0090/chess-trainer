import { describe, expect, it } from 'vitest';
import { ROOT_DATABASE, databaseName, previewBranch, testClockAllowed } from '../src/build-info';

describe('the database of a build', () => {
  it('keeps the old name in the site root and in the APK', () => {
    expect(ROOT_DATABASE).toBe('chess-trainer');
    expect(databaseName('/chess-trainer/')).toBe('chess-trainer');
    expect(databaseName('/')).toBe('chess-trainer');
  });

  it('gives every preview its own database, never the root one', () => {
    const root = databaseName('/chess-trainer/');
    const m4 = databaseName('/chess-trainer/preview/m4/');
    const m7 = databaseName('/chess-trainer/preview/m7/');
    expect(m4).toBe('chess-trainer@preview/m4');
    expect(m4).not.toBe(root);
    expect(m7).not.toBe(root);
    expect(m7).not.toBe(m4);
  });

  it('reads the branch of a preview base', () => {
    expect(previewBranch('/chess-trainer/preview/m8b/')).toBe('m8b');
    expect(previewBranch('/chess-trainer/')).toBeUndefined();
  });
});

describe('the test clock', () => {
  it('exists in previews, on the dev server and in test builds only', () => {
    expect(testClockAllowed('/chess-trainer/preview/m4/', false, undefined)).toBe(true);
    expect(testClockAllowed('/', true, undefined)).toBe(true);
    expect(testClockAllowed('/', false, '1')).toBe(true);
  });

  it('does not exist in the site root or the APK', () => {
    expect(testClockAllowed('/chess-trainer/', false, undefined)).toBe(false);
    expect(testClockAllowed('/', false, undefined)).toBe(false);
  });
});
