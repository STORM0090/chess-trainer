// Fails when a file tracked by git holds personal data: a Windows path with a user name, an
// e-mail address other than a noreply one, or something that looks like a token.
// Run with `npm run check:privacy`; CI runs it on every push.
//
// The report names the file, the line and the kind of finding, never the text itself:
// CI logs of a public repository are public too.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isExcluded, looksBinary, scanText, type FindingKind } from './lib/privacy.ts';

const KIND_TEXT: Record<FindingKind, string> = {
  userPath: 'a path with a user name',
  email: 'an e-mail address that is not a noreply address',
  token: 'something that looks like a token or a private key',
};

function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
}

/** Author and committer of the commit being checked: history must not hold a personal address. */
function commitEmailProblems(): string[] {
  const [author = '', committer = ''] = execFileSync('git', ['log', '-1', '--format=%ae%n%ce'], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n');
  const problems: string[] = [];
  if (!/noreply/i.test(author)) problems.push('the author address of the last commit is not a noreply address');
  if (!/noreply/i.test(committer)) problems.push('the committer address of the last commit is not a noreply address');
  return problems;
}

const problems: string[] = [];
let scanned = 0;
for (const path of trackedFiles()) {
  if (isExcluded(path)) continue;
  const bytes = readFileSync(path);
  if (looksBinary(bytes)) continue;
  scanned++;
  for (const finding of scanText(bytes.toString('utf8'))) {
    problems.push(`${path}:${finding.line}: ${KIND_TEXT[finding.kind]}`);
  }
}
problems.push(...commitEmailProblems());

if (problems.length > 0) {
  console.error(`check-privacy: ${problems.length} problem(s) in ${scanned} text files\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('\nRemove the data (and rewrite the commit if it is already committed), then run again.');
  process.exit(1);
}
console.log(`check-privacy: ${scanned} text files, nothing found`);
