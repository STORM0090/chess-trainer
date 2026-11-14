import { ru } from './ru';

export type Messages = typeof ru;

/**
 * The active dictionary. Only Russian exists for now; components read strings through `t`
 * so a language switch later is a change in this file only.
 */
export const t: Messages = ru;

/**
 * The Russian form of a noun for a number: `plural(3, ['день', 'дня', 'дней'])` gives "дня".
 * The forms are: for 1, for 2 to 4, for 5 and more.
 */
export function plural(count: number, forms: readonly [string, string, string]): string {
  const n = Math.abs(count) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (last === 1) return forms[0];
  return last >= 2 && last <= 4 ? forms[1] : forms[2];
}

/** Fills "{name}" placeholders: `fmt('Ступень {n}', { n: 2 })` gives "Ступень 2". */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
