// Measures the bot's strength scale by matches of the bot against itself, on the bundled
// lite engine with fixed node counts. Reproducible: every game has its own seed.
//
//   node scripts/bot-calibrate.ts --players 0,0.125,0.25,... --games 40 [--reach 2]
//        [--references] [--jobs 6] [--out content/bot/calibration.json] [--label grid]
//
// Every player meets the players up to `reach` places away from it in the list, `games`
// times, with colours alternating. The result is a table of scores and a rating for every
// player (maximum likelihood, the weakest player at 0). A rating difference means only
// "how these players score against each other"; nothing here is measured against people.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { Worker } from 'node:worker_threads';
import { paramsFor } from '../shared/bot/policy.ts';
import type { GameJob, GameResult, Player } from './lib/bot-match.ts';

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const strengths = arg('players', '0,0.125,0.25,0.375,0.5,0.625,0.75,0.875,1').split(',').map(Number);
const games = Number(arg('games', '40'));
const reach = Number(arg('reach', '2'));
const jobsCount = Math.max(1, Number(arg('jobs', String(Math.min(6, availableParallelism() - 1)))));
const out = arg('out', 'content/bot/calibration.json');
const label = arg('label', 'grid');

const players: Player[] = strengths.map((strength) => ({ name: `s${strength.toFixed(3)}`, strength }));
if (has('references')) {
  // The engine's own limiters at the top of the scale, as landmarks. "UCI_Elo 1320" is the
  // lowest setting the engine offers.
  players.push({ name: 'skill0', reference: { option: 'Skill Level', value: 0, nodes: 12_000 } });
  players.push({ name: 'elo1320', reference: { option: 'UCI_Elo', value: 1320, nodes: 12_000 } });
}

const jobs: GameJob[] = [];
for (let a = 0; a < players.length; a++) {
  for (let b = a + 1; b < players.length; b++) {
    const first = players[a];
    const second = players[b];
    if (!first || !second) continue;
    const bothBots = first.strength !== undefined && second.strength !== undefined;
    // References meet the three strongest bot players.
    const near = bothBots ? b - a <= reach : (first.strength !== undefined && a >= strengths.length - 3) || !bothBots && first.reference !== undefined;
    if (!near) continue;
    for (let game = 0; game < games; game++) {
      const white = game % 2 === 0 ? first : second;
      const black = game % 2 === 0 ? second : first;
      jobs.push({ id: jobs.length, white, black, seed: (a * 1000 + b) * 100_000 + game + 1 });
    }
  }
}

console.log(`${players.length} players, ${jobs.length} games, ${jobsCount} workers`);
const started = Date.now();
const results: GameResult[] = [];
let searches = 0;
let cached = 0;
await Promise.all(
  Array.from({ length: jobsCount }, (_, index) => {
    const own = jobs.filter((job) => job.id % jobsCount === index);
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./lib/bot-match.ts', import.meta.url), { workerData: { jobs: own } });
      worker.on('message', (message: GameResult | { done: true; searches: number; cached: number }) => {
        if ('done' in message) {
          searches += message.searches;
          cached += message.cached;
          resolve();
        } else {
          results.push(message);
          if (results.length % 50 === 0) console.log(`  ${results.length} / ${jobs.length} games`);
        }
      });
      worker.on('error', reject);
    });
  }),
);
results.sort((a, b) => a.id - b.id);
const seconds = Math.round((Date.now() - started) / 1000);

// --- Ratings ------------------------------------------------------------------------------

