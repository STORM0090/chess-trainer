// Verifies every trap in content/traps/*.json and writes the result back into the files.
//
//   node scripts/verify.ts            verify, update trap files, the cache and the ROADMAP catalogue
//   node scripts/verify.ts --check    change nothing; fail if any file is out of date (CI)
//   node scripts/verify.ts --no-cache ignore cached evaluations and search every position again
//   node scripts/verify.ts --only id  verify a single trap
//   node scripts/verify.ts --jobs 2   number of engine workers (default: up to 4)
//
// What is checked: every move is legal and written in exact SAN; lines marked "mate" end in
// checkmate by the player; other lines are evaluated by Stockfish (full network, fixed node count,
// one thread, cleared hash) and compared with the thresholds below.
// Evaluations are cached by engine, node count and FEN, so only new positions are searched.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { injectCatalog, renderCatalog, trapStatus } from './lib/catalog.ts';
import { enginePackageVersion, type EngineFlavour, type EngineResult } from './lib/engine.ts';
import { evaluateAll } from './lib/eval-pool.ts';
import { measureLine, parseMovetext } from './lib/movetext.ts';
import type {
  BacklogEntry,
  Expect,
  LineResult,
  LineTag,
  Reliability,
  TrapFile,
  TrapLine,
  Verification,
} from './lib/trap-types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TRAPS_DIR = join(ROOT, 'content', 'traps');
const CACHE_FILE = join(ROOT, 'content', 'verify-cache.json');
const BACKLOG_FILE = join(ROOT, 'content', 'backlog.json');
const ROADMAP_FILE = join(ROOT, 'content', 'ROADMAP.md');

/** Run parameters. Changing any of them invalidates the cache, because they are part of its keys. */
const FLAVOUR: EngineFlavour = 'single';
const NODES = 2_000_000;
const HASH_MB = 64;
/** A line counts as won from +2.00. */
const WIN_CP = 200;
/** A defence holds down to -0.50. */
const HOLD_CP = -50;
/** A player's mistake must cost at least -1.00. */
const LOSS_CP = -100;
/**
 * Reliability compares the evaluation after the opponent's correct play with what the side
 * normally has out of the opening: White about +0.25, Black about -0.25. Giving up at most
 * 0.30 of that is "solid", at most 1.00 is "risky", more is "dubious".
 */
const BASELINE_CP = { white: 25, black: -25 } as const;
const SOLID_LOSS_CP = 30;
const RISKY_LOSS_CP = 100;

const ENGINE_ID = `stockfish ${enginePackageVersion()} (${FLAVOUR}, full network)`;
const BIG = 1_000_000;

const ALLOWED_EXPECT: Record<LineTag, Expect[]> = {
  trap: ['mate', 'win'],
  punish: ['mate', 'win'],
  decline: ['eval', 'win'],
  sound: ['eval'],
  hold: ['hold'],
  mistake: ['loss'],
};

interface Args {
  check: boolean;
  noCache: boolean;
  only: string | undefined;
  jobs: number;
}

function parseArgs(argv: string[]): Args {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    check: argv.includes('--check'),
    noCache: argv.includes('--no-cache'),
    only: value('--only'),
    jobs: Number(value('--jobs') ?? Math.min(4, Math.max(1, availableParallelism() - 1))),
  };
}

interface Replay {
  line: TrapLine;
  /** Set when a move is illegal or not written in exact SAN. */
  problem?: string;
  fen?: string;
  /** Side to move in the final position. */
  toMove?: 'white' | 'black';
  checkmate?: boolean;
}

function replay(line: TrapLine): Replay {
  const chess = new Chess();
  let moves;
  try {
    moves = parseMovetext(line.moves);
  } catch (error) {
    return { line, problem: String(error) };
  }
  for (const move of moves) {
    const number = `${Math.floor(move.ply / 2) + 1}${move.ply % 2 === 0 ? '.' : '...'}`;
    let played;
    try {
      played = chess.move(move.san);
    } catch {
      return { line, problem: `illegal move ${number}${move.san}` };
    }
    if (played.san !== move.san) {
      return { line, problem: `${number}${move.san} must be written as ${played.san}` };
    }
  }
  return {
    line,
    fen: chess.fen(),
    toMove: chess.turn() === 'w' ? 'white' : 'black',
    checkmate: chess.isCheckmate(),
  };
}

type Cache = Record<string, EngineResult>;

const cacheKey = (fen: string) => `${ENGINE_ID}|nodes=${NODES}|hash=${HASH_MB}|${fen}`;

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

/** A number that orders results: checkmate above any evaluation, being mated below. */
function valueOf(result: LineResult): number {
  if (result.end === 'checkmate') return BIG;
  if (result.end === 'checkmated') return -BIG;
  if (result.mate !== undefined) return result.mate > 0 ? BIG - result.mate : -BIG - result.mate;
  return result.cp ?? 0;
}

