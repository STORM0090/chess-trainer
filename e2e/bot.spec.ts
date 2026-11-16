import { expect, test } from '@playwright/test';
import { expectNoSidewaysScroll, playMove, watchForErrors } from './helpers.ts';

test('trap practice against the bot: the bot opens along the trap and the player mates', async ({ page }) => {
  const problems = watchForErrors(page);
  // The bot picks its book move at random; 0 gives the first move of the first line: the
  // main line of Fool's Mate, 1.f3 e5 2.g4 Qh4#.
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto('./#/play/trap/fools-mate');
  const status = page.locator('.learn-screen .status');
  // The engine is loaded first (the bot needs it when the game leaves the book).
  await expect(status).toHaveText('Ваш ход', { timeout: 30_000 });
  await expect(page.getByText('Бот играет по вариантам ловушки.')).toBeVisible();
  await expect(page.locator('.movelist-item')).toHaveCount(1);
  await playMove(page, 'e7e5', 'black');
  await expect(page.locator('.movelist-item')).toHaveCount(3);
  await expect(status).toHaveText('Ваш ход');
  await playMove(page, 'd8h4', 'black');
  await expect(status).toHaveText('Мат. Вы выиграли');
  await expect(page.getByText('Победа!')).toBeVisible();
  // A trap game does not move the level: in the book the bot blunders on purpose.
  await expect(page.getByText(/Партия по ловушке не меняет уровень бота/)).toBeVisible();
  await expectNoSidewaysScroll(page);

  // The win counts for today.
  await page.goto('./');
  await expect(page.getByText(/Норма дня выполнена/)).toBeVisible();
  await expect(page.getByText('Короткая партия против бота. Ваш уровень бота: 1.')).toBeVisible();
  expect(problems, 'errors in the browser console').toEqual([]);
});

test('a free game: the bot answers, the checklist holds the board, resigning ends the game', async ({ page }) => {
  const problems = watchForErrors(page);
  await page.goto('./#/settings');
  await page.getByText('Чеклист ШВУ перед каждым ходом').tap();
  await page.goto('./#/play');
  await expect(page.getByText('Уровень 1 из 13')).toBeVisible();
  await page.getByRole('button', { name: 'Уровень выше' }).tap();
  await expect(page.getByText('Уровень 2 из 13')).toBeVisible();
  await expect(page.getByText('По вашим партиям подобран уровень 1.')).toBeVisible();
  await page.getByRole('radio', { name: 'Белые' }).tap();
  const start = page.getByRole('button', { name: 'Начать партию' });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.tap();

  const status = page.locator('.learn-screen .status');
  await expect(status).toHaveText('Ваш ход');
  // The checklist first: the board does not take a move until it is confirmed.
  await expect(page.getByText('Перед ходом')).toBeVisible();
  await playMove(page, 'e2e4', 'white');
  await expect(page.locator('.movelist-item')).toHaveCount(0);
  await page.getByRole('button', { name: 'Проверил' }).tap();
  await playMove(page, 'e2e4', 'white');
  await expect(page.locator('.movelist-item')).toHaveCount(2, { timeout: 15_000 });
  await expect(status).toHaveText(/Ваш ход/);
  await expect(page.getByText('Перед ходом')).toBeVisible();
  await page.getByRole('button', { name: 'Проверил' }).tap();
  await playMove(page, 'g1f3', 'white');
  await expect(page.locator('.movelist-item')).toHaveCount(4, { timeout: 15_000 });
  await expectNoSidewaysScroll(page);

  await page.getByRole('button', { name: 'Сдаться' }).tap();
  await expect(status).toHaveText('Вы сдались');
  await expect(page.getByText('Партия проиграна.')).toBeVisible();
  await expect(page.getByText('Следующая партия: снова уровень 2.')).toBeVisible();
  expect(problems, 'errors in the browser console').toEqual([]);
});
