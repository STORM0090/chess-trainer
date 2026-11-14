// Shape of content/puzzles/*.json and the tactics levels. Shared by the Node scripts and the app.

/** Lichess puzzle theme keys used by the app, in the order the levels introduce them. */
export const PUZZLE_THEMES = [
  'mateIn1',
  'hangingPiece',
  'fork',
  'backRankMate',
  'discoveredAttack',
  'pin',
  'skewer',
  'mateIn2',
  'deflection',
] as const;

export type PuzzleTheme = (typeof PUZZLE_THEMES)[number];

/**
 * One puzzle, as in the Lichess database: `fen` is the position before the opponent's move,
 * the first move of `moves` is that move, and then the player and the opponent alternate.
 * The player always makes the last move.
 */
export interface PuzzleEntry {
  /** Lichess puzzle id. */
  id: string;
  fen: string;
  /** Moves in UCI notation, separated by spaces: "d1h5 d5g2". */
  moves: string;
  /** Lichess puzzle rating. It is not the chess.com scale. */
  rating: number;
  /** Themes of the puzzle that the app uses; other Lichess themes are dropped. */
  themes: PuzzleTheme[];
}

export interface PuzzleFile {
  schema: 1;
  source: {
    name: string;
    url: string;
    license: string;
    /** SHA-256 and size of the downloaded archive, and the number of puzzles in it. */
    sha256: string;
    bytes: number;
    rows: number;
  };
  selection: {
    perBucket: number;
    bucketSize: number;
    minPopularity: number;
    minPlays: number;
    maxRatingDeviation: number;
    maxPlayerMoves: number;
  };
  puzzles: PuzzleEntry[];
}

export interface TacticsLevel {
  /** Rating band: from `min` (included) to `max` (not included). */
  min: number;
  max: number;
  /** Themes that start on this level. A level also serves the themes of the levels below. */
  themes: readonly PuzzleTheme[];
}

/**
 * Tactics levels T0-T4 of content/ROADMAP.md, section 4. Levels T3 and T4 add no themes of
 * their own yet: their new themes wait for the owner's approval, so they serve the nine
 * approved themes at a higher rating.
 */
export const TACTICS_LEVELS: readonly TacticsLevel[] = [
  { min: 400, max: 700, themes: ['mateIn1', 'hangingPiece'] },
  { min: 600, max: 900, themes: ['fork', 'backRankMate', 'discoveredAttack'] },
  { min: 800, max: 1100, themes: ['pin', 'skewer', 'mateIn2', 'deflection'] },
  { min: 1000, max: 1250, themes: [] },
  { min: 1150, max: 1400, themes: [] },
];

export const TOP_LEVEL = TACTICS_LEVELS.length - 1;

/** The level that introduces a theme. */
export function themeLevel(theme: PuzzleTheme): number {
  const level = TACTICS_LEVELS.findIndex((candidate) => candidate.themes.includes(theme));
  return level < 0 ? 0 : level;
}

export function isPuzzleTheme(value: unknown): value is PuzzleTheme {
  return typeof value === 'string' && (PUZZLE_THEMES as readonly string[]).includes(value);
}
