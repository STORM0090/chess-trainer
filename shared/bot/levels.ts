// The bot's ladder. Each level is a point on the strength scale of `policy.ts`, chosen so
// that neighbouring levels are about the same distance apart in the calibration matches of
// `scripts/bot-calibrate.ts` (run "grid-v1" in content/bot/calibration.json): about 100
// rating points, which means the stronger level scores roughly 64% against the weaker one.
//
// The ratings are relative: 0 is the weakest bot, and nothing here was measured against
// people. A chess.com or Lichess rating for a level is not known and is not shown.

export interface BotLevel {
  /** Shown to the player, from 1. */
  number: number;
  strength: number;
  /** Rating on the calibration scale (weakest bot = 0), from the matches. */
  rating: number;
}

/** Strengths interpolated from the calibration grid at ratings 0, 100, ..., 1000, 1150, 1300. */
export const BOT_LEVELS: readonly BotLevel[] = [
  { number: 1, strength: 0, rating: 0 },
  { number: 2, strength: 0.189, rating: 100 },
  { number: 3, strength: 0.337, rating: 200 },
  { number: 4, strength: 0.458, rating: 300 },
  { number: 5, strength: 0.55, rating: 400 },
  { number: 6, strength: 0.631, rating: 500 },
  { number: 7, strength: 0.695, rating: 600 },
  { number: 8, strength: 0.757, rating: 700 },
  { number: 9, strength: 0.811, rating: 800 },
  { number: 10, strength: 0.866, rating: 900 },
  { number: 11, strength: 0.9, rating: 1000 },
  { number: 12, strength: 0.944, rating: 1150 },
  { number: 13, strength: 0.989, rating: 1300 },
];

export function botLevel(number: number): BotLevel {
  const index = Math.min(Math.max(Math.round(number), 1), BOT_LEVELS.length) - 1;
  const level = BOT_LEVELS[index];
  if (!level) throw new Error('no bot levels');
  return level;
}

/**
 * The next level to offer after a game: up after a win, down after two losses in a row at
 * the same level, otherwise the same. A draw counts as neither. Never below 1 or above the top.
 */
export function nextBotLevel(current: number, results: ('win' | 'draw' | 'loss')[]): number {
  const last = results.at(-1);
  if (last === 'win') return Math.min(current + 1, BOT_LEVELS.length);
  if (last === 'loss' && results.at(-2) === 'loss') return Math.max(current - 1, 1);
  return current;
}
