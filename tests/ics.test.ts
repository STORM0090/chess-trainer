import { describe, expect, it } from 'vitest';
import { isReminderTime, reminderCalendar } from '../src/core/ics';

const EVENT = {
  time: '19:05',
  startDate: '2026-11-14',
  title: 'Chess Trainer: пять минут шахмат',
  description: 'Ловушка или пара задач; коротко, без спешки.',
  url: 'https://example.org/chess-trainer/',
  createdAt: Date.UTC(2026, 10, 14, 9, 30, 15),
};

/** Puts folded lines back together, as a calendar program does. */
function unfold(text: string): string[] {
  return text.replace(/\r\n /g, '').split('\r\n');
}

describe('reminderCalendar', () => {
  const text = reminderCalendar(EVENT);
  const lines = unfold(text);

  it('is one daily event at the local time, with an alarm', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(lines.at(-1)).toBe('');
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1);
    // Floating time: no "Z" and no time zone, so it follows the wall clock.
    expect(lines).toContain('DTSTART:20261114T190500');
    expect(lines).toContain('RRULE:FREQ=DAILY');
    expect(lines).toContain('DURATION:PT5M');
    expect(lines).toContain('DTSTAMP:20261114T093015Z');
    expect(lines).toContain('BEGIN:VALARM');
    expect(lines).toContain('TRIGGER:PT0M');
    expect(lines).toContain('ACTION:DISPLAY');
  });

  it('has a stable identifier per app address, so a second import replaces the first', () => {
    const uid = lines.find((line) => line.startsWith('UID:'));
    expect(uid).toBe('UID:daily-reminder-chess-trainer@example.org');
    expect(unfold(reminderCalendar({ ...EVENT, time: '07:00', createdAt: 1 })).find((line) => line.startsWith('UID:'))).toBe(uid);
    const preview = reminderCalendar({ ...EVENT, url: 'https://example.org/chess-trainer/preview/m5/' });
    expect(unfold(preview).find((line) => line.startsWith('UID:'))).not.toBe(uid);
  });

  it('escapes text and keeps the address', () => {
    expect(lines).toContain('SUMMARY:Chess Trainer: пять минут шахмат');
    expect(lines).toContain(
      'DESCRIPTION:Ловушка или пара задач\\; коротко\\, без спешки.\\nhttps://example.org/chess-trainer/',
    );
    expect(lines).toContain('URL:https://example.org/chess-trainer/');
  });

  it('uses CRLF and folds lines at 75 bytes without cutting a letter', () => {
    expect(text.includes('\n') && !/[^\r]\n/.test(text)).toBe(true);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    for (const line of text.split('\r\n')) {
      const bytes = encoder.encode(line);
      expect(bytes.length).toBeLessThanOrEqual(75);
      // Every physical line is valid UTF-8 by itself.
      expect(() => decoder.decode(bytes)).not.toThrow();
    }
    expect(text).toContain('\r\n ');
  });

  it('refuses a time that is not a time', () => {
    expect(() => reminderCalendar({ ...EVENT, time: '25:00' })).toThrow();
    expect(isReminderTime('00:00')).toBe(true);
    expect(isReminderTime('23:59')).toBe(true);
    expect(isReminderTime('24:00')).toBe(false);
    expect(isReminderTime('7:00')).toBe(false);
    expect(isReminderTime(undefined)).toBe(false);
  });
});
