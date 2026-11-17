import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  NO_TEST_CLOCK,
  databaseName,
  expectNoSidewaysScroll,
  loadPuzzles,
  nextDay,
  playMove,
  solvePuzzle,
  testClock,
  watchForErrors,
  type PuzzleRow,
} from './helpers.ts';

/** Plays whatever the session shows: a puzzle, or a chain step of Fool's Mate as Black. */
async function playItem(page: Page, puzzles: Map<string, PuzzleRow>): Promise<'puzzle' | 'trap'> {
  const status = page.locator('.learn-screen .status');
  await expect(status).toBeVisible();
  if ((await page.locator('[data-puzzle]').count()) > 0) {
    await solvePuzzle(page, puzzles);
    return 'puzzle';
  }
  // 1.f3 e5 2.g4 Qh4#: the step starts either before 1...e5 or before 2...Qh4.
  await expect(status).toHaveText('Ваш ход');
  if ((await page.locator('.movelist-item').count()) < 3) {
    await playMove(page, 'e7e5', 'black');
    await expect(page.locator('.movelist-item')).toHaveCount(3);
    await expect(status).toHaveText('Ваш ход');
  }
  const moves = page.locator('.movelist-item');
  const before = await moves.count();
  await playMove(page, 'd8h4', 'black');
  await expect(moves).not.toHaveCount(before);
  await expect(status).not.toHaveText('Ходит соперник…');
  // A review may pick the variant 2.h3 Qh4+ 3.g3 Qxg3#: one more move.
  if ((await status.textContent()) === 'Ваш ход') await playMove(page, 'h4g3', 'black');
  await expect(status).toHaveText(/Шаг завершён|Повторение завершено/);
  return 'trap';
}

