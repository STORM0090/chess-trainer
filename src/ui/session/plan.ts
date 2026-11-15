// Gathers what the session planner needs from the saved progress and the content.

import type { PuzzleEntry } from '../../../shared/puzzle-types.ts';
import { allTraps, getTrap } from '../../content/traps';
import { chainLength, nextChainStep } from '../../core/chain';
import { newTrapHeldBack, planSession, type DayRecord, type SessionItem, type SessionShape } from '../../core/daily';
import { dueReviews, emptyProgress, isReviewDue, unlockedIds, type AppData } from '../../core/progress';
import { currentLevel, duePuzzleIds, isPuzzleDue } from '../../core/tactics';
import { trapOrder } from '../trap/access';

/** The open trap that is not learned yet and may be practised today. */
export function trapOfTheDay(data: AppData, day: DayRecord): { id: string; stepsLeft: number; isNew: boolean } | undefined {
  const open = unlockedIds(trapOrder(), data.traps);
  const candidates = allTraps()
    .filter((trap) => open.has(trap.id) && (data.traps[trap.id]?.learnedAt ?? null) === null)
    .map((file) => {
      const progress = data.traps[file.id] ?? emptyProgress(file.id);
      return { file, progress, hasRuns: progress.runs.clean + progress.runs.failed > 0 };
    });
  // A trap in progress comes first: it may have been started from the list, out of order.
  const chosen =
    candidates.find((candidate) => candidate.hasRuns) ??
    candidates.find((candidate) => !newTrapHeldBack(day, candidate.file.id, candidate.hasRuns));
  const trap = chosen && getTrap(chosen.file.id);
  if (!chosen || !trap) return undefined;
  return {
    id: trap.file.id,
    stepsLeft: Math.max(0, chainLength(trap) - chosen.progress.chainDepth),
    isNew: !chosen.hasRuns,
  };
}

export function buildSessionPlan(data: AppData, day: DayRecord, pool: PuzzleEntry[], now: number): SessionItem[] {
  return planSession({
    pool,
    puzzles: data.puzzles,
    level: currentLevel(data.tactics),
    dueTraps: dueReviews(trapOrder(), data.traps, now),
    trap: trapOfTheDay(data, day),
    now,
    random: Math.random,
  });
}

/** What today's session will be about, before it is planned (the home screen needs no puzzles for this). */
export function expectedShape(data: AppData, day: DayRecord, now: number): SessionShape {
  if (trapOfTheDay(data, day)) return 'trap';
  const reviews = dueReviews(trapOrder(), data.traps, now).length + duePuzzleIds(data.puzzles, now).length;
  return reviews > 0 ? 'review' : 'puzzles';
}

/**
 * Whether a planned item can still be played. Something done outside the session in the
 * meantime (the review from the trap page, the puzzle from its theme) is skipped.
 */
export function isPlayable(item: SessionItem, data: AppData, pool: PuzzleEntry[], now: number): boolean {
  if (item.done) return false;
  if (item.kind === 'puzzle') {
    if (!pool.some((puzzle) => puzzle.id === item.id)) return false;
    const stat = data.puzzles[item.id];
    return item.role === 'review' ? isPuzzleDue(stat, now) : stat === undefined;
  }
  const trap = getTrap(item.id);
  if (!trap) return false;
  const progress = data.traps[item.id] ?? emptyProgress(item.id);
  if (item.kind === 'trapReview') return isReviewDue(progress, now);
  return (
    unlockedIds(trapOrder(), data.traps).has(item.id) &&
    progress.learnedAt === null &&
    nextChainStep(trap, progress) !== undefined
  );
}
