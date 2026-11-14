import { describe, expect, it } from 'vitest';
import {
  PUZZLE_THEMES,
  TACTICS_LEVELS,
  isPuzzleTheme,
  themeLevel,
  type PuzzleFile,
} from '../shared/puzzle-types.ts';
import { compilePuzzle } from '../src/core/puzzle-model';
import { pickTestPuzzles, TEST_SIZE } from '../src/core/tactics';

// The committed puzzle file, as the app ships it.
const files = import.meta.glob<PuzzleFile>('../content/puzzles/lichess.json', { eager: true, import: 'default' });
const file = Object.values(files)[0] as PuzzleFile;
const MATE_THEMES = ['mateIn1', 'mateIn2', 'backRankMate'];

describe('content/puzzles/lichess.json', () => {
  it('names its source and license', () => {
    expect(file.schema).toBe(1);
    expect(file.source.license).toBe('CC0-1.0');
    expect(file.source.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('has unique puzzles with known themes inside the rating range', () => {
    expect(new Set(file.puzzles.map((puzzle) => puzzle.id)).size).toBe(file.puzzles.length);
    const min = TACTICS_LEVELS[0]?.min ?? 0;
    const max = TACTICS_LEVELS.at(-1)?.max ?? 0;
    for (const puzzle of file.puzzles) {
      expect(puzzle.id).toMatch(/^[A-Za-z0-9]{1,12}$/);
      expect(puzzle.themes.length).toBeGreaterThan(0);
      expect(puzzle.themes.every(isPuzzleTheme)).toBe(true);
      expect(puzzle.rating).toBeGreaterThanOrEqual(min);
      expect(puzzle.rating).toBeLessThan(max);
      // Only what the app needs: no links to games, no names.
      expect(Object.keys(puzzle).sort()).toEqual(['fen', 'id', 'moves', 'rating', 'themes']);
    }
  });

  it('plays every puzzle to the end with legal moves', () => {
    for (const entry of file.puzzles) {
      const puzzle = compilePuzzle(entry);
      const steps = puzzle.line.steps;
      const last = steps.at(-1);
      expect(steps.length % 2, entry.id).toBe(0);
      expect(steps.length, entry.id).toBeLessThanOrEqual(file.selection.maxPlayerMoves * 2);
      expect(steps[0]?.mover, entry.id).not.toBe(puzzle.side);
      expect(last?.mover, entry.id).toBe(puzzle.side);
      if (entry.themes.some((theme) => MATE_THEMES.includes(theme))) expect(last?.kind, entry.id).toBe('mate');
    }
  });

  it('has enough puzzles for every theme on every level that serves it', () => {
    for (const theme of PUZZLE_THEMES) {
      TACTICS_LEVELS.forEach((level, index) => {
        if (index < themeLevel(theme)) return;
        const count = file.puzzles.filter(
          (puzzle) => puzzle.themes.includes(theme) && puzzle.rating >= level.min && puzzle.rating < level.max,
        ).length;
        expect(count, `${theme} on level ${index}`).toBeGreaterThanOrEqual(50);
      });
    }
  });

  it('gives a full entry test whatever the random numbers are', () => {
    for (const value of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(pickTestPuzzles(file.puzzles, () => value)).toHaveLength(TEST_SIZE);
    }
  });
});
