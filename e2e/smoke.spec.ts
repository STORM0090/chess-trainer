import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

type Side = 'white' | 'black';

/** Taps the middle of a square on a board shown from `side`. */
async function tapSquare(page: Page, square: string, side: Side): Promise<void> {
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

async function playMove(page: Page, move: string, side: Side): Promise<void> {
  await tapSquare(page, move.slice(0, 2), side);
  await tapSquare(page, move.slice(2, 4), side);
}

async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'the page must not scroll sideways').toBeLessThanOrEqual(0);
}

/** Collects everything the browser reports as an error. */
function watchForErrors(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  return problems;
}

test('the list and the View screen work on a phone screen', async ({ page }) => {
  const problems = watchForErrors(page);

  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Ловушки' })).toBeVisible();
  await expect(page.locator('.trap-card')).toHaveCount(32);
  await expect(page.getByText('Освоено 0 из 32')).toBeVisible();
  // Only the first trap of the ladder is open for practice.
  await expect(page.locator('.trap-card-locked')).toHaveCount(31);
  await expectNoSidewaysScroll(page);

  // Viewing is open for every trap, also for a closed one.
  await page.getByRole('link', { name: /Мат Легаля/ }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Мат Легаля' })).toBeVisible();
  const viewport = page.viewportSize();
  const board = await page.locator('.board cg-board').boundingBox();
  expect(board && viewport && board.width / viewport.width, 'full-width board').toBeGreaterThan(0.9);
  await page.getByRole('button', { name: 'Ход вперёд' }).tap();
  await expect(page.locator('.move-current')).toHaveText('e4');
  await expect(page.getByText(/Практика пока закрыта/)).toBeVisible();
  await expectNoSidewaysScroll(page);

  // A practice screen of a closed trap explains itself instead of starting.
  await page.goto('./#/trap/legal-mate/chain');
  await expect(page.getByText(/Практика пока закрыта/)).toBeVisible();
  await expect(page.locator('.board')).toHaveCount(0);

  expect(problems, 'errors in the browser console').toEqual([]);
});

test('a trap is chained, saved, reviewed, exported and imported', async ({ page }) => {
  const problems = watchForErrors(page);
  // The review picks its line at random; 0 always gives the main line.
  await page.addInitScript(() => {
    Math.random = () => 0;
  });

  // Fool's Mate, played as Black: 1.f3 e5 2.g4 Qh4#.
  await page.goto('./');
  await page.getByRole('link', { name: /Начать цепочку/ }).tap();
  await expect(page.getByText('Цепочка: шаг 1 из 2')).toBeVisible();
  const status = page.locator('.learn-screen .status');
  await expect(status).toHaveText('Ваш ход');

  // Step 1 is the mating move alone. A wrong move first: the step must be repeated.
  await playMove(page, 'a7a6', 'black');
  await expect(page.locator('.feedback')).toContainText('Не тот ход.');
  await playMove(page, 'd8h4', 'black');
  await expect(status).toHaveText('Шаг завершён');
  await expect(page.getByText('Ошибок: 1, подсказок: 0.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Следующий шаг' })).toHaveCount(0);
  const repeat = page.getByRole('button', { name: 'Повторить шаг' });
  await expect(repeat).toBeInViewport();
  await repeat.tap();
  await expect(status).toHaveText('Ваш ход');
  await playMove(page, 'd8h4', 'black');
  await expect(page.getByText('Шаг пройден без ошибок и подсказок.')).toBeVisible();
  // The reviewed text about the line, with its source mark.
  await expect(page.getByText(/Ход f3 открыл диагональ от h4 к королю/)).toBeVisible();
  await expect(page.getByText('Проверено по доске.')).toBeVisible();

  // Step 2 starts at move 1: White moves first, by itself.
  await page.getByRole('button', { name: 'Следующий шаг' }).tap();
  await expect(page.getByText('Цепочка: шаг 2 из 2')).toBeVisible();
  await expect(page.locator('.movelist-item')).toHaveCount(1);
  await playMove(page, 'e7e5', 'black');
  await expect(page.locator('.movelist-item')).toHaveCount(3);
  await playMove(page, 'd8h4', 'black');
  await expect(page.getByText(/Ловушка изучена/)).toBeVisible();
  await expectNoSidewaysScroll(page);

  // The progress survives a reload.
  await page.goto('./');
  await page.reload();
  const card = page.locator('.trap-card', { hasText: 'Дурацкий мат' }).first();
  await expect(card).toContainText('Изучена');
  await expect(page.getByText(/Новая ловушка откроется, когда вы повторите «Дурацкий мат»/)).toBeVisible();
  await expect(page.locator('.trap-card-locked')).toHaveCount(31);

  // The review opens the next day: move the app's clock instead of waiting.
  await page.getByRole('link', { name: 'Данные' }).tap();
  await page.getByRole('button', { name: 'На день вперёд' }).tap();
  await expect(page.getByText('Часы приложения: +1 дн.')).toBeVisible();
  await page.getByRole('link', { name: 'Ловушки' }).tap();
  await page.getByRole('link', { name: 'Повторить сегодня: 1' }).tap();
  await expect(status).toHaveText('Ходит соперник…');
  await expect(page.locator('.movelist-item')).toHaveCount(1);
  await playMove(page, 'e7e5', 'black');
  await expect(page.locator('.movelist-item')).toHaveCount(3);
  await playMove(page, 'd8h4', 'black');
  await expect(status).toHaveText('Повторение завершено');
  await expect(page.getByText('Ловушка освоена.')).toBeVisible();
  await expect(page.getByText('Открыта следующая ловушка: «Дурацкий мат за белых».')).toBeVisible();

  // Learn mode of an open trap: all lines in a row, with a skip button.
  await page.goto('./#/trap/fools-mate/learn');
  await expect(page.getByText(/Вариант 1 из \d+/)).toBeVisible();
  await page.getByRole('button', { name: 'Пропустить вариант' }).tap();
  await expect(page.getByText(/Вариант 2 из \d+/)).toBeVisible();

  // A game from real life, then the export.
  await page.goto('./#/trap/fools-mate');
  await page.getByRole('button', { name: 'Соперник не попался' }).tap();
  await expect(page.getByText('Сработала: 0. Не попался: 1. Знал опровержение: 0.')).toBeVisible();
  await page.goto('./#/data');
  await expect(page.getByText('Ловушек с прогрессом: 1. Освоено: 1. Записей о партиях: 1.')).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Сохранить файл' }).tap();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^chess-trainer-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  const file = JSON.parse(await readFile(path, 'utf8'));
  expect(file).toMatchObject({ app: 'chess-trainer', format: 2 });
  expect(file.data.traps['fools-mate']).toMatchObject({ chainDepth: 2, reviews: 1 });
  expect(file.data.traps['fools-mate'].masteredAt).not.toBeNull();

  // Wipe the device, then bring the progress back from the file.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('chess-trainer');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const stores = ['traps', 'games', 'settings', 'puzzles'];
          const tx = open.result.transaction(stores, 'readwrite');
          for (const name of stores) tx.objectStore(name).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await expect(page.getByText('Ловушек с прогрессом: 0. Освоено: 0. Записей о партиях: 0.')).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"app":"chess-trainer","format":1,"data":{}}'),
  });
  await expect(page.getByText(/Файл повреждён/)).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(path);
  await expect(page.getByText(/Ловушек с прогрессом: 1, записей о партиях: 1\./)).toBeVisible();
  await page.getByRole('button', { name: 'Заменить данные на устройстве' }).tap();
  await expect(page.getByText('Данные из файла загружены.')).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Ловушки' }).tap();
  await expect(page.getByText('Освоено 1 из 32')).toBeVisible();
  await expect(page.locator('.trap-card-locked')).toHaveCount(30);

  // "Я это знаю": the second trap is learned without the chain and the third one opens.
  // The card, not the button of the top block: that one starts the chain.
  await page.locator('.trap-card', { hasText: 'Дурацкий мат за белых' }).tap();
  await page.getByRole('button', { name: 'Я это знаю' }).tap();
  await expect(page.getByText(/Отметить ловушку как знакомую/)).toBeVisible();
  await page.getByRole('button', { name: 'Отмена' }).tap();
  await expect(page.getByText(/Отметить ловушку как знакомую/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Я это знаю' }).tap();
  await page.getByRole('button', { name: 'Да, знаю' }).tap();
  await expect(page.getByText(/Вы отметили, что знаете эту ловушку/)).toBeVisible();
  await expect(page.getByText(/Следующее повторение: завтра/)).toBeVisible();
  await page.getByRole('link', { name: 'Ловушки' }).tap();
  await expect(page.getByText('Освоено 1 из 32')).toBeVisible();
  await expect(page.locator('.trap-card-locked')).toHaveCount(29);
  await expect(page.getByRole('link', { name: /Детский мат\s*Начать цепочку/ })).toBeVisible();

  expect(problems, 'errors in the browser console').toEqual([]);
});

