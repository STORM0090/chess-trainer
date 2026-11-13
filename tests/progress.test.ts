import { beforeAll, describe, expect, it } from 'vitest';
import { DAY_MS, localDaysBetween, startOfLocalDay, startOfNextLocalDay } from '../src/core/days';
import {
  applyChainRun,
  applyReview,
  dueReviews,
  emptyProgress,
  gameCounts,
  gradeOf,
  isReviewDue,
  markSeen,
  skipDeviation,
  trapStatus,
  unlockedIds,
  type TrapProgress,
} from '../src/core/progress';
import { firstCard, initSchedule, nextReviewDay, reviewCard } from '../src/core/schedule';

// Local time on purpose: day boundaries follow the device's time zone.
const EVENING = new Date(2026, 10, 14, 21, 30).getTime();
const NEXT_MORNING = new Date(2026, 10, 15, 7, 0).getTime();
const CLEAN = { errors: 0, hints: 0 };
const main = (depth: number) => ({ kind: 'main' as const, depth, key: 'aaaaaaaa' });
const deviation = { kind: 'deviation' as const, depth: 2, key: 'bbbbbbbb' };

beforeAll(initSchedule);

/** A trap with a chain of `length` depths, learned at `at`. */
function learned(id: string, length: number, at: number): TrapProgress {
  let progress = emptyProgress(id);
  for (let depth = 1; depth <= length; depth++) {
    progress = applyChainRun(progress, main(depth), length, CLEAN, at);
  }
  return progress;
}

describe('local days', () => {
  it('finds the borders of a day', () => {
    expect(new Date(startOfLocalDay(EVENING)).getHours()).toBe(0);
    expect(startOfNextLocalDay(EVENING) - startOfLocalDay(EVENING)).toBe(DAY_MS);
    expect(localDaysBetween(EVENING, NEXT_MORNING)).toBe(1);
    expect(localDaysBetween(NEXT_MORNING, NEXT_MORNING + 3600_000)).toBe(0);
  });
});

describe('applyChainRun', () => {
  it('moves one depth deeper only after a run without errors and hints', () => {
    let progress = emptyProgress('legal-mate');
    progress = applyChainRun(progress, main(1), 7, { errors: 1, hints: 0 }, EVENING);
    expect(progress.chainDepth).toBe(0);
    progress = applyChainRun(progress, main(1), 7, { errors: 0, hints: 1 }, EVENING);
    expect(progress.chainDepth).toBe(0);
    progress = applyChainRun(progress, main(1), 7, CLEAN, EVENING);
    expect(progress.chainDepth).toBe(1);
    expect(progress.runs).toEqual({ clean: 1, failed: 2 });
    expect(progress.seenAt).toBe(EVENING);
    expect(trapStatus(progress)).toBe('started');
  });

  it('ignores a depth that is not the next one', () => {
    let progress = applyChainRun(emptyProgress('legal-mate'), main(3), 7, CLEAN, EVENING);
    expect(progress.chainDepth).toBe(0);
    progress = applyChainRun(progress, main(1), 7, CLEAN, EVENING);
    progress = applyChainRun(progress, main(1), 7, CLEAN, EVENING);
    expect(progress.chainDepth).toBe(1);
  });

  it('marks the trap as learned after the last depth and opens the review the next day', () => {
    const progress = learned('fools-mate', 2, EVENING);
    expect(progress.learnedAt).toBe(EVENING);
    expect(progress.card).toMatchObject({ cardId: 'fools-mate', reps: 1, lapses: 0 });
    expect(progress.dueAt).toBe(startOfNextLocalDay(EVENING));
    expect(trapStatus(progress)).toBe('learned');
    expect(isReviewDue(progress, EVENING + 3600_000)).toBe(false);
    expect(isReviewDue(progress, NEXT_MORNING)).toBe(true);
  });

  it('counts deviation runs per line and never changes the depth', () => {
    let progress = applyChainRun(emptyProgress('x'), main(1), 5, CLEAN, EVENING);
    progress = applyChainRun(progress, deviation, 5, { errors: 2, hints: 1 }, EVENING);
    progress = applyChainRun(progress, deviation, 5, CLEAN, EVENING);
    expect(progress.lines.bbbbbbbb).toEqual({ clean: 1, failed: 1, skipped: false });
    expect(progress.chainDepth).toBe(1);
    expect(skipDeviation(progress, 'cccccccc', EVENING).lines.cccccccc).toEqual({
      clean: 0,
      failed: 0,
      skipped: true,
    });
  });
});

