import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { expectNoSidewaysScroll, playMove, watchForErrors } from './helpers.ts';

// A made-up game: on move 5 White (the "player") could mate on f7 and played a3 instead.
const PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[White "tester-name"]
[Black "rival-name"]
[Result "*"]

1. e4 {[%clk 0:09:58]} 1... e5 {[%clk 0:09:57]} 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nd4 5. a3 *`;

test('own games become exercises, and no name is kept', async ({ page }) => {
  const problems = watchForErrors(page);
  await page.goto('./#/more');
  await page.getByRole('link', { name: /Мои партии/ }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Мои партии' })).toBeVisible();
  await expect(page.getByText('Упражнений пока нет.')).toBeVisible();

  await page.getByRole('textbox').fill(PGN);
  await page.getByRole('button', { name: 'Прочитать' }).tap();
  await expect(page.getByText('Партий прочитано: 1.')).toBeVisible();
  await page.getByRole('radio', { name: 'tester-name' }).tap();
  const find = page.getByRole('button', { name: 'Найти ошибки' });
  await expect(find).toBeEnabled({ timeout: 30_000 });
  await find.tap();
  await expect(page.getByText(/Партий просмотрено: 1\. Новых упражнений: 1\./)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Всего: 1 упражнение. Пора повторить: 1.')).toBeVisible();
  // The text with the names is gone from the screen.
  await expect(page.getByRole('textbox')).toHaveValue('');
  await expectNoSidewaysScroll(page);

  // The same game again adds nothing.
  await page.getByRole('textbox').fill(PGN);
  await page.getByRole('button', { name: 'Прочитать' }).tap();
  await page.getByRole('radio', { name: 'tester-name' }).tap();
  await page.getByRole('button', { name: 'Найти ошибки' }).tap();
  await expect(page.getByText(/Новых упражнений: 0\. Уже были в списке: 1\./)).toBeVisible({ timeout: 60_000 });

  // The exercise: Black plays 4...Nd4, White must find 5.Qxf7#.
  await page.getByRole('link', { name: 'Решать' }).tap();
  const status = page.locator('.learn-screen .status');
  await expect(page.locator('.movelist-item')).toHaveCount(1);
  await expect(status).toHaveText('Ваш ход');
  await playMove(page, 'f3f7', 'white');
  await expect(status).toHaveText('Задача завершена');
  await expect(page.getByText('Решено без ошибок и подсказок.')).toBeVisible();
  await expect(page.getByText('В партии вы сыграли a3.')).toBeVisible();
  await page.getByRole('link', { name: 'К моим партиям' }).tap();
  await expect(page.getByText('Всего: 1 упражнение. Пора повторить: 0.')).toBeVisible();

  // The progress file has the position and nothing that names anybody.
  await page.goto('./#/data');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Сохранить файл' }).tap();
  const text = await readFile(await (await downloading).path(), 'utf8');
  const file = JSON.parse(text);
  expect(file.format).toBe(6);
  const [exercise] = Object.values(file.data.own) as { moves: string; played: string }[];
  expect(exercise).toMatchObject({ moves: 'c6d4 f3f7', played: 'a3' });
  expect(Object.keys(exercise ?? {}).sort()).toEqual(['addedAt', 'fen', 'id', 'loss', 'moves', 'played']);
  expect(text).not.toContain('tester-name');
  expect(text).not.toContain('rival-name');
  expect(text).not.toContain('Chess.com');

  // Nothing with the names in the device's storage either.
  const stored = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open('chess-trainer');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const names = [...db.objectStoreNames];
          const tx = db.transaction(names);
          const all: unknown[] = [];
          let left = names.length;
          for (const name of names) {
            const request = tx.objectStore(name).getAll();
            request.onsuccess = () => {
              all.push(request.result);
              if (--left === 0) resolve(JSON.stringify(all));
            };
          }
        };
      }),
  );
  expect(stored).toContain('c6d4 f3f7');
  expect(stored).not.toContain('tester-name');
  expect(JSON.stringify(await page.evaluate(() => ({ ...localStorage })))).not.toContain('tester-name');

  // The exercise can be removed.
  await page.goto('./#/games');
  await page.getByRole('button', { name: 'Удалить все упражнения' }).tap();
  await page.getByRole('button', { name: 'Да, удалить все' }).tap();
  await expect(page.getByText('Упражнений пока нет.')).toBeVisible();
  expect(problems, 'errors in the browser console').toEqual([]);
});
