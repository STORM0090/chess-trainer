// Calendar days in the device's time zone. Reviews open in the morning of their day, not at
// the exact hour of the previous session, and the daily log is keyed by the local date.
//
// Everything here reads the local date through `Date` getters and does arithmetic on the
// calendar date itself, never by adding 24 hours: a day is 23 or 25 hours long when the
// clocks change.

export const DAY_MS = 86_400_000;

/**
 * The first moment (local time) of the day that contains `ms`: midnight, or 01:00 on the
 * one day of the year when a zone moves its clocks forward at midnight.
 */
export function startOfLocalDay(ms: number): number {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * The first moment (local time) of the day after the one that contains `ms`. Built from
 * the calendar date, not by adding a day to a time: where midnight is skipped, "midnight
 * plus one day" would land an hour inside the next day.
 */
export function startOfNextLocalDay(ms: number): number {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

/** Whole calendar days from the day of `from` to the day of `to` (0 when it is the same day). */
export function localDaysBetween(from: number, to: number): number {
  return daysBetweenKeys(dayKey(from), dayKey(to));
}

/** A local calendar date as "YYYY-MM-DD". Keys sort like dates. */
export type DayKey = string;

const two = (value: number) => String(value).padStart(2, '0');

/** The local date of the moment `ms`. */
export function dayKey(ms: number): DayKey {
  const date = new Date(ms);
  return `${String(date.getFullYear()).padStart(4, '0')}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return keyFromUtc(utcOfKey(value)) === value;
}

/** The date as a UTC timestamp: a plain day counter, free of time zones and clock changes. */
function utcOfKey(key: DayKey): number {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function keyFromUtc(utc: number): DayKey {
  const date = new Date(utc);
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${two(date.getUTCMonth() + 1)}-${two(date.getUTCDate())}`;
}

/** The date `count` days after `key` (before it for a negative count). */
export function addDays(key: DayKey, count: number): DayKey {
  return keyFromUtc(utcOfKey(key) + count * DAY_MS);
}

/** Days from `from` to `to`; negative when `to` is earlier. */
export function daysBetweenKeys(from: DayKey, to: DayKey): number {
  return Math.round((utcOfKey(to) - utcOfKey(from)) / DAY_MS);
}

/** 0 for Monday ... 6 for Sunday. */
export function weekdayOfKey(key: DayKey): number {
  return (new Date(utcOfKey(key)).getUTCDay() + 6) % 7;
}
