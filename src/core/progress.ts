// What the app remembers about the player, and how one finished run changes it.
// Pure functions over plain objects: storage and UI live elsewhere.

import type { ChainStep } from './chain';
import { firstCard, nextReviewDay, reviewCard, type Grade, type StoredCard } from './schedule';
import { startOfNextLocalDay } from './days';

export interface LineStat {
  /** Runs without errors and hints. */
  clean: number;
  failed: number;
  /** The player chose not to practise this deviation. */
  skipped: boolean;
}

export interface TrapProgress {
  id: string;
  /** First time the trap was opened. All times are milliseconds since the epoch. */
  seenAt: number | null;
  /** Depths of the backward chain completed without errors and hints. */
  chainDepth: number;
  /** Deviation lines, by `lineKey`. */
  lines: Record<string, LineStat>;
  /** Runs in chain mode, for the success rate. */
  runs: { clean: number; failed: number };
  /**
   * The trap counts as learned: the whole main line was played from move 1 without errors
   * and hints, or the player said they know it (`knownAt`).
   */
  learnedAt: number | null;
  /** The player pressed "Я это знаю" instead of going through the chain. */
  knownAt: number | null;
  /** FSRS state; exists once the trap is learned. */
  card: StoredCard | null;
  /** The next review opens at this time (the start of a local day). */
  dueAt: number | null;
  /** Reviews done, whatever the result. */
  reviews: number;
  /** First review without a wrong move. This opens the next trap. */
  masteredAt: number | null;
  updatedAt: number;
}

/** A game of the owner in which the trap came up. Nothing about the game itself is stored. */
export type GameOutcome = 'worked' | 'declined' | 'refuted';

export interface GameEntry {
  id: string;
  trapId: string;
  at: number;
  outcome: GameOutcome;
}

export interface Settings {
  /**
   * Test tool: the app's clock runs this many days ahead of the device, so reviews can be
   * checked without waiting. 0 in normal use.
   */
  clockShiftDays: number;
}

export interface AppData {
  traps: Record<string, TrapProgress>;
  games: GameEntry[];
  settings: Settings;
}

export function emptyData(): AppData {
  return { traps: {}, games: [], settings: { clockShiftDays: 0 } };
}

export function emptyProgress(id: string): TrapProgress {
  return {
    id,
    seenAt: null,
    chainDepth: 0,
    lines: {},
    runs: { clean: 0, failed: 0 },
    learnedAt: null,
    knownAt: null,
    card: null,
    dueAt: null,
    reviews: 0,
    masteredAt: null,
    updatedAt: 0,
  };
}

export function markSeen(progress: TrapProgress, now: number): TrapProgress {
  return progress.seenAt === null ? { ...progress, seenAt: now, updatedAt: now } : progress;
}

/** Errors and hints of one run through a line. */
export interface RunResult {
  errors: number;
  hints: number;
}

export function isClean(result: RunResult): boolean {
  return result.errors === 0 && result.hints === 0;
}

export function gradeOf(result: RunResult): Grade {
  if (result.errors > 0) return 'again';
  return result.hints > 0 ? 'hard' : 'good';
}

/**
 * Records one run of a chain step. A main step counts only when it is clean and is the next
 * depth. Finishing the last depth makes the trap "learned" and schedules the first review
 * for the next day.
 */
export function applyChainRun(
  progress: TrapProgress,
  step: Pick<ChainStep, 'kind' | 'depth' | 'key'>,
  length: number,
  result: RunResult,
  now: number,
): TrapProgress {
  const clean = isClean(result);
  const next: TrapProgress = {
    ...progress,
    seenAt: progress.seenAt ?? now,
    runs: {
      clean: progress.runs.clean + (clean ? 1 : 0),
      failed: progress.runs.failed + (clean ? 0 : 1),
    },
    updatedAt: now,
  };
  if (step.kind === 'deviation') {
    const stat = progress.lines[step.key] ?? { clean: 0, failed: 0, skipped: false };
    next.lines = {
      ...progress.lines,
      [step.key]: clean ? { ...stat, clean: stat.clean + 1 } : { ...stat, failed: stat.failed + 1 },
    };
    return next;
  }
  if (!clean || step.depth !== progress.chainDepth + 1) return next;
  next.chainDepth = step.depth;
  if (next.chainDepth >= length && progress.learnedAt === null) {
    next.learnedAt = now;
    next.card = firstCard(progress.id, now);
    // FSRS would wait several days; the first review is always the next day.
    next.dueAt = startOfNextLocalDay(now);
  }
  return next;
}

