// Builds content/puzzles/lichess.json from the Lichess puzzle database (CC0).
//
//   node scripts/build-puzzles.ts [path to lichess_db_puzzle.csv.zst]
//
// The archive is not in the repository. Download it once (about 295 MB) into the git-ignored
// cache folder:
//   curl -L -o .cache/lichess/lichess_db_puzzle.csv.zst https://database.lichess.org/lichess_db_puzzle.csv.zst
//
// The choice is reproducible: for every theme and every 100-point rating bucket the script
// keeps the most played puzzles that pass the quality limits below. The same archive always
// gives the same file. Every kept puzzle is replayed with chess.js.

import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createZstdDecompress } from 'node:zlib';
import { Chess } from 'chess.js';
import {
  PUZZLE_THEMES,
  TACTICS_LEVELS,
  isPuzzleTheme,
  themeLevel,
  type PuzzleEntry,
  type PuzzleFile,
  type PuzzleTheme,
} from '../shared/puzzle-types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_ARCHIVE = join(ROOT, '.cache', 'lichess', 'lichess_db_puzzle.csv.zst');
const OUT_DIR = join(ROOT, 'content', 'puzzles');
const SOURCE_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';

/** Puzzles kept per theme and rating bucket. */
const PER_BUCKET = 30;
const BUCKET_SIZE = 100;
const MIN_RATING = TACTICS_LEVELS[0]?.min ?? 400;
const MAX_RATING = TACTICS_LEVELS.at(-1)?.max ?? 1400;
/** Lichess popularity runs from -100 to 100: the share of players who liked the puzzle. */
const MIN_POPULARITY = 80;
/** With few plays the rating is still a guess. */
const MIN_PLAYS = 200;
const MAX_RATING_DEVIATION = 90;
/** Short puzzles only: at most three moves of the player. */
const MAX_PLAYER_MOVES = 3;
/** Themes whose last move must be checkmate. */
const MATE_THEMES: PuzzleTheme[] = ['mateIn1', 'mateIn2', 'backRankMate'];
const MATE_LENGTH: Partial<Record<PuzzleTheme, number>> = { mateIn1: 1, mateIn2: 2 };

interface Candidate extends PuzzleEntry {
  plays: number;
  popularity: number;
}