const names = players.map((player) => player.name);
const points = new Map<string, number>();
const played = new Map<string, number>();
const pairKey = (a: string, b: string) => `${a}|${b}`;
for (const result of results) {
  points.set(pairKey(result.white, result.black), (points.get(pairKey(result.white, result.black)) ?? 0) + result.score);
  points.set(pairKey(result.black, result.white), (points.get(pairKey(result.black, result.white)) ?? 0) + 1 - result.score);
  for (const key of [pairKey(result.white, result.black), pairKey(result.black, result.white)]) {
    played.set(key, (played.get(key) ?? 0) + 1);
  }
}
// Bradley-Terry by minorisation. One virtual draw per pairing keeps a 100% score finite.
const strength = new Map(names.map((name) => [name, 1]));
for (let round = 0; round < 2000; round++) {
  for (const name of names) {
    let wins = 0;
    let denominator = 0;
    for (const opponent of names) {
      const count = played.get(pairKey(name, opponent));
      if (!count) continue;
      wins += (points.get(pairKey(name, opponent)) ?? 0) + 0.5;
      denominator += (count + 1) / ((strength.get(name) ?? 1) + (strength.get(opponent) ?? 1));
    }
    if (denominator > 0) strength.set(name, wins / denominator);
  }
}
const raw = new Map(names.map((name) => [name, 400 * Math.log10(strength.get(name) ?? 1)]));
const base = Math.min(...names.filter((name) => name.startsWith('s')).map((name) => raw.get(name) ?? 0));
const rating = (name: string) => Math.round((raw.get(name) ?? 0) - base);

const summary = players.map((player) => {
  const mine = results.filter((result) => result.white === player.name || result.black === player.name);
  const sides = mine.map((result) => (result.white === player.name ? result.stats.white : result.stats.black));
  const total = (pick: (side: (typeof sides)[number]) => number) => sides.reduce((sum, side) => sum + pick(side), 0);
  const moves = total((side) => side.moves);
  const rated = total((side) => side.rated);
  return {
    name: player.name,
    strength: player.strength ?? null,
    params: player.strength === undefined ? null : paramsFor(player.strength),
    reference: player.reference ?? null,
    rating: rating(player.name),
    games: mine.length,
    score: mine.reduce((sum, result) => sum + (result.white === player.name ? result.score : 1 - result.score), 0),
    tunnelShare: moves > 0 ? Number((total((side) => side.tunnel) / moves).toFixed(3)) : 0,
    averageLossCp: rated > 0 ? Math.round(total((side) => side.loss) / rated) : null,
    blundersPer100: rated > 0 ? Number(((100 * total((side) => side.blunders)) / rated).toFixed(1)) : null,
  };
});
const pairs = [...played.keys()]
  .filter((key) => {
    const [a, b] = key.split('|');
    return names.indexOf(a ?? '') < names.indexOf(b ?? '');
  })
  .map((key) => {
    const [a, b] = key.split('|');
    return { a, b, games: played.get(key) ?? 0, scoreOfA: points.get(key) ?? 0 };
  });
const ends = { mate: 0, draw: 0, material: 0, long: 0 };
for (const result of results) ends[result.end]++;
const run = {
  label,
  engine: 'Stockfish 19 Lite WASM (the stockfish npm package, lite-single)',
  games: results.length,
  gamesPerPairing: games,
  reach,
  ends,
  averagePlies: Math.round(results.reduce((sum, result) => sum + result.plies, 0) / Math.max(1, results.length)),
  players: summary,
  pairs,
};

mkdirSync(dirname(out), { recursive: true });
const file: { runs: (typeof run)[] } = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : { runs: [] };
file.runs = [...file.runs.filter((other) => other.label !== label), run];
writeFileSync(out, `${JSON.stringify(file, null, 2)}\n`);

console.log(`${results.length} games in ${seconds} s; ${searches} searches, ${cached} from the cache`);
console.log(`ends: ${JSON.stringify(ends)}; average length ${run.averagePlies} plies`);
for (const player of summary) {
  console.log(
    `${player.name.padEnd(8)} rating ${String(player.rating).padStart(5)}  score ${player.score}/${player.games}` +
      `  tunnel ${player.tunnelShare}  loss ${player.averageLossCp ?? '-'} cp  blunders ${player.blundersPer100 ?? '-'}/100`,
  );
}
