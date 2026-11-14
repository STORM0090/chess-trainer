import { describe, expect, it } from 'vitest';
import { isExcluded, looksBinary, scanText } from '../../scripts/lib/privacy.ts';

// The samples are glued together from parts, so that this file itself passes the check.
const BACKSLASH = '\\';
const WINDOWS_HOME = ['C:', 'Users', 'someone'].join(BACKSLASH);
const WINDOWS_HOME_JSON = ['C:', 'Users', 'someone'].join(BACKSLASH + BACKSLASH);
const GIT_BASH_HOME = ['', 'c', 'Users', 'someone', '.config'].join('/');
const PERSONAL_EMAIL = ['someone', 'mail.test'].join('@');
const GITHUB_TOKEN = `ghp${'_'}${'a1B2'.repeat(9)}`;
const KEY_HEADER = `${'-'.repeat(5)}BEGIN OPENSSH PRIVATE KEY${'-'.repeat(5)}`;

const kinds = (text: string) => scanText(text).map((finding) => finding.kind);

describe('scanText', () => {
  it('finds a Windows home folder in every spelling', () => {
    expect(kinds(`cwd: ${WINDOWS_HOME}${BACKSLASH}project`)).toEqual(['userPath']);
    expect(kinds(`"path": "${WINDOWS_HOME_JSON}"`)).toEqual(['userPath']);
    expect(kinds(`cd ${WINDOWS_HOME.replaceAll(BACKSLASH, '/')}/project`)).toEqual(['userPath']);
    expect(kinds(`export HOME=${GIT_BASH_HOME}`)).toEqual(['userPath']);
    expect(kinds(`/mnt${GIT_BASH_HOME}`)).toEqual(['userPath']);
  });

  it('leaves folders that every machine has, and other paths, alone', () => {
    expect(kinds(['C:', 'Users', 'Public', 'Documents'].join(BACKSLASH))).toEqual([]);
    expect(kinds('"C:/Program Files/nodejs/node.exe"')).toEqual([]);
    expect(kinds('src/ui/screens/DataScreen.tsx and /preview/m3/')).toEqual([]);
  });

  it('finds a personal address and accepts noreply and example addresses', () => {
    expect(kinds(`Contact: ${PERSONAL_EMAIL}`)).toEqual(['email']);
    expect(kinds('41898282+github-actions[bot]@users.noreply.github.com')).toEqual([]);
    expect(kinds('12345+owner@users.noreply.github.com, someone@example.com')).toEqual([]);
    // Both on one line: the personal one still counts.
    expect(kinds(`bot@users.noreply.github.com ${PERSONAL_EMAIL}`)).toEqual(['email']);
  });

  it('does not take package versions and actions for addresses', () => {
    expect(kinds('npm install idb@8.0.4 ts-fsrs@6.0.0 @playwright/test@1.65.0')).toEqual([]);
    expect(kinds('uses: actions/checkout@v7')).toEqual([]);
    expect(kinds('https://x-access-token:${{ github.token }}@github.com/owner/repo.git')).toEqual([]);
  });

  it('finds tokens and private keys', () => {
    expect(kinds(`GH_TOKEN=${GITHUB_TOKEN}`)).toEqual(['token']);
    expect(kinds(KEY_HEADER)).toEqual(['token']);
    expect(kinds('ghp_ is the prefix of a GitHub token')).toEqual([]);
  });

  it('reports the line of every finding', () => {
    const text = ['clean', `a ${PERSONAL_EMAIL}`, 'clean', `b ${WINDOWS_HOME} ${GITHUB_TOKEN}`].join('\n');
    expect(scanText(text)).toEqual([
      { line: 2, kind: 'email' },
      { line: 4, kind: 'userPath' },
      { line: 4, kind: 'token' },
    ]);
  });
});

describe('which files are scanned', () => {
  it('skips the lockfile and the engine build, not the project code', () => {
    expect(isExcluded('package-lock.json')).toBe(true);
    expect(isExcluded('public/engine/stockfish-19-lite-single.js')).toBe(true);
    expect(isExcluded('engine/stockfish-19-lite-single.js')).toBe(true);
    expect(isExcluded('src/engine/uci-client.ts')).toBe(false);
    expect(isExcluded('scripts/lib/engine.ts')).toBe(false);
    expect(isExcluded('docs/package-lock.json')).toBe(false);
  });

  it('recognises binary files by a NUL byte', () => {
    expect(looksBinary(new Uint8Array([137, 80, 78, 71, 0, 1]))).toBe(true);
    expect(looksBinary(new TextEncoder().encode('plain text'))).toBe(false);
  });
});