/** Most played first; the id breaks ties, so the order never depends on the file order. */
function better(a: Candidate, b: Candidate): number {
  return b.plays - a.plays || b.popularity - a.popularity || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function bucketOf(rating: number): number {
  return Math.floor(rating / BUCKET_SIZE) * BUCKET_SIZE;
}

/** Replays a puzzle. Returns what is wrong with it, or undefined when it is fine. */
function problemOf(puzzle: PuzzleEntry): string | undefined {
  const moves = puzzle.moves.split(' ');
  if (moves.length % 2 !== 0) return 'the player does not make the last move';
  let chess: Chess;
  try {
    chess = new Chess(puzzle.fen);
  } catch {
    return 'bad FEN';
  }
  for (const uci of moves) {
    try {
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      return `illegal move ${uci}`;
    }
  }
  if (puzzle.themes.some((theme) => MATE_THEMES.includes(theme)) && !chess.isCheckmate()) {
    return 'a mate theme that does not end in mate';
  }
  for (const theme of puzzle.themes) {
    const length = MATE_LENGTH[theme];
    if (length !== undefined && moves.length !== length * 2) return `${theme} with ${moves.length / 2} moves`;
  }
  return undefined;
}

const archive = process.argv[2] ?? DEFAULT_ARCHIVE;
if (!existsSync(archive)) {
  console.error(`No archive at ${archive}. See the comment at the top of this script.`);
  process.exit(1);
}

/** Candidates per "theme bucket". Trimmed from time to time so memory stays small. */
const pools = new Map<string, Candidate[]>();
/** Every puzzle of the archive with this theme in this bucket, before the quality limits. */
const available = new Map<string, number>();
const hash = createHash('sha256');
let rows = 0;

const file = createReadStream(archive);
file.on('data', (chunk) => hash.update(chunk));
const lines = createInterface({ input: file.pipe(createZstdDecompress()), crlfDelay: Infinity });
let header = true;
for await (const line of lines) {
  if (header) {
    header = false;
    if (!line.startsWith('PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes')) {
      console.error(`Unexpected header: ${line}`);
      process.exit(1);
    }
    continue;
  }
  rows++;
  // No field before the opening tags contains a comma.
  const [id, fen, moves, ratingText, deviationText, popularityText, playsText, themesText] = line.split(',');
  if (!id || !fen || !moves || !themesText) continue;
  const rating = Number(ratingText);
  if (!(rating >= MIN_RATING && rating < MAX_RATING)) continue;
  const themes = themesText.split(' ').filter(isPuzzleTheme);
  if (themes.length === 0) continue;
  // In the order of PUZZLE_THEMES, so the file does not depend on the order in the archive.
  themes.sort((a, b) => PUZZLE_THEMES.indexOf(a) - PUZZLE_THEMES.indexOf(b));
  const bucket = bucketOf(rating);
  for (const theme of themes) {
    const key = `${theme} ${bucket}`;
    available.set(key, (available.get(key) ?? 0) + 1);
  }
  const plays = Number(playsText);
  const popularity = Number(popularityText);
  if (popularity < MIN_POPULARITY || plays < MIN_PLAYS || Number(deviationText) > MAX_RATING_DEVIATION) continue;
  if (moves.split(' ').length > MAX_PLAYER_MOVES * 2) continue;
  const candidate: Candidate = { id, fen, moves, rating, themes, plays, popularity };
  for (const theme of themes) {
    // A theme is not served below the band of the level that introduces it.
    if (rating < (TACTICS_LEVELS[themeLevel(theme)]?.min ?? MIN_RATING)) continue;
    const key = `${theme} ${bucket}`;
    const pool = pools.get(key);
    if (!pool) pools.set(key, [candidate]);
    else {
      pool.push(candidate);
      if (pool.length > PER_BUCKET * 8) pool.sort(better).splice(PER_BUCKET * 2);
    }
  }
}

const chosen = new Map<string, PuzzleEntry>();
const kept = new Map<string, number>();
let rejected = 0;
for (const key of [...pools.keys()].sort()) {
  const pool = pools.get(key) ?? [];
  let count = 0;
  for (const { plays: _plays, popularity: _popularity, ...puzzle } of pool.sort(better)) {
    if (count >= PER_BUCKET) break;
    const problem = problemOf(puzzle);
    if (problem) {
      rejected++;
      console.warn(`skipped ${puzzle.id}: ${problem}`);
      continue;
    }
    chosen.set(puzzle.id, puzzle);
    count++;
  }
  kept.set(key, count);
}

const puzzles = [...chosen.values()].sort(
  (a, b) => a.rating - b.rating || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
);
const meta: Omit<PuzzleFile, 'puzzles'> = {
  schema: 1,
  source: {
    name: 'Lichess puzzle database',
    url: SOURCE_URL,
    license: 'CC0-1.0',
    sha256: hash.digest('hex'),
    bytes: statSync(archive).size,
    rows,
  },
  selection: {
    perBucket: PER_BUCKET,
    bucketSize: BUCKET_SIZE,
    minPopularity: MIN_POPULARITY,
    minPlays: MIN_PLAYS,
    maxRatingDeviation: MAX_RATING_DEVIATION,
    maxPlayerMoves: MAX_PLAYER_MOVES,
  },
};
// One puzzle per line: a readable diff when the selection changes.
const body = puzzles.map((puzzle) => `    ${JSON.stringify(puzzle)}`).join(',\n');
const text = `${JSON.stringify(meta, null, 2).slice(0, -2)},\n  "puzzles": [\n${body}\n  ]\n}\n`;

const buckets: number[] = [];
for (let bucket = MIN_RATING; bucket < MAX_RATING; bucket += BUCKET_SIZE) buckets.push(bucket);
const table = [
  `| Theme | ${buckets.map((bucket) => `${bucket}+`).join(' | ')} |`,
  `| --- | ${buckets.map(() => '---').join(' | ')} |`,
  ...PUZZLE_THEMES.map(
    (theme) =>
      `| \`${theme}\` | ${buckets
        .map((bucket) => `${kept.get(`${theme} ${bucket}`) ?? 0} / ${available.get(`${theme} ${bucket}`) ?? 0}`)
        .join(' | ')} |`,
  ),
].join('\n');
const readme = `# Puzzles

_This folder is generated by \`npm run build:puzzles\`. Do not edit it by hand._

- Source: [${meta.source.name}](https://database.lichess.org/#puzzles), license CC0 1.0.
- Archive: \`lichess_db_puzzle.csv.zst\`, ${meta.source.bytes.toLocaleString('en-US')} bytes,
  ${rows.toLocaleString('en-US')} puzzles, SHA-256 \`${meta.source.sha256}\`.
- Kept: ${puzzles.length.toLocaleString('en-US')} puzzles in \`lichess.json\`. Only the id, the position, the
  moves, the rating and the themes are kept; the links to the games are not.
- Choice: for every theme and every ${BUCKET_SIZE}-point rating bucket, the ${PER_BUCKET} most played puzzles
  with popularity of ${MIN_POPULARITY} or more, ${MIN_PLAYS} plays or more, a rating deviation of ${MAX_RATING_DEVIATION} or less
  and at most ${MAX_PLAYER_MOVES} moves of the player. A theme starts at the lower rating of the level that
  introduces it. Every puzzle was replayed with chess.js; ${rejected} failed and were left out.

## Kept / available

"Available" counts every puzzle of the archive with the theme in the bucket, before the
quality limits.

${table}
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'lichess.json'), text);
writeFileSync(join(OUT_DIR, 'README.md'), readme);
console.log(`${rows} rows read, ${puzzles.length} puzzles kept, ${rejected} rejected.`);
console.log(table);
