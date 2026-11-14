// Spaced repetition for learned traps. The only module that talks to ts-fsrs.

import { DefaultScheduler, Rating } from 'ts-fsrs';
import { startOfLocalDay, startOfNextLocalDay } from './days';


/** An FSRS-7 card as it is saved: the library's fields, with dates as milliseconds. */
export interface StoredCard {
  cardId: string;
  stability: number;
  stabilityFast: number;
  difficulty: number;
  state: number;
  scheduleStatus: string;
  dueAt: number;
  lastReviewAt: number | null;
  reps: number;
  lapses: number;
  scheduledDays: number;
  learningStep: number;
}

/** The card as the library hands it out. */
interface LibCard extends Omit<StoredCard, 'dueAt' | 'lastReviewAt' | 'cardId'> {
  cardId: string | number;
  dueAt: Date;
  lastReviewAt: Date | null;
}

/**
 * The part of the ts-fsrs scheduler this module uses. The library's own type is a union over
 * every FSRS version, which TypeScript cannot call; the version is fixed to FSRS-7 below.
 */
interface Scheduler {
  newCard(input: { now: Date }): LibCard;
  review(input: { card: LibCard; grade: Rating; now: Date }): { card: LibCard };
}

/**
 * How a review went. `good`: no errors and no hints. `hard`: hints, but no wrong move.
 * `again`: at least one wrong move. FSRS's "easy" is not used.
 */
export type Grade = 'again' | 'hard' | 'good';

const RATING: Record<Grade, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
};

let scheduler: Scheduler | undefined;

/**
 * Creates the scheduler. ts-fsrs builds it asynchronously, so the app and the tests call this
 * once before anything is scheduled.
 */
export async function initSchedule(): Promise<void> {
  scheduler ??= (await DefaultScheduler({
    // Pinned on purpose: a library update must not silently change the model.
    version: 'FSRS-7',
    desiredRetention: 0.9,
    // Intervals are counted in days. Steps of minutes make no sense for one session a day.
    enableShortTerm: false,
    // No randomness: the same history always gives the same dates.
    enableFuzz: false,
  })) as unknown as Scheduler;
}

function ready(): Scheduler {
  if (!scheduler) throw new Error('initSchedule() has not finished');
  return scheduler;
}

function store(card: LibCard): StoredCard {
  return {
    cardId: String(card.cardId),
    stability: card.stability,
    stabilityFast: card.stabilityFast,
    difficulty: card.difficulty,
    state: card.state,
    scheduleStatus: card.scheduleStatus,
    dueAt: card.dueAt.getTime(),
    lastReviewAt: card.lastReviewAt ? card.lastReviewAt.getTime() : null,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduledDays,
    learningStep: card.learningStep,
  };
}

function answer(card: LibCard, grade: Grade, now: number): StoredCard {
  return store(ready().review({ card, grade: RATING[grade], now: new Date(now) }).card);
}

/** The card of a trap that has just been learned: one "good" answer at `now`. */
export function firstCard(cardId: string, now: number): StoredCard {
  return answer({ ...ready().newCard({ now: new Date(now) }), cardId }, 'good', now);
}

export function reviewCard(card: StoredCard, grade: Grade, now: number): StoredCard {
  const revived: LibCard = {
    ...card,
    dueAt: new Date(card.dueAt),
    lastReviewAt: card.lastReviewAt === null ? null : new Date(card.lastReviewAt),
  };
  return answer(revived, grade, now);
}

/**
 * When the next review opens: the morning of the day FSRS chose, and never on the day of the
 * review itself. A failed review therefore comes back tomorrow.
 */
export function nextReviewDay(card: StoredCard, now: number): number {
  return Math.max(startOfNextLocalDay(now), startOfLocalDay(card.dueAt));
}
