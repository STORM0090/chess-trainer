// Calendar days in the device's time zone. Reviews open in the morning of their day, not at
// the exact hour of the previous session.

export const DAY_MS = 86_400_000;

/** Midnight (local time) of the day that contains `ms`. */
export function startOfLocalDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Midnight (local time) that ends the day containing `ms`. */
export function startOfNextLocalDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return date.getTime();
}

/** Whole calendar days from the day of `from` to the day of `to` (0 when it is the same day). */
export function localDaysBetween(from: number, to: number): number {
  // Rounding absorbs the 23- and 25-hour days around a clock change.
  return Math.round((startOfLocalDay(to) - startOfLocalDay(from)) / DAY_MS);
}
