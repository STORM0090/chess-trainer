// What counts as personal data in a tracked file. Pure functions, used by
// scripts/check-privacy.ts and tested in tests/scripts/privacy.test.ts.

export type FindingKind = 'userPath' | 'email' | 'token';

export interface Finding {
  /** 1-based line number. */
  line: number;
  kind: FindingKind;
}

/**
 * Files that are not scanned: they hold other people's addresses and paths.
 * `package-lock.json` lists package authors; `engine/` is the Stockfish build (copied into
 * `public/engine/` and published as `engine/`). The project's own code in `src/engine/` is
 * scanned like everything else.
 */
export function isExcluded(path: string): boolean {
  return path === 'package-lock.json' || /^(public\/)?engine\//.test(path);
}

// A Windows home folder with a real name in it: a drive letter, "Users" and the name, written
// with backslashes, with slashes or with doubled backslashes (JSON), and the Git Bash and WSL
// spellings that start with the drive as a folder. Folders that every machine has are not
// personal. (No example is spelled out here: this file is scanned too.)
const SHARED_FOLDERS = '(?!(?:Public|Default|All Users)(?:[\\\\/]|\\b))';
const USER_PATHS = [
  new RegExp(`[A-Za-z]:[\\\\/]{1,2}Users[\\\\/]{1,2}${SHARED_FOLDERS}[A-Za-z0-9._ -]+`),
  new RegExp(`/(?:mnt/)?[a-z]/Users/${SHARED_FOLDERS}[A-Za-z0-9._-]+`),
];

const EMAIL = /[A-Za-z0-9._%+-]+@((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})/g;

/** GitHub's noreply addresses and the domains reserved for examples (RFC 2606). */
function isAllowedEmail(address: string, domain: string): boolean {
  return /noreply/i.test(address) || /(^|\.)example\.(com|org|net)$/i.test(domain);
}

const TOKENS = [
  // GitHub: classic, OAuth, user-to-server, server-to-server, refresh, fine-grained.
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  // Keys that start with "sk-" (several AI services).
  /\bsk-[A-Za-z0-9_-]{20,}/,
  // AWS access key id, Google API key, Slack token, Lichess personal token.
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  /\blip_[A-Za-z0-9]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

/** Every line of `text` that holds a user path, a personal e-mail address or a token. */
export function scanText(text: string): Finding[] {
  const findings: Finding[] = [];
  text.split('\n').forEach((content, index) => {
    const line = index + 1;
    if (USER_PATHS.some((pattern) => pattern.test(content))) findings.push({ line, kind: 'userPath' });
    for (const match of content.matchAll(EMAIL)) {
      if (!isAllowedEmail(match[0], match[1] ?? '')) {
        findings.push({ line, kind: 'email' });
        break;
      }
    }
    if (TOKENS.some((pattern) => pattern.test(content))) findings.push({ line, kind: 'token' });
  });
  return findings;
}

/** A NUL byte near the start means the file is not text (an image, a font). */
export function looksBinary(bytes: Uint8Array): boolean {
  return bytes.subarray(0, 8000).includes(0);
}
