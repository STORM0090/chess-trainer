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
  expect(file).toMatchObject({ app: 'chess-trainer', format: 1 });
  expect(file.data.traps['fools-mate']).toMatchObject({ chainDepth: 2, reviews: 1 });
  expect(file.data.traps['fools-mate'].masteredAt).not.toBeNull();

  // Wipe the device, then bring the progress back from the file.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('chess-trainer');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(['traps', 'games', 'settings'], 'readwrite');
          for (const name of ['traps', 'games', 'settings']) tx.objectStore(name).clear();
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
