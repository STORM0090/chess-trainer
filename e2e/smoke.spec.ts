import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  NO_TEST_CLOCK,
  databaseName,
  expectNoSidewaysScroll,
  loadPuzzles,
  playMove,
  solvePuzzle,
  testClock,
  watchForErrors,
} from './helpers.ts';

test('the list and the View screen work on a phone screen', async ({ page }) => {
  const problems = watchForErrors(page);

  await page.goto('./#/traps');
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
  // The site root has no test clock; the stage branch ran this test on the same tree.
  test.skip(!testClock, NO_TEST_CLOCK);
  const problems = watchForErrors(page);
  // The review picks its line at random; 0 always gives the main line.
  await page.addInitScript(() => {
    Math.random = () => 0;
  });

  // Fool's Mate, played as Black: 1.f3 e5 2.g4 Qh4#.
  await page.goto('./#/traps');
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
  await page.goto('./#/traps');
  await page.reload();
  const card = page.locator('.trap-card', { hasText: 'Дурацкий мат' }).first();
  await expect(card).toContainText('Изучена');
  await expect(page.getByText(/Новая ловушка откроется, когда вы повторите «Дурацкий мат»/)).toBeVisible();
  await expect(page.locator('.trap-card-locked')).toHaveCount(31);

  // The review opens the next day: move the app's clock instead of waiting.
  await page.goto('./#/data');
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
  expect(file).toMatchObject({ app: 'chess-trainer', format: 4 });
  expect(file.data.traps['fools-mate']).toMatchObject({ chainDepth: 2, reviews: 1 });
  expect(file.data.traps['fools-mate'].masteredAt).not.toBeNull();

  // Wipe the device, then bring the progress back from the file.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('chess-trainer');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const stores = ['traps', 'games', 'settings', 'puzzles', 'days'];
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

test('the entry test sets the level and puzzles are served by theme', async ({ page }) => {
  const problems = watchForErrors(page);
  const puzzles = await loadPuzzles();

  await page.goto('./');
  await page.getByRole('link', { name: 'Задачи', exact: true }).tap();
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
  const rating = puzzles.get(first)?.rating ?? 0;
  expect(rating).toBeGreaterThanOrEqual(800);
  expect(rating).toBeLessThan(1100);
  await page.getByRole('button', { name: 'Следующая задача' }).tap();
  await expect(page.locator('[data-puzzle]')).not.toHaveAttribute('data-puzzle', first);
  const second = await solvePuzzle(page, puzzles, true);
  expect(second).not.toBe(first);
  await expect(page.getByText('Ошибок: 0, подсказок: 1. Задача вернётся на повторение.')).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.goto('./#/data');
  await expect(page.getByText(/Задач решено чисто: \d+\. Уровень в задачах: 3 \/ 5\./)).toBeVisible();

  expect(problems, 'errors in the browser console').toEqual([]);
});

test('the site root has no test clock', async ({ page }) => {
  test.skip(testClock, 'this build has the test clock');
  await page.goto('./#/data');
  await expect(page.getByRole('button', { name: 'Сохранить файл' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'На день вперёд' })).toHaveCount(0);
});

test('a database upgraded by a newer build is shown read-only and can be saved', async ({ page }) => {
  // Make the database as a newer build would leave it, from a page of the same origin that is
  // not the app, so no connection of the app is open.
  await page.goto('./manifest.webmanifest');
  await page.evaluate(async (name) => {
    await new Promise<void>((resolve, reject) => {
      const removing = indexedDB.deleteDatabase(name);
      removing.onsuccess = () => resolve();
      removing.onerror = () => reject(removing.error);
    });
    await new Promise<void>((resolve, reject) => {
      const opening = indexedDB.open(name, 99);
      opening.onupgradeneeded = () => {
        const db = opening.result;
        for (const store of ['traps', 'games', 'puzzles', 'own']) db.createObjectStore(store, { keyPath: 'id' });
        db.createObjectStore('days', { keyPath: 'date' });
        db.createObjectStore('settings');
        db.createObjectStore('future', { keyPath: 'id' });
        opening.transaction?.objectStore('traps').put({ id: 'fools-mate', chainDepth: 2 });
      };
      opening.onsuccess = () => {
        opening.result.close();
        resolve();
      };
      opening.onerror = () => reject(opening.error);
    });
  }, databaseName);

  await page.goto('./');
  const notice = page.getByRole('alert');
  await expect(notice).toContainText('Прогресс записан более новой версией приложения.');
  await notice.getByRole('link', { name: 'Сохранить файл' }).tap();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Сохранить файл' }).tap();
  const file = JSON.parse(await readFile(await (await downloading).path(), 'utf8'));
  expect(file.data.traps['fools-mate']).toMatchObject({ chainDepth: 2 });

  // The diagnostics page names the database and both versions.
  await page.goto('./#/diag');
  await expect(page.getByText(databaseName, { exact: true })).toBeVisible();
  await expect(page.getByText(/^99 \(эта сборка знает \d+\)$/)).toBeVisible();

  // Nothing was written: the newer build finds its database as it left it.
  const version = await page.evaluate(
    async (name) => (await indexedDB.databases()).find((db) => db.name === name)?.version,
    databaseName,
  );
  expect(version).toBe(99);
});