/**
 * "Я это знаю": the trap is learned without the chain and goes into the reviews like any
 * learned trap. The next trap opens at once; the first review tomorrow shows whether the
 * player really knows it. Does nothing for a trap that is already learned.
 */
export function applyKnown(progress: TrapProgress, length: number, now: number): TrapProgress {
  if (progress.learnedAt !== null) return progress;
  return {
    ...progress,
    seenAt: progress.seenAt ?? now,
    chainDepth: Math.max(progress.chainDepth, length),
    learnedAt: now,
    knownAt: now,
    card: firstCard(progress.id, now),
    dueAt: startOfNextLocalDay(now),
    updatedAt: now,
  };
}

export function skipDeviation(progress: TrapProgress, key: string, now: number): TrapProgress {
  const stat = progress.lines[key] ?? { clean: 0, failed: 0, skipped: false };
  return {
    ...progress,
    lines: { ...progress.lines, [key]: { ...stat, skipped: true } },
    updatedAt: now,
  };
}

export function isReviewDue(progress: TrapProgress | undefined, now: number): boolean {
  return progress?.card != null && progress.dueAt !== null && progress.dueAt <= now;
}

/** Records a review. Does nothing for a trap that is not learned or not due. */
export function applyReview(progress: TrapProgress, grade: Grade, now: number): TrapProgress {
  if (!progress.card || !isReviewDue(progress, now)) return progress;
  const card = reviewCard(progress.card, grade, now);
  return {
    ...progress,
    card,
    dueAt: nextReviewDay(card, now),
    reviews: progress.reviews + 1,
    masteredAt: progress.masteredAt ?? (grade === 'again' ? null : now),
    updatedAt: now,
  };
}

export type TrapStatus = 'new' | 'seen' | 'started' | 'learned' | 'mastered';

export function trapStatus(progress: TrapProgress | undefined): TrapStatus {
  if (!progress) return 'new';
  if (progress.masteredAt !== null) return 'mastered';
  if (progress.learnedAt !== null) return 'learned';
  if (progress.chainDepth > 0) return 'started';
  return progress.seenAt !== null ? 'seen' : 'new';
}

/**
 * Traps whose practice is open. The first trap of the ladder is always open; each next one
 * opens when the one before it is mastered (learned and reviewed once without a wrong move)
 * or was marked as known by the player. A trap that was already started stays open, whatever
 * happens to the order later.
 */
export function unlockedIds(order: string[], traps: Record<string, TrapProgress>): Set<string> {
  const open = new Set<string>();
  order.forEach((id, index) => {
    const own = trapStatus(traps[id]);
    const previous = order[index - 1];
    const before = previous === undefined ? undefined : traps[previous];
    const previousDone =
      previous === undefined || trapStatus(before) === 'mastered' || (before?.knownAt ?? null) !== null;
    if (previousDone || own === 'started' || own === 'learned' || own === 'mastered') open.add(id);
  });
  return open;
}

/** Learned traps whose review is open now, the longest waiting first. */
export function dueReviews(
  order: string[],
  traps: Record<string, TrapProgress>,
  now: number,
): string[] {
  return order
    .filter((id) => isReviewDue(traps[id], now))
    .sort((a, b) => (traps[a]?.dueAt ?? 0) - (traps[b]?.dueAt ?? 0));
}

export function gameCounts(games: GameEntry[], trapId: string): Record<GameOutcome, number> {
  const counts: Record<GameOutcome, number> = { worked: 0, declined: 0, refuted: 0 };
  for (const game of games) if (game.trapId === trapId) counts[game.outcome]++;
  return counts;
}
