import { expect, test, type Page } from '@playwright/test';

/** Taps the middle of a square. The board is shown from White's side in this test. */
async function tapSquare(page: Page, square: string): Promise<void> {
  const board = page.locator('.board cg-board');
  await board.scrollIntoViewIfNeeded();
  const box = await board.boundingBox();
  if (!box) throw new Error('The board is not on the page');
  const column = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - Number(square[1]);
  const size = box.width / 8;
  await page.touchscreen.tap(box.x + (column + 0.5) * size, box.y + (row + 0.5) * size);
}

async function playMove(page: Page, move: string): Promise<void> {
  await tapSquare(page, move.slice(0, 2));
  await tapSquare(page, move.slice(2, 4));
}

async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'the page must not scroll sideways').toBeLessThanOrEqual(0);
}

// White's moves in the main line of the Legal Trap:
// 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6 5.Nxe5 Bxd1 6.Bxf7+ Ke7 7.Nd5#
const LEGAL_MAIN_LINE = ['e2e4', 'g1f3', 'f1c4', 'b1c3', 'f3e5', 'c4f7', 'c3d5'];

test('a trap can be opened, viewed and learned on a phone screen', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });

  // List.
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Ловушки' })).toBeVisible();
  await expect(page.locator('.trap-card')).toHaveCount(32);
  await expectNoSidewaysScroll(page);

  // View.
  await page.getByRole('link', { name: /Мат Легаля/ }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Мат Легаля' })).toBeVisible();
  const viewport = page.viewportSize();
  const board = await page.locator('.board cg-board').boundingBox();
  expect(board && viewport && board.width / viewport.width, 'full-width board').toBeGreaterThan(0.9);
  await expectNoSidewaysScroll(page);
  await page.getByRole('button', { name: 'Ход вперёд' }).tap();
  await expect(page.locator('.move-current')).toHaveText('e4');

  // Learn: a wrong move first, then the whole main line.
  await page.getByRole('link', { name: 'Учить' }).tap();
  const status = page.locator('.learn-screen .status');
  await expect(status).toHaveText('Ваш ход');
  await playMove(page, 'a2a3');
  await expect(page.locator('.feedback')).toContainText('Не тот ход.');
  await expect(page.locator('.movelist-item')).toHaveCount(0);

  for (const [index, move] of LEGAL_MAIN_LINE.entries()) {
    await playMove(page, move);
    // Each move of the player is followed by the opponent's reply, except the mate.
    const last = index === LEGAL_MAIN_LINE.length - 1;
    await expect(page.locator('.movelist-item')).toHaveCount(last ? 13 : 2 * (index + 1));
  }

  await expect(status).toHaveText('Вариант пройден');
  await expect(page.getByText('Ошибок: 1, подсказок: 0.')).toBeVisible();
  const next = page.getByRole('button', { name: 'Следующий вариант' });
  await expect(next).toBeInViewport();
  await expectNoSidewaysScroll(page);

  // The next variant starts in the middle of the game.
  await next.tap();
  await expect(page.getByText(/Вариант 2 из \d+/)).toBeVisible();
  await expect(page.locator('.movelist-item').first()).toBeVisible();

  expect(problems, 'errors in the browser console').toEqual([]);
});
