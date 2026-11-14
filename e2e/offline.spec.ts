import { expect, test } from '@playwright/test';
import { loadPuzzles, playMove, solvePuzzle, watchForErrors } from './helpers.ts';

// The other tests block the service worker, so its banner cannot move the board between two
// taps. This one needs it: the app must work with the network off after one visit.
test.use({ serviceWorkers: 'allow' });

test('the app works offline after the first visit', async ({ page, context }) => {
  const problems = watchForErrors(page);
  const puzzles = await loadPuzzles();

  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Сегодня' })).toBeVisible();
  // The service worker tells the app when everything is cached.
  const ready = page.getByText('Приложение готово к работе без интернета.');
  await expect(ready).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Закрыть' }).tap();
  await expect(ready).toHaveCount(0);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Сегодня' })).toBeVisible();

  // Puzzles are a separate file: it must come from the cache too.
  await page.getByRole('link', { name: 'Задачи', exact: true }).tap();
  await expect(page.locator('.trap-card')).toHaveCount(9);
  await page.locator('.trap-card', { hasText: 'Мат в 1 ход' }).tap();
  await solvePuzzle(page, puzzles);
  await expect(page.getByText('Решено без ошибок и подсказок.')).toBeVisible();

  // A trap, and the result is saved while offline.
  await page.goto('./#/trap/fools-mate/chain');
  await playMove(page, 'd8h4', 'black');
  await expect(page.getByText('Шаг пройден без ошибок и подсказок.')).toBeVisible();
  await page.reload();
  await page.goto('./');
  await expect(page.getByText(/Норма дня выполнена\. Сегодня сделано упражнений: 2\./)).toBeVisible();

  // Failed requests for things outside the app (there are none) would show up here.
  expect(problems, 'errors in the browser console').toEqual([]);
});
