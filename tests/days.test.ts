import { afterAll, describe, expect, it } from 'vitest';
import {
  DAY_MS,
  addDays,
  dayKey,
  daysBetweenKeys,
  isDayKey,
  localDaysBetween,
  startOfLocalDay,
  startOfNextLocalDay,
  weekdayOfKey,
} from '../src/core/days';
import { applyActivity, emptyDay, streakState, type DayRecord } from '../src/core/daily';

// Node reads the TZ variable again every time it is set, so one test file can visit
// several time zones. The zone of the machine is put back at the end.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const ORIGINAL_TZ = env.TZ;
function inZone<T>(zone: string, run: () => T): T {
  env.TZ = zone;
  try {
    return run();
  } finally {
    if (ORIGINAL_TZ === undefined) delete env.TZ;
    else env.TZ = ORIGINAL_TZ;
  }
}
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete env.TZ;
  else env.TZ = ORIGINAL_TZ;
});

describe('day keys', () => {
  it('does calendar arithmetic without a clock', () => {
    expect(addDays('2026-11-14', 1)).toBe('2026-11-15');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetweenKeys('2026-11-14', '2026-11-14')).toBe(0);
    expect(daysBetweenKeys('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetweenKeys('2026-11-14', '2025-11-14')).toBe(-365);
    expect(weekdayOfKey('2026-11-14')).toBe(5); // a Saturday
    expect(weekdayOfKey('2026-11-16')).toBe(0); // a Monday
  });

  it('recognises real dates only', () => {
    expect(isDayKey('2026-11-14')).toBe(true);
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(isDayKey('2026-1-1')).toBe(false);
    expect(isDayKey('today')).toBe(false);
    expect(isDayKey(20261114)).toBe(false);
  });
});

// Zones with every kind of clock change: an ordinary hour at night (Kyiv, New York), a
// change at midnight, where 00:00 does not exist on one day of the year (Santiago, Cairo),
// half an hour (Lord Howe), none at all (Kolkata), and the far ends of the date line.
const ZONES = [
  'Europe/Kyiv',
  'America/New_York',
  'America/Santiago',
  'Africa/Cairo',
  'Australia/Lord_Howe',
  'Asia/Kolkata',
  'Pacific/Kiritimati',
  'Pacific/Pago_Pago',
  'UTC',
];

describe.each(ZONES)('local days in %s', (zone) => {
  it('keeps every moment of a day in that day, all year round', () => {
    inZone(zone, () => {
      let key = '2026-01-01';
      for (let index = 0; index < 366; index++) {
        const [year, month, day] = key.split('-').map(Number);
        const noon = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12).getTime();
        expect(dayKey(noon), key).toBe(key);
        const start = startOfLocalDay(noon);
        const next = startOfNextLocalDay(noon);
        expect(dayKey(start), `start of ${key}`).toBe(key);
        expect(dayKey(next - 1), `last moment of ${key}`).toBe(key);
        expect(dayKey(next), `start of the day after ${key}`).toBe(addDays(key, 1));
        expect(start <= noon && noon < next).toBe(true);
        // A day is 23, 24 or 25 hours long (23.5 and 24.5 on Lord Howe), never anything else.
        expect([23, 23.5, 24, 24.5, 25]).toContain((next - start) / 3_600_000);
        expect(localDaysBetween(start, next)).toBe(1);
        expect(localDaysBetween(noon, noon + 3 * DAY_MS)).toBe(3);
        key = addDays(key, 1);
      }
    });
  });
});