describe('reviews', () => {
  it('grades a run by errors and hints', () => {
    expect(gradeOf(CLEAN)).toBe('good');
    expect(gradeOf({ errors: 0, hints: 2 })).toBe('hard');
    expect(gradeOf({ errors: 1, hints: 0 })).toBe('again');
  });

  it('does nothing before the review is due', () => {
    const progress = learned('fools-mate', 2, EVENING);
    expect(applyReview(progress, 'good', EVENING + 60_000)).toBe(progress);
    expect(applyReview(emptyProgress('x'), 'good', NEXT_MORNING).reviews).toBe(0);
  });

  it('masters the trap on the first review without a wrong move', () => {
    const progress = learned('fools-mate', 2, EVENING);
    const failed = applyReview(progress, 'again', NEXT_MORNING);
    expect(failed.reviews).toBe(1);
    expect(failed.masteredAt).toBeNull();
    // A failed review comes back the next day.
    expect(failed.dueAt).toBe(startOfNextLocalDay(NEXT_MORNING));
    expect(failed.card?.lapses).toBe(1);

    const withHints = applyReview(progress, 'hard', NEXT_MORNING);
    expect(withHints.masteredAt).toBe(NEXT_MORNING);
    expect(trapStatus(withHints)).toBe('mastered');
  });

  it('spreads good reviews further and further apart', () => {
    let progress = learned('fools-mate', 2, EVENING);
    const gaps: number[] = [];
    let now = NEXT_MORNING;
    for (let i = 0; i < 4; i++) {
      progress = applyReview(progress, 'good', now);
      const due = progress.dueAt ?? 0;
      gaps.push(localDaysBetween(now, due));
      // Opens at midnight of its day.
      expect(due).toBe(startOfLocalDay(due));
      now = due + 8 * 3600_000;
    }
    expect(gaps[0]).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1] ?? 0);
    // Mastery is not taken away by a later failure.
    const later = applyReview(progress, 'again', now);
    expect(later.masteredAt).toBe(progress.masteredAt);
  });

  it('gives the same dates for the same history', () => {
    const card = firstCard('x', EVENING);
    const a = reviewCard(card, 'good', NEXT_MORNING);
    const b = reviewCard(JSON.parse(JSON.stringify(card)), 'good', NEXT_MORNING);
    expect(a).toEqual(b);
    expect(nextReviewDay(a, NEXT_MORNING)).toBeGreaterThan(NEXT_MORNING);
  });
});

describe('unlocking', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('opens the first trap and then one trap after each mastered one', () => {
    expect([...unlockedIds(order, {})]).toEqual(['a']);
    const a = learned('a', 1, EVENING);
    expect([...unlockedIds(order, { a })]).toEqual(['a']);
    const mastered = applyReview(a, 'good', NEXT_MORNING);
    expect([...unlockedIds(order, { a: mastered })]).toEqual(['a', 'b']);
  });

  it('keeps a started trap open and does not open a trap that was only viewed', () => {
    const started = applyChainRun(emptyProgress('c'), main(1), 4, CLEAN, EVENING);
    const viewed = markSeen(emptyProgress('d'), EVENING);
    expect([...unlockedIds(order, { c: started, d: viewed })]).toEqual(['a', 'c']);
  });

  it('lists due reviews, the longest waiting first', () => {
    const a = learned('a', 1, EVENING);
    const b = learned('b', 1, EVENING - 3 * DAY_MS);
    const traps = { a, b, c: emptyProgress('c') };
    expect(dueReviews(order, traps, EVENING)).toEqual(['b']);
    expect(dueReviews(order, traps, NEXT_MORNING)).toEqual(['b', 'a']);
  });
});

describe('game log', () => {
  it('counts outcomes per trap', () => {
    const games = [
      { id: '1', trapId: 'a', at: 1, outcome: 'worked' as const },
      { id: '2', trapId: 'a', at: 2, outcome: 'declined' as const },
      { id: '3', trapId: 'b', at: 3, outcome: 'worked' as const },
      { id: '4', trapId: 'a', at: 4, outcome: 'worked' as const },
    ];
    expect(gameCounts(games, 'a')).toEqual({ worked: 2, declined: 1, refuted: 0 });
    expect(gameCounts(games, 'c')).toEqual({ worked: 0, declined: 0, refuted: 0 });
  });
});