function judge(expect: Expect, result: LineResult): string | undefined {
  const value = valueOf(result);
  const shown = result.cp !== undefined ? (result.cp / 100).toFixed(2) : result.end ?? `mate ${result.mate}`;
  switch (expect) {
    case 'mate':
      return result.end === 'checkmate' ? undefined : 'the line does not end in checkmate by the player';
    case 'win':
      return value >= WIN_CP ? undefined : `not a win: ${shown} is below +${(WIN_CP / 100).toFixed(2)}`;
    case 'hold':
      return value >= HOLD_CP ? undefined : `the defence does not hold: ${shown}`;
    case 'loss':
      return value <= LOSS_CP ? undefined : `not a clear mistake: ${shown}`;
    case 'eval':
      return undefined;
  }
}

function reliabilityOf(cp: number, side: 'white' | 'black'): Reliability {
  const given = BASELINE_CP[side] - cp;
  return given <= SOLID_LOSS_CP ? 'solid' : given <= RISKY_LOSS_CP ? 'risky' : 'dubious';
}

function structuralProblems(trap: TrapFile, fileId: string): string[] {
  const problems: string[] = [];
  if (trap.id !== fileId) problems.push(`id "${trap.id}" does not match the file name`);
  if (!trap.title?.ru || !trap.title?.en) problems.push('title needs ru and en');
  if (!trap.idea?.ru || !trap.idea?.en) problems.push('idea needs ru and en');
  if (!Number.isInteger(trap.stage) || !trap.stageReason) problems.push('stage and stageReason are required');
  if (!trap.sources?.length || trap.sources.some((source) => !/^https:\/\//.test(source.url))) {
    problems.push('at least one source with an https URL is required');
  }
  const mains = trap.lines.filter((line) => line.main);
  if (mains.length !== 1) problems.push(`exactly one main line is required, found ${mains.length}`);
  const mainTag = trap.kind === 'trap' ? 'trap' : 'hold';
  if (mains[0] && mains[0].tag !== mainTag) problems.push(`the main line must be tagged "${mainTag}"`);
  for (const line of trap.lines) {
    if (!ALLOWED_EXPECT[line.tag]?.includes(line.expect)) {
      problems.push(`tag "${line.tag}" cannot expect "${line.expect}"`);
    }
  }
  if (trap.kind === 'trap' && !trap.lines.some((line) => line.tag === 'sound' || line.tag === 'decline')) {
    problems.push('a trap needs at least one "sound" or "decline" line (the honest branch)');
  }
  return problems;
}

/** Fixed key order, so files only change when their content changes. */
function serialise(trap: TrapFile): string {
  const ordered: TrapFile = {
    schema: trap.schema,
    id: trap.id,
    kind: trap.kind,
    title: trap.title,
    side: trap.side,
    repertoire: trap.repertoire,
    stage: trap.stage,
    stageReason: trap.stageReason,
    idea: trap.idea,
    sacrifice: trap.sacrifice,
    prerequisites: trap.prerequisites,
    lines: trap.lines.map((line) => ({
      tag: line.tag,
      ...(line.main ? { main: true } : {}),
      expect: line.expect,
      moves: line.moves,
      ...(line.note ? { note: line.note } : {}),
      ...(line.result ? { result: line.result } : {}),
    })),
    sources: trap.sources,
    ...(trap.notes ? { notes: trap.notes } : {}),
    ...(trap.draft ? { draft: true } : {}),
    verified: trap.verified ?? false,
    ...(trap.verification ? { verification: trap.verification } : {}),
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const files = readdirSync(TRAPS_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .filter((name) => !args.only || name === `${args.only}.json`);
  const traps = files.map((name) => ({
    name,
    path: join(TRAPS_DIR, name),
    original: readFileSync(join(TRAPS_DIR, name), 'utf8'),
    trap: JSON.parse(readFileSync(join(TRAPS_DIR, name), 'utf8')) as TrapFile,
  }));

  // 1. Replay every line with chess.js.
  const replays = new Map<TrapLine, Replay>();
  for (const { trap } of traps) for (const line of trap.lines) replays.set(line, replay(line));

  // 2. Evaluate every final position that is not checkmate, using the cache where possible.
  const cache: Cache = args.noCache ? {} : readJson<Cache>(CACHE_FILE, {});
  const needed = new Set<string>();
  for (const item of replays.values()) if (item.fen && !item.checkmate) needed.add(item.fen);
  const missing = [...needed].filter((fen) => !cache[cacheKey(fen)]);
  console.log(
    `verify: ${traps.length} traps, ${replays.size} lines, ${needed.size} positions to evaluate, ` +
      `${needed.size - missing.length} cached, ${missing.length} to search (${ENGINE_ID}, ${NODES} nodes, ${args.jobs} workers)`,
  );
  const started = Date.now();
  const fresh = await evaluateAll(
    missing,
    { flavour: FLAVOUR, hashMb: HASH_MB, nodes: NODES, jobs: args.jobs },
    (done, total) => {
      if (done % 10 === 0 || done === total) {
        console.log(`  searched ${done}/${total} (${Math.round((Date.now() - started) / 1000)} s)`);
      }
    },
  );
  for (const [fen, result] of fresh) cache[cacheKey(fen)] = result;

  // 3. Judge every line and every trap.
  for (const { trap, name } of traps) {
    const problems = structuralProblems(trap, name.replace(/\.json$/, ''));
    for (const [index, line] of trap.lines.entries()) {
      const item = replays.get(line);
      let result: LineResult;
      if (!item || item.problem || !item.fen || !item.toMove) {
        result = { ok: false, problem: item?.problem ?? 'not replayed' };
      } else if (item.checkmate) {
        // The side to move is the side that has been mated.
        result = { end: item.toMove === trap.side ? 'checkmated' : 'checkmate', ok: true };
      } else {
        const raw = cache[cacheKey(item.fen)];
        if (!raw) {
          result = { ok: false, problem: 'no evaluation' };
        } else {
          const sign = item.toMove === trap.side ? 1 : -1;
          result = {
            ...(raw.score.cp !== undefined ? { cp: sign * raw.score.cp } : {}),
            ...(raw.score.mate !== undefined ? { mate: sign * raw.score.mate } : {}),
            best: raw.best,
            ok: true,
          };
        }
      }
      if (result.ok) {
        const failure = judge(line.expect, result);
        if (failure) result = { ...result, ok: false, problem: failure };
      }
      if (!result.ok) problems.push(`line ${index + 1} (${line.tag}): ${result.problem}`);
      line.result = result;
    }

    const mainLine = trap.lines.find((line) => line.main);
    const shape = measureLine(mainLine ? safeParse(mainLine.moves) : [], trap.side);
    const correctPlayTags: LineTag[] =
      trap.kind === 'defence'
        ? ['hold']
        : trap.lines.some((line) => line.tag === 'sound')
          ? ['sound']
          : ['decline'];
    const correctPlay = trap.lines
      .filter((line) => correctPlayTags.includes(line.tag) && line.result && !line.result.problem?.startsWith('illegal'))
      .map((line) => valueOf(line.result as LineResult));
    const worst = correctPlay.length > 0 ? Math.min(...correctPlay) : null;

    const verification: Verification = {
      engine: ENGINE_ID,
      nodes: NODES,
      hashMb: HASH_MB,
      winCp: WIN_CP,
      holdCp: HOLD_CP,
      lossCp: LOSS_CP,
      setupMoves: shape.setupMoves,
      blowMoves: shape.blowMoves,
      firstBlowMove: shape.firstBlowMove,
      worstCorrectPlayCp: worst === null ? null : Math.max(-BIG, Math.min(BIG, worst)),
      reliability: worst === null ? null : reliabilityOf(worst, trap.side),
      problems,
    };
    trap.verification = verification;
    trap.verified = problems.length === 0;
  }

  // 4. Write (or compare) trap files, the cache and the catalogue.
  let outOfDate = 0;
  const update = (path: string, next: string, previous: string | undefined) => {
    if (previous === next) return;
    outOfDate++;
    if (args.check) console.log(`verify: out of date: ${path.slice(ROOT.length + 1)}`);
    else writeFileSync(path, next);
  };
  for (const item of traps) update(item.path, serialise(item.trap), item.original);

  if (!args.only) {
    // Keep only the positions that are still in use, in a stable order.
    const kept: Cache = {};
    for (const key of [...needed].map(cacheKey).sort()) {
      const entry = cache[key];
      if (entry) kept[key] = entry;
    }
    update(CACHE_FILE, `${JSON.stringify(kept, null, 1)}\n`, existsSync(CACHE_FILE) ? readFileSync(CACHE_FILE, 'utf8') : undefined);

    if (existsSync(ROADMAP_FILE)) {
      const roadmap = readFileSync(ROADMAP_FILE, 'utf8');
      const backlog = readJson<BacklogEntry[]>(BACKLOG_FILE, []);
      const ordered = traps.map((item) => item.trap).sort((a, b) => a.stage - b.stage || a.id.localeCompare(b.id));
      update(ROADMAP_FILE, injectCatalog(roadmap, renderCatalog(ordered, backlog)), roadmap);
    }
  }

  // 5. Report.
  const counts = { verified: 0, unverified: 0, failed: 0 };
  for (const { trap } of traps) {
    const status = trapStatus(trap);
    counts[status]++;
    if (status !== 'verified') {
      console.log(`\n${status.toUpperCase()}: ${trap.id}`);
      for (const problem of trap.verification?.problems ?? []) console.log(`  - ${problem}`);
    }
  }
  console.log(
    `\nverify: ${counts.verified} verified, ${counts.failed} failed, ${counts.unverified} unverified drafts` +
      (args.check ? `, ${outOfDate} files out of date` : `, ${outOfDate} files written`),
  );
  if (counts.failed > 0 || (args.check && outOfDate > 0)) process.exitCode = 1;
}

function safeParse(moves: string) {
  try {
    return parseMovetext(moves);
  } catch {
    return [];
  }
}

await main();
