import { describe, expect, it } from 'vitest';
import { dayKey, daysBetweenKeys } from '../src/core/days';
import { REMINDER_DAYS, planReminders, reminderChanges, reminderId, reminderMoment } from '../src/core/reminders';

const MORNING = new Date(2026, 10, 16, 9, 0).getTime();
const NIGHT = new Date(2026, 10, 16, 22, 0).getTime();

describe('planReminders', () => {
  it('plans fourteen days from today at the chosen local time', () => {
    const plan = planReminders('19:00', false, MORNING, 9);
    expect(plan).toHaveLength(REMINDER_DAYS);
    expect(plan[0]).toMatchObject({ id: 20261116, date: '2026-11-16' });
    expect(new Date(plan[0]?.at ?? 0).getHours()).toBe(19);
    expect(plan.at(-1)?.date).toBe('2026-11-29');
    for (const item of plan) {
      expect(dayKey(item.at)).toBe(item.date);
      expect(Number.isInteger(item.id) && item.id < 2 ** 31).toBe(true);
    }
  });

  it('leaves today out when the norm is met or the time has passed', () => {
    expect(planReminders('19:00', true, MORNING, 9)[0]?.date).toBe('2026-11-17');
    expect(planReminders('19:00', false, NIGHT, 9)[0]?.date).toBe('2026-11-17');
    expect(planReminders('19:00', true, MORNING, 9)).toHaveLength(REMINDER_DAYS - 1);
  });

  it('never repeats a text two days in a row, across months and years', () => {
    const plan = [MORNING, new Date(2026, 11, 25, 9).getTime(), new Date(2027, 1, 20, 9).getTime()].flatMap((now) =>
      planReminders('07:30', false, now, 9),
    );
    let pairs = 0;
    plan.slice(1).forEach((item, index) => {
      const previous = plan[index];
      if (!previous || daysBetweenKeys(previous.date, item.date) !== 1) return;
      pairs++;
      expect(item.text).not.toBe(previous.text);
    });
    expect(pairs).toBeGreaterThan(30);
    for (const item of plan) expect(item.text).toBeLessThan(9);
  });
});

describe('reminderChanges', () => {
  const plan = planReminders('19:00', false, MORNING, 9);

  it('schedules everything when nothing is scheduled, and nothing when all is in place', () => {
    expect(reminderChanges(plan, [])).toEqual({ cancel: [], schedule: plan });
    const scheduled = plan.map((item) => ({ id: item.id, at: item.at }));
    expect(reminderChanges(plan, scheduled)).toEqual({ cancel: [], schedule: [] });
  });

  it('moves reminders whose time changed and cancels the ones not wanted any more', () => {
    const earlier = planReminders('08:00', false, MORNING, 9).map((item) => ({ id: item.id, at: item.at }));
    const changes = reminderChanges(plan, [...earlier, { id: 20261101, at: 1 }]);
    expect(changes.cancel).toHaveLength(earlier.length + 1);
    expect(changes.schedule).toEqual(plan);
    // The norm met today: only today's reminder goes.
    const today = reminderChanges(planReminders('19:00', true, MORNING, 9), plan);
    expect(today).toEqual({ cancel: [reminderId('2026-11-16')], schedule: [] });
  });
});

describe('reminderMoment', () => {
  it('is the local wall-clock time of that date', () => {
    const at = reminderMoment('2026-03-29', '07:30');
    expect(new Date(at).getHours()).toBe(7);
    expect(new Date(at).getMinutes()).toBe(30);
    expect(dayKey(at)).toBe('2026-03-29');
  });
});
