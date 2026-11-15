import { beforeAll, describe, expect, it } from 'vitest';
import { TACTICS_LEVELS, type PuzzleEntry, type PuzzleTheme } from '../shared/puzzle-types.ts';
import {
  applyActivity,
  backupHintDue,
  completeItem,
  emptyDay,
  newTrapHeldBack,
  planSession,
  recentDays,
  sessionProgress,
  sessionShape,
  streakState,
  type DayRecord,
  type SessionInput,
} from '../src/core/daily';
import { addDays, type DayKey } from '../src/core/days';
import { initSchedule } from '../src/core/schedule';
import { applyPuzzleStat, type PuzzleStat } from '../src/core/tactics';

beforeAll(initSchedule);

const START: DayKey = '2026-11-01';

/** A log with the norm met on the given offsets from START. */
function log(...offsets: number[]): Record<DayKey, DayRecord> {
  const days: Record<DayKey, DayRecord> = {};
  for (const offset of offsets) {
    const date = addDays(START, offset);
    days[date] = { ...emptyDay(date), done: 1, metAt: Date.UTC(2026, 10, 1 + offset, 18), updatedAt: 1 };
  }
  return days;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

describe('applyActivity', () => {
  it('counts exercises and marks the day when the norm is reached, once', () => {
    let day = emptyDay(START);
    day = applyActivity(day, 'puzzle', true, 3, 100);
    day = applyActivity(day, 'trapStep', false, 3, 200);
    expect(day).toMatchObject({ done: 2, puzzles: 1, cleanPuzzles: 1, trapSteps: 1, metAt: null });
    day = applyActivity(day, 'review', true, 3, 300);
    expect(day).toMatchObject({ done: 3, reviews: 1, metAt: 300 });
    // A stricter norm later does not take the day back, and more work does not move the time.
    day = applyActivity(day, 'puzzle', false, 5, 400);
    expect(day).toMatchObject({ done: 4, puzzles: 2, cleanPuzzles: 1, metAt: 300 });
  });
});

describe('streakState', () => {
  it('is empty before the first practice', () => {
    expect(streakState({}, START)).toMatchObject({ current: 0, best: 0, totalDays: 0, freezes: 0, todayDone: false });
  });

  it('counts days in a row; today does not break it while it is going on', () => {
    const days = log(0, 1, 2);
    expect(streakState(days, addDays(START, 2))).toMatchObject({ current: 3, totalDays: 3, todayDone: true });
    expect(streakState(days, addDays(START, 3))).toMatchObject({ current: 3, totalDays: 3, todayDone: false });
  });

  it('starts again quietly after a missed day without a freeze, and keeps the total', () => {
    const days = log(0, 1, 2, 4);
    expect(streakState(days, addDays(START, 4))).toMatchObject({ current: 1, best: 3, totalDays: 4, frozen: [] });
    // Two days after the last practice, nothing today yet: the streak is over, the total is not.
    expect(streakState(log(0, 1, 2), addDays(START, 4))).toMatchObject({ current: 0, best: 3, totalDays: 3 });
  });

  it('earns a freeze every seven active days and keeps two at most', () => {
    expect(streakState(log(...range(0, 5)), addDays(START, 5))).toMatchObject({ freezes: 0, toNextFreeze: 1 });
    expect(streakState(log(...range(0, 6)), addDays(START, 6))).toMatchObject({ freezes: 1, toNextFreeze: 7 });
    expect(streakState(log(...range(0, 13)), addDays(START, 13))).toMatchObject({ freezes: 2, toNextFreeze: 0 });
    expect(streakState(log(...range(0, 30)), addDays(START, 30))).toMatchObject({ freezes: 2, current: 31 });
  });

  it('spends a freeze on a missed day by itself and goes on', () => {
    // Seven days, one missed, two more.
    const days = log(...range(0, 6), 8, 9);
    expect(streakState(days, addDays(START, 9))).toMatchObject({
      current: 9,
      totalDays: 9,
      freezes: 0,
      frozen: [addDays(START, 7)],
    });
  });

  it('keeps its freezes on a break they cannot cover, and starts again', () => {
    const days = log(...range(0, 13), 20);
    const state = streakState(days, addDays(START, 20));
    expect(state).toMatchObject({ current: 1, best: 14, totalDays: 15, freezes: 2, frozen: [] });
    // One freeze, two missed days: nothing is spent.
    expect(streakState(log(...range(0, 6), 9), addDays(START, 9))).toMatchObject({ current: 1, freezes: 1, frozen: [] });
    // Two freezes cover two missed days in a row.
    expect(streakState(log(...range(0, 13), 16), addDays(START, 16))).toMatchObject({
      current: 15,
      freezes: 0,
      frozen: [addDays(START, 14), addDays(START, 15)],
    });
  });

  it('counts a freeze for yesterday as soon as yesterday is over', () => {
    const days = log(...range(0, 6));
    // Day 7 was missed; on day 8 nothing is done yet.
    expect(streakState(days, addDays(START, 8))).toMatchObject({ current: 7, freezes: 0, frozen: [addDays(START, 7)] });
    // Day 8 over as well: two missed days and one freeze. The streak is over, the freeze is kept.
    expect(streakState(days, addDays(START, 9))).toMatchObject({ current: 0, totalDays: 7, freezes: 1, frozen: [] });
  });

  it('survives a year without practice', () => {
    const days = { ...log(...range(0, 9)), ...log(400, 401) };
    expect(streakState(days, addDays(START, 401))).toMatchObject({ current: 2, best: 10, totalDays: 12 });
  });

  it('does not take an ordinary missed day for travel', () => {
    // 21:00 on day 1, nothing on day 2, 08:00 on day 3: 35 hours, no time zone change.
    const days = log(0, 1);
    const late = addDays(START, 3);
    days[late] = { ...emptyDay(late), done: 1, metAt: (days[addDays(START, 1)]?.metAt ?? 0) + 35 * 3_600_000, updatedAt: 1 };
    expect(streakState(days, late)).toMatchObject({ current: 1 });
    // 23:50 and then 00:10 two dates later: 24 hours 20 minutes.
    const night = log(0, 1);
    night[late] = { ...emptyDay(late), done: 1, metAt: (night[addDays(START, 1)]?.metAt ?? 0) + 24 * 3_600_000 + 20 * 60_000, updatedAt: 1 };
    expect(streakState(night, late)).toMatchObject({ current: 1 });
  });

  it('skips exactly one date for a flight east and no more', () => {
    const base = log(0, 1);
    const last = base[addDays(START, 1)]?.metAt ?? 0;
    const gap1 = addDays(START, 3);
    const one = { ...base, [gap1]: { ...emptyDay(gap1), done: 1, metAt: last + 20 * 3_600_000, updatedAt: 1 } };
    expect(streakState(one, gap1)).toMatchObject({ current: 3, frozen: [] });
    // The same gap with two days of real time in between is a missed day.
    const slow = { ...base, [gap1]: { ...emptyDay(gap1), done: 1, metAt: last + 48 * 3_600_000, updatedAt: 1 } };
    expect(streakState(slow, gap1)).toMatchObject({ current: 1 });
  });

  it('counts the streak up to today when the clock was moved back', () => {
    // Records up to day 5, but the device now says it is day 2.
    const days = log(...range(0, 5));
    expect(streakState(days, addDays(START, 2))).toMatchObject({ current: 3, totalDays: 6, todayDone: true });
    // One stray record far ahead does not touch the streak, and no freeze is spent on today.
    const stray = log(...range(0, 20), 400);
    expect(streakState(stray, addDays(START, 20))).toMatchObject({ current: 21, best: 21, totalDays: 22, frozen: [] });
    expect(streakState(log(...range(0, 6), 8), addDays(START, 7))).toMatchObject({ current: 7, frozen: [] });
    // A hole "today" with later records after it is a missed day like any other.
    expect(streakState(log(0, 1, 3, 4), addDays(START, 2))).toMatchObject({ current: 2, totalDays: 4 });
  });

  it('ignores keys that are not dates', () => {
    const days = log(0);
    days['not-a-date'] = { ...emptyDay('not-a-date'), metAt: 1 };
    expect(streakState(days, START)).toMatchObject({ current: 1, totalDays: 1 });
  });
});

describe('recentDays', () => {
  it('marks done, frozen, missed and today', () => {
    const days = log(...range(0, 6), 8, 9, 11);
    const marks = recentDays(days, addDays(START, 12), 7).map((day) => day.mark);
    // Days 6..12: done, frozen (7), done, done, missed (10), done, today.
    expect(marks).toEqual(['done', 'frozen', 'done', 'done', 'missed', 'done', 'today']);
  });

  it('shows nothing before the first practice', () => {
    expect(recentDays(log(5), addDays(START, 6), 7).map((day) => day.mark)).toEqual([
      'none',
      'none',
      'none',
      'none',
      'none',
      'done',
      'today',
    ]);
  });
});

describe('one new trap a day', () => {
  it('holds back a second new trap, never a trap in progress', () => {
    const day = { ...emptyDay(START), newTrap: 'fools-mate' };
    expect(newTrapHeldBack(day, 'scholars-mate', false)).toBe(true);
    expect(newTrapHeldBack(day, 'fools-mate', false)).toBe(false);
    expect(newTrapHeldBack(day, 'scholars-mate', true)).toBe(false);
    expect(newTrapHeldBack(emptyDay(START), 'scholars-mate', false)).toBe(false);
    expect(newTrapHeldBack(undefined, 'scholars-mate', false)).toBe(false);
  });
});

describe('planSession', () => {
  const NOW = Date.UTC(2026, 10, 14, 18);
  const THEMES: PuzzleTheme[] = ['mateIn1', 'hangingPiece', 'fork', 'backRankMate', 'pin'];
  const pool: PuzzleEntry[] = [];
  TACTICS_LEVELS.forEach((level, index) => {
    for (const theme of THEMES) {
      for (let step = 0; step < 6; step++) {
        const rating = level.min + Math.floor(((level.max - level.min) * step) / 6);
        pool.push({ id: `${theme}${index}x${step}`, fen: 'x', moves: 'a2a3 a7a6', rating, themes: [theme] });
      }
    }
  });
  const input = (change: Partial<SessionInput> = {}): SessionInput => ({
    pool,
    puzzles: {},
    level: 0,
    dueTraps: [],
    trap: undefined,
    now: NOW,
    random: () => 0.4,
    ...change,
  });
  const byId = new Map(pool.map((puzzle) => [puzzle.id, puzzle]));

  it('is about six short exercises with a warm-up first', () => {
    const plan = planSession(input());
    expect(plan).toHaveLength(6);
    expect(plan[0]).toMatchObject({ kind: 'puzzle', role: 'warmup', done: false, clean: null });
    expect(new Set(plan.map((item) => item.id)).size).toBe(6);
    expect(sessionShape(plan)).toBe('puzzles');
  });

  it('serves new puzzles from the band of the level, only themes of the level, easiest first', () => {
    const plan = planSession(input({ level: 0 }));
    const fresh = plan.filter((item) => item.kind === 'puzzle' && item.role === 'new').map((item) => byId.get(item.id));
    for (const puzzle of fresh) {
      expect(puzzle?.rating).toBeGreaterThanOrEqual(400);
      expect(puzzle?.rating).toBeLessThan(700);
      expect(['mateIn1', 'hangingPiece']).toContain(puzzle?.themes[0]);
    }
    const ratings = fresh.map((puzzle) => puzzle?.rating ?? 0);
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
    const warm = byId.get(plan[0]?.id ?? '');
    expect(warm?.rating).toBeLessThan(500);
  });

  it('puts what is due before the new things: one trap review, two puzzle reviews at most', () => {
    const failed = (id: string, day: number): PuzzleStat =>
      applyPuzzleStat(undefined, id, { errors: 1, hints: 0 }, Date.UTC(2026, 10, day, 12));
    const puzzles = {
      mateIn10x1: failed('mateIn10x1', 10),
      mateIn10x2: failed('mateIn10x2', 11),
      mateIn10x3: failed('mateIn10x3', 12),
      // Failed today: not due before tomorrow.
      mateIn10x4: applyPuzzleStat(undefined, 'mateIn10x4', { errors: 1, hints: 0 }, NOW),
    };
    const plan = planSession(input({ puzzles, dueTraps: ['fools-mate', 'scholars-mate'], trap: { id: 'legal-mate', stepsLeft: 5 } }));
    expect(plan.map((item) => (item.kind === 'puzzle' ? item.role : item.kind))).toEqual([
      'warmup',
      'trapReview',
      'review',
      'review',
      'trapStep',
      'trapStep',
      'new',
      'new',
    ]);
    expect(plan[1]?.id).toBe('fools-mate');
    expect(plan.slice(2, 4).map((item) => item.id)).toEqual(['mateIn10x1', 'mateIn10x2']);
    expect(sessionShape(plan)).toBe('trap');
    // Nothing that was tried before comes as "new".
    const fresh = plan.filter((item) => item.kind === 'puzzle' && item.role !== 'review').map((item) => item.id);
    for (const id of fresh) expect(Object.keys(puzzles)).not.toContain(id);
  });

  it('gives one chain step when one is left, and none for a trap that is due for review', () => {
    expect(planSession(input({ trap: { id: 'legal-mate', stepsLeft: 1 } })).filter((item) => item.kind === 'trapStep')).toHaveLength(1);
    expect(planSession(input({ trap: { id: 'legal-mate', stepsLeft: 0 } })).filter((item) => item.kind === 'trapStep')).toHaveLength(0);
    const same = planSession(input({ dueTraps: ['legal-mate'], trap: { id: 'legal-mate', stepsLeft: 3 } }));
    expect(same.filter((item) => item.kind === 'trapStep')).toHaveLength(0);
    expect(sessionShape(same)).toBe('review');
  });

  it('ignores a due puzzle that is not in the pool any more', () => {
    const gone = applyPuzzleStat(undefined, 'removed', { errors: 1, hints: 0 }, Date.UTC(2026, 10, 10, 12));
    expect(planSession(input({ puzzles: { removed: gone } })).some((item) => item.id === 'removed')).toBe(false);
  });

  it('still plans something when the level has run out of new puzzles', () => {
    const puzzles: Record<string, PuzzleStat> = {};
    for (const puzzle of pool) puzzles[puzzle.id] = applyPuzzleStat(undefined, puzzle.id, { errors: 0, hints: 0 }, NOW);
    expect(planSession(input({ puzzles, dueTraps: ['fools-mate'] }))).toEqual([
      { kind: 'trapReview', id: 'fools-mate', done: false, clean: null },
    ]);
    expect(planSession(input({ puzzles }))).toEqual([]);
  });

  it('finishes when every item is done', () => {
    let day: DayRecord = { ...emptyDay(START), session: planSession(input()).slice(0, 2) };
    day = completeItem(day, 0, true, 10);
    expect(sessionProgress(day.session)).toEqual({ done: 1, total: 2, played: 1 });
    expect(day.sessionDoneAt).toBeNull();
    // Doing the same item again changes nothing.
    expect(completeItem(day, 0, false, 20)).toBe(day);
    day = completeItem(day, 1, false, 30);
    expect(day.sessionDoneAt).toBe(30);
    expect(day.session?.map((item) => item.clean)).toEqual([true, false]);
    expect(completeItem(day, 5, true, 40)).toBe(day);
  });
});

describe('backupHintDue', () => {
  const DAY = 86_400_000;
  const now = Date.UTC(2026, 10, 14, 12);
  const none = { lastBackupAt: null, backupSnoozedUntil: null };

  it('waits for a month of practice, then for a month after every copy', () => {
    expect(backupHintDue(none, {}, now)).toBe(false);
    expect(backupHintDue(none, log(0), now)).toBe(false);
    expect(backupHintDue(none, log(-40), now)).toBe(true);
    expect(backupHintDue({ ...none, lastBackupAt: now - 10 * DAY }, log(-40), now)).toBe(false);
    expect(backupHintDue({ ...none, lastBackupAt: now - 31 * DAY }, log(-40), now)).toBe(true);
  });

  it('stays away while it is snoozed', () => {
    expect(backupHintDue({ lastBackupAt: null, backupSnoozedUntil: now + DAY }, log(-40), now)).toBe(false);
    expect(backupHintDue({ lastBackupAt: null, backupSnoozedUntil: now - DAY }, log(-40), now)).toBe(true);
  });
});

describe('session progress', () => {
  it('does not count an item skipped because it was done elsewhere as played', () => {
    let day: DayRecord = {
      ...emptyDay(START),
      session: [
        { kind: 'trapReview', id: 'fools-mate', done: false, clean: null },
        { kind: 'puzzle', id: 'a', role: 'new', done: false, clean: null },
      ],
    };
    day = completeItem(day, 0, null, 5);
    day = completeItem(day, 1, true, 6);
    expect(sessionProgress(day.session)).toEqual({ done: 2, total: 2, played: 1 });
    expect(day.sessionDoneAt).toBe(6);
  });
});
