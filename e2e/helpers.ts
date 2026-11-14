import { readFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';

export type Side = 'white' | 'black';

/** Taps the middle of a square on a board shown from `side`. */
export async function tapSquare(page: Page, square: string, side: Side): Promise<void> {
  const board = page.locator('.board cg-board');
  await board.scrollIntoViewIfNeeded();
  const box = await board.boundingBox();
  if (!box) throw new Error('The board is not on the page');
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = Number(square[1]) - 1;
  const column = side === 'white' ? file : 7 - file;
  const row = side === 'white' ? 7 - rank : rank;
  const size = box.width / 8;
  await page.touchscreen.tap(box.x + (column + 0.5) * size, box.y + (row + 0.5) * size);
}

export async function playMove(page: Page, move: string, side: Side): Promise<void> {
  await tapSquare(page, move.slice(0, 2), side);
  await tapSquare(page, move.slice(2, 4), side);
}

export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'the page must not scroll sideways').toBeLessThanOrEqual(0);
}

/** Collects everything the browser reports as an error. */
export function watchForErrors(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  return problems;
}

export interface PuzzleRow {
  id: string;
  fen: string;
  moves: string;
  rating: number;
}

/** The committed puzzle file, by puzzle id: the tests read the solutions from it. */
export async function loadPuzzles(): Promise<Map<string, PuzzleRow>> {
  const file = JSON.parse(await readFile('content/puzzles/lichess.json', 'utf8')) as { puzzles: PuzzleRow[] };
  return new Map(file.puzzles.map((puzzle) => [puzzle.id, puzzle]));
}

const PROMOTION_NAME: Record<string, string> = { q: 'Ферзь', r: 'Ладья', b: 'Слон', n: 'Конь' };

/** Plays the solution of the puzzle on the screen. With `hint` it asks for one hint first. */
export async function solvePuzzle(page: Page, puzzles: Map<string, PuzzleRow>, hint = false): Promise<string> {
  const id = (await page.locator('[data-puzzle]').getAttribute('data-puzzle')) ?? '';
  const puzzle = puzzles.get(id);
  if (!puzzle) throw new Error(`The puzzle "${id}" is not in the puzzle file`);
  // The side to move in the position is the opponent.
  const side: Side = puzzle.fen.split(' ')[1] === 'w' ? 'black' : 'white';
  const moves = puzzle.moves.split(' ');
  const status = page.locator('.learn-screen .status');
  for (let index = 1; index < moves.length; index += 2) {
    const move = moves[index] ?? '';
    // The opponent's move is on the board when the list has it.
    await expect(page.locator('.movelist-item')).toHaveCount(index);
    await expect(status).toHaveText('Ваш ход');
    if (hint && index === 1) await page.getByRole('button', { name: 'Подсказка' }).tap();
    await playMove(page, move, side);
    const piece = PROMOTION_NAME[move.slice(4)];
    if (piece) await page.getByRole('button', { name: piece }).tap();
  }
  await expect(status).toHaveText('Задача завершена');
  return id;
}

/** Moves the app's test clock one day forward ("Данные" screen) and comes back to `hash`. */
export async function nextDay(page: Page, hash = '#/'): Promise<void> {
  await page.goto('./#/data');
  await page.getByRole('button', { name: 'На день вперёд' }).tap();
  await expect(page.getByText(/Часы приложения: \+\d+ дн\./)).toBeVisible();
  await page.goto(`./${hash}`);
}
