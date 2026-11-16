// Local notifications of the installed app (APK): which reminders should be scheduled now.
// Pure functions; the platform layer compares this plan with what is scheduled and changes
// only the difference.

import { addDays, dayKey, daysBetweenKeys, type DayKey } from './days';

/** The app schedules this many days ahead on every start, so a missed start loses nothing. */
export const REMINDER_DAYS = 14;

export interface PlannedReminder {
  /** A 32-bit integer, as Android requires: the date as YYYYMMDD. */
  id: number;
  date: DayKey;
  /** Local time of the reminder, in milliseconds. */
  at: number;
  /** Index into the list of reminder texts. */
  text: number;
}

export function reminderId(date: DayKey): number {
  return Number(date.replaceAll('-', ''));
}

/** The moment `time` ("HH:MM") on the local date `date`. */
export function reminderMoment(date: DayKey, time: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0).getTime();
}

/**
 * Reminders for today and the next days. Today is left out when the daily norm is already
 * met or the time has passed. The texts go round so that two days in a row never say the
 * same thing.
 */
export function planReminders(time: string, normMetToday: boolean, now: number, texts: number): PlannedReminder[] {
  const today = dayKey(now);
  const plan: PlannedReminder[] = [];
  for (let offset = 0; offset < REMINDER_DAYS; offset++) {
    const date = addDays(today, offset);
    const at = reminderMoment(date, time);
    if (offset === 0 && (normMetToday || at <= now)) continue;
    const id = reminderId(date);
    // Counted in days, so consecutive days always get different texts, across months too.
    const text = texts > 0 ? ((daysBetweenKeys('2026-01-01', date) % texts) + texts) % texts : 0;
    plan.push({ id, date, at, text });
  }
  return plan;
}

export interface ScheduledReminder {
  id: number;
  at: number;
}

/** What to cancel and what to schedule so that the scheduled reminders match the plan. */
export function reminderChanges(
  plan: PlannedReminder[],
  scheduled: ScheduledReminder[],
): { cancel: number[]; schedule: PlannedReminder[] } {
  const wanted = new Map(plan.map((item) => [item.id, item]));
  const cancel = scheduled
    .filter((item) => wanted.get(item.id)?.at !== item.at)
    .map((item) => item.id);
  const kept = new Set(scheduled.filter((item) => wanted.get(item.id)?.at === item.at).map((item) => item.id));
  return { cancel, schedule: plan.filter((item) => !kept.has(item.id)) };
}