interface PuzzleRow {
  id: string;
  fen: string;
  moves: string;
}

const PROMOTION_NAME: Record<string, string> = { q: 'Ферзь', r: 'Ладья', b: 'Слон', n: 'Конь' };

/** Plays the solution of the puzzle on the screen. With `hint` it asks for one hint first. */
async function solvePuzzle(page: Page, puzzles: Map<string, PuzzleRow>, hint = false): Promise<string> {
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

test('the entry test sets the level and puzzles are served by theme', async ({ page }) => {
  const problems = watchForErrors(page);
  const file = JSON.parse(await readFile('content/puzzles/lichess.json', 'utf8')) as { puzzles: PuzzleRow[] };
  const puzzles = new Map(file.puzzles.map((puzzle) => [puzzle.id, puzzle]));

  await page.goto('./');
  await page.getByRole('link', { name: 'Задачи' }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Задачи' })).toBeVisible();
  await expect(page.locator('.trap-card')).toHaveCount(9);
  await expect(page.getByText(/Уровень пока не определён/)).toBeVisible();
  await expectNoSidewaysScroll(page);

  // Ten puzzles. The fifth is solved with a hint, so it does not count: level 3 of 5.
  await page.getByRole('link', { name: 'Пройти тест' }).tap();
  await page.getByRole('button', { name: 'Начать тест' }).tap();
  for (let number = 1; number <= 10; number++) {
    await expect(page.getByRole('heading', { level: 1, name: `Тест: задача ${number} из 10` })).toBeVisible();
    await solvePuzzle(page, puzzles, number === 5);
    await expect(
      page.getByText(number === 5 ? 'Не засчитано. Ошибок: 0, подсказок: 1.' : 'Засчитано.', { exact: true }),
    ).toBeVisible();
    await expectNoSidewaysScroll(page);
    await page.getByRole('button', { name: number === 10 ? 'Показать результат' : 'Следующая задача' }).tap();
  }
  await expect(page.getByText('Ваш уровень: 3 из 5. Рейтинг задач: 800–1100.')).toBeVisible();
  await expect(page.getByText('Засчитано задач: 9 из 10.')).toBeVisible();
  await expect(page.getByText('Уровень 3 (800–1100): 1 из 2')).toBeVisible();

  // The level is saved.
  await page.getByRole('link', { name: 'К задачам' }).tap();
  await page.reload();
  await expect(page.getByText('Уровень 3 из 5. Рейтинг задач: 800–1100.')).toBeVisible();

  // Puzzles of one theme, one after another.
  await page.locator('.trap-card', { hasText: 'Мат в 1 ход' }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Мат в 1 ход' })).toBeVisible();
  const first = await solvePuzzle(page, puzzles);
  await expect(page.getByText('Решено без ошибок и подсказок.')).toBeVisible();
  const rating = puzzles.get(first) as PuzzleRow & { rating: number };
  expect(rating.rating).toBeGreaterThanOrEqual(800);
  expect(rating.rating).toBeLessThan(1100);
  await page.getByRole('button', { name: 'Следующая задача' }).tap();
  await expect(page.locator('[data-puzzle]')).not.toHaveAttribute('data-puzzle', first);
  const second = await solvePuzzle(page, puzzles, true);
  expect(second).not.toBe(first);
  await expect(page.getByText('Ошибок: 0, подсказок: 1. Задача вернётся в другой день.')).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.goto('./#/data');
  await expect(page.getByText(/Задач решено чисто: \d+\. Уровень в задачах: 3 \/ 5\./)).toBeVisible();

  expect(problems, 'errors in the browser console').toEqual([]);
});