describe('clock changes', () => {
  it('opens tomorrow at midnight when the night is an hour short or long', () => {
    inZone('Europe/Kyiv', () => {
      // 29 March 2026: 03:00 becomes 04:00. 25 October 2026: 04:00 becomes 03:00.
      const springEve = new Date(2026, 2, 28, 23, 30).getTime();
      const spring = startOfNextLocalDay(springEve);
      expect(new Date(spring).getHours()).toBe(0);
      expect(startOfNextLocalDay(spring) - spring).toBe(23 * 3_600_000);
      const autumn = startOfLocalDay(new Date(2026, 9, 25, 12).getTime());
      expect(startOfNextLocalDay(autumn) - autumn).toBe(25 * 3_600_000);
      // 01:30 on the long day happens once here (the repeated hour is 03:00 to 04:00).
      expect(dayKey(autumn + 3.5 * 3_600_000)).toBe('2026-10-25');
      expect(localDaysBetween(new Date(2026, 9, 24, 23).getTime(), new Date(2026, 9, 26, 1).getTime())).toBe(2);
    });
  });

  it('starts the day at the first moment that exists when midnight is skipped', () => {
    inZone('America/Santiago', () => {
      // In Chile the clocks go from 24:00 straight to 01:00 at the start of summer time.
      let key = '2026-08-01';
      let found = false;
      for (let index = 0; index < 90; index++) {
        const [year, month, day] = key.split('-').map(Number);
        const start = startOfLocalDay(new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12).getTime());
        if (new Date(start).getHours() !== 0) {
          found = true;
          expect(dayKey(start)).toBe(key);
          expect(dayKey(start - 1)).toBe(addDays(key, -1));
        }
        key = addDays(key, 1);
      }
      expect(found, 'a day without midnight in the tested range').toBe(true);
    });
  });
});

describe('the daily log across time zones and clock changes', () => {
  const practise = (days: Record<string, DayRecord>, at: number) => {
    const date = dayKey(at);
    days[date] = applyActivity(days[date] ?? emptyDay(date), 'puzzle', true, 1, at);
  };

  it('keeps one day one day through the autumn clock change', () => {
    inZone('Europe/Kyiv', () => {
      const days: Record<string, DayRecord> = {};
      for (const day of [23, 24, 25, 26, 27]) practise(days, new Date(2026, 9, day, 21).getTime());
      // Twice on the long day, once in each "03:30".
      const long = startOfLocalDay(new Date(2026, 9, 25, 12).getTime());
      practise(days, long + 3.5 * 3_600_000);
      practise(days, long + 4.5 * 3_600_000);
      expect(Object.keys(days)).toHaveLength(5);
      expect(days['2026-10-25']?.done).toBe(3);
      expect(streakState(days, '2026-10-27')).toMatchObject({ current: 5, totalDays: 5 });
    });
  });

  it('does not break the streak on a flight west or east', () => {
    const days: Record<string, DayRecord> = {};
    // Three evenings in Kyiv.
    inZone('Europe/Kyiv', () => {
      for (const day of [10, 11, 12]) practise(days, new Date(2026, 10, day, 21).getTime());
    });
    // West: the same evening comes twice by the calendar, nothing is lost.
    const afterLanding = inZone('Europe/Kyiv', () => new Date(2026, 10, 13, 8).getTime());
    inZone('America/Los_Angeles', () => {
      expect(dayKey(afterLanding)).toBe('2026-11-12');
      practise(days, afterLanding);
      practise(days, afterLanding + 20 * 3_600_000);
      expect(streakState(days, dayKey(afterLanding + 20 * 3_600_000))).toMatchObject({ current: 4, totalDays: 4 });
    });
    // East, far: 22 hours after the last session the local date has jumped over a day.
    const last = afterLanding + 20 * 3_600_000;
    inZone('Pacific/Kiritimati', () => {
      const there = last + 22 * 3_600_000;
      expect(daysBetweenKeys('2026-11-13', dayKey(there))).toBe(2);
      practise(days, there);
      expect(streakState(days, dayKey(there))).toMatchObject({ current: 5, totalDays: 5, frozen: [] });
    });
  });

  it('is harmless when the clock is set back or forward by hand', () => {
    inZone('Europe/Kyiv', () => {
      const days: Record<string, DayRecord> = {};
      const base = new Date(2026, 10, 10, 20).getTime();
      for (let day = 0; day < 4; day++) practise(days, base + day * DAY_MS);
      // The clock is set two days back: practice lands on days that already have records.
      practise(days, base + DAY_MS);
      expect(Object.keys(days)).toHaveLength(4);
      // The streak runs up to the day the device shows; later records count as days of practice.
      expect(streakState(days, dayKey(base + DAY_MS))).toMatchObject({ current: 2, totalDays: 4 });
      // The clock is set a month ahead and back again: one far record, no crash, no lost total.
      practise(days, base + 30 * DAY_MS);
      const state = streakState(days, dayKey(base + 4 * DAY_MS));
      expect(state.totalDays).toBe(5);
      expect(state.best).toBe(4);
    });
  });
});