test('the daily session, the streak, the settings and the calendar file', async ({ page }) => {
  test.skip(!testClock, NO_TEST_CLOCK);
  const problems = watchForErrors(page);
  const puzzles = await loadPuzzles();

  // The home screen before anything was done.
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Сегодня' })).toBeVisible();
  await expect(page.getByText('Сегодня: ловушка и задачи')).toBeVisible();
  await expect(page.getByText('Дней занятий: 0')).toBeVisible();
  await expect(page.getByText('Серия начнётся с первого занятия.')).toBeVisible();
  await expect(page.getByText('Норма дня: 1 упражнение. Сегодня сделано: 0.')).toBeVisible();
  await expectNoSidewaysScroll(page);

  // The session: a warm-up puzzle, two steps of the first trap, three new puzzles.
  await page.getByRole('link', { name: 'Начать' }).tap();
  const kinds: string[] = [];
  for (let number = 1; number <= 6; number++) {
    await expect(page.getByText(`Сессия: ${number} из 6`).first()).toBeVisible();
    kinds.push(await playItem(page, puzzles));
    await expectNoSidewaysScroll(page);
    if (number === 2) {
      // Leaving in the middle and coming back continues the same plan.
      await page.goto('./');
      await expect(page.getByText('Сделано 2 из 6.')).toBeVisible();
      await expect(page.getByText(/Норма дня выполнена/)).toBeVisible();
      await page.getByRole('link', { name: 'Продолжить' }).tap();
    } else {
      await page.getByRole('button', { name: number === 6 ? 'Завершить' : 'Дальше' }).tap();
    }
  }
  expect(kinds).toEqual(['puzzle', 'trap', 'trap', 'puzzle', 'puzzle', 'puzzle']);
  await expect(page.getByRole('heading', { level: 1, name: 'Сессия завершена' })).toBeVisible();
  await expect(page.getByText('Упражнений: 6, без ошибок и подсказок: 6.')).toBeVisible();
  await expect(page.getByText('Дней занятий: 1')).toBeVisible();

  await page.getByRole('link', { name: 'На главную' }).tap();
  await expect(page.getByText('Сессия на сегодня завершена')).toBeVisible();
  await expect(page.getByText('Подряд: 1 день.')).toBeVisible();
  await expect(page.locator('.week-day-done')).toHaveCount(1);

  // The trap was learned in the session; the next one waits for tomorrow's review.
  await page.goto('./#/traps');
  await expect(page.locator('.trap-card', { hasText: 'Дурацкий мат' }).first()).toContainText('Изучена');

  // The next day: the plan is new, the trap review comes first after the warm-up.
  await nextDay(page);
  await expect(page.getByText('Сегодня: повторение и задачи')).toBeVisible();
  await expect(page.getByText('Подряд: 1 день.')).toBeVisible();
  await page.getByRole('link', { name: 'Начать' }).tap();
  await playItem(page, puzzles);
  await page.getByRole('button', { name: 'Дальше' }).tap();
  await expect(page.getByText(/Повторение\. Играйте с первого хода/)).toBeVisible();
  expect(await playItem(page, puzzles)).toBe('trap');
  await expect(page.getByText('Ловушка освоена.')).toBeVisible();
  await page.goto('./');
  await expect(page.getByText('Подряд: 2 дня.')).toBeVisible();
  await expect(page.getByText('Дней занятий: 2')).toBeVisible();

  // The mastered trap opened the next one, but a new trap was not started today yet: it
  // can be. After its first step another new trap is held back until tomorrow.
  await page.goto('./#/trap/fools-mate-white/chain');
  await expect(page.locator('.learn-screen .status')).toHaveText('Ваш ход');

  // Settings: the norm and the calendar file.
  await page.getByRole('link', { name: 'Ещё' }).tap();
  await expect(page.locator('.trap-card')).toHaveCount(6);
  await page.getByRole('link', { name: /Настройки/ }).tap();
  await page.getByRole('radio', { name: '3 упражнения' }).tap();
  await expect(page.getByRole('radio', { name: '3 упражнения' })).toHaveAttribute('aria-checked', 'true');
  await page.locator('input[type="time"]').fill('07:30');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Добавить в календарь' }).tap();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('chess-trainer-reminder.ics');
  const calendar = await readFile(await download.path(), 'utf8');
  expect(calendar).toContain('BEGIN:VEVENT');
  expect(calendar).toMatch(/DTSTART:\d{8}T073000\r\n/);
  expect(calendar).toContain('RRULE:FREQ=DAILY');
  await page.reload();
  await expect(page.getByRole('radio', { name: '3 упражнения' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('input[type="time"]')).toHaveValue('07:30');
  await expectNoSidewaysScroll(page);

  expect(problems, 'errors in the browser console').toEqual([]);
});

test('only one new trap a day', async ({ page }) => {
  test.skip(!testClock, NO_TEST_CLOCK);
  const problems = watchForErrors(page);
  // Start the first trap (one chain step), then mark it as known: the second trap opens.
  await page.goto('./#/trap/fools-mate/chain');
  await playMove(page, 'd8h4', 'black');
  // This line is shown once the run is recorded; the status line comes a moment earlier.
  await expect(page.getByText('Шаг пройден без ошибок и подсказок.')).toBeVisible();
  await page.goto('./#/trap/fools-mate');
  await page.getByRole('button', { name: 'Я это знаю' }).tap();
  await page.getByRole('button', { name: 'Да, знаю' }).tap();

  await page.goto('./#/trap/fools-mate-white/chain');
  await expect(page.getByText('Новая ловушка откроется завтра.')).toBeVisible();
  await expect(page.getByText(/Сегодня вы уже начали «Дурацкий мат»/)).toBeVisible();
  await expect(page.locator('.board')).toHaveCount(0);
  // The session does not offer it either.
  await page.goto('./');
  await expect(page.getByText('Сегодня: задачи от простой к сложной')).toBeVisible();

  await nextDay(page, '#/trap/fools-mate-white/chain');
  await expect(page.locator('.learn-screen .status')).toHaveText('Ваш ход');
  expect(problems, 'errors in the browser console').toEqual([]);
});

test('data saved by the M4 build is carried over', async ({ page }) => {
  const problems = watchForErrors(page);
  // A page of the same origin that does not start the app.
  await page.goto('./manifest.webmanifest');
  await page.evaluate(
    (name) =>
      new Promise<void>((resolve, reject) => {
        // The database as the M4 build made it: version 2, no "days" store, no cards.
        const open = indexedDB.open(name, 2);
        open.onupgradeneeded = () => {
          const db = open.result;
          db.createObjectStore('traps', { keyPath: 'id' });
          db.createObjectStore('games', { keyPath: 'id' });
          db.createObjectStore('settings');
          db.createObjectStore('puzzles', { keyPath: 'id' });
        };
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['settings', 'puzzles'], 'readwrite');
          const yesterday = Date.now() - 86_400_000;
          tx.objectStore('settings').put({ clockShiftDays: 0 }, 'settings');
          tx.objectStore('settings').put({ level: 1, test: null, recent: [true, false], updatedAt: yesterday }, 'tactics');
          tx.objectStore('puzzles').put({ id: 'cfxZa', attempts: 1, clean: 1, lastAt: yesterday, lastClean: true });
          tx.objectStore('puzzles').put({ id: 'VJHBV', attempts: 1, clean: 0, lastAt: yesterday, lastClean: false });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    databaseName,
  );

  await page.goto('./');
  await expect(page.getByText('Задачи: уровень 2 из 5, решено чисто 1')).toBeVisible();
  // The puzzle failed yesterday is due today: it has a review card now.
  await page.goto('./#/puzzles/theme/mateIn1');
  await expect(page.locator('[data-puzzle]')).toHaveAttribute('data-puzzle', 'VJHBV');

  await page.goto('./#/data');
  await expect(page.getByText('Задач решено чисто: 1. Уровень в задачах: 2 / 5.')).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Сохранить файл' }).tap();
  const file = JSON.parse(await readFile(await (await downloading).path(), 'utf8'));
  expect(file.format).toBe(5);
  expect(file.data.puzzles.VJHBV.card).not.toBeNull();
  expect(file.data.puzzles.cfxZa.card).toBeNull();
  expect(file.data.settings).toMatchObject({ dailyNorm: 1, reminderTime: '19:00' });
  expect(problems, 'errors in the browser console').toEqual([]);
});
