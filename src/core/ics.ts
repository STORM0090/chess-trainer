// A calendar file with a daily reminder. The app has no server and a PWA cannot schedule its
// own notifications, so the phone's calendar does the reminding. RFC 5545.

export interface ReminderEvent {
  /** Local time, "HH:MM". */
  time: string;
  /** Local date of the first reminder, "YYYY-MM-DD". */
  startDate: string;
  title: string;
  description: string;
  /** Address of the app, opened from the calendar entry. */
  url: string;
  /** When the file is made (milliseconds); written as the UTC stamp the format requires. */
  createdAt: number;
}

/**
 * One identifier per app address, and a sequence number that grows with every file, so a
 * calendar that follows the standard replaces the old event. Not every calendar app does:
 * the settings screen says to delete the old event first.
 */
export const REMINDER_UID_PREFIX = 'daily-reminder';

export function isReminderTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Commas, semicolons, backslashes and line breaks have a meaning in the format. */
function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/**
 * Lines longer than 75 octets are folded: a line break followed by one space. The limit is
 * in bytes of UTF-8, and a character is never cut in half (Russian letters take two bytes).
 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // The continuation lines start with a space, which counts.
    if (bytes + size > 75) {
      parts.push(current);
      current = ' ';
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

function utcStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function hostOf(url: string): string {
  try {
    return new URL(url).host || 'chess-trainer.local';
  } catch {
    return 'chess-trainer.local';
  }
}

/**
 * The text of the `.ics` file: one event that repeats every day at the given local time,
 * five minutes long, with an alarm at its start. The time is "floating" (no time zone), so
 * it stays 19:00 by the wall clock when the clocks change and when the owner travels.
 */
export function reminderCalendar(event: ReminderEvent): string {
  if (!isReminderTime(event.time)) throw new Error(`Bad reminder time "${event.time}"`);
  const start = `${event.startDate.replace(/-/g, '')}T${event.time.replace(':', '')}00`;
  const path = (() => {
    try {
      return new URL(event.url).pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    } catch {
      return '';
    }
  })();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chess Trainer//Daily reminder//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${REMINDER_UID_PREFIX}${path ? `-${path}` : ''}@${hostOf(event.url)}`,
    `DTSTAMP:${utcStamp(event.createdAt)}`,
    // Seconds since 2026: a whole number that grows with every file and stays small.
    `SEQUENCE:${Math.max(0, Math.floor((event.createdAt - Date.UTC(2026, 0, 1)) / 1000))}`,
    `DTSTART:${start}`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(`${event.description}\n${event.url}`)}`,
    `URL:${event.url}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(event.title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
