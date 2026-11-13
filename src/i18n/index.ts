import { ru } from './ru';

export type Messages = typeof ru;

/**
 * The active dictionary. Only Russian exists for now; components read strings through `t`
 * so a language switch later is a change in this file only.
 */
export const t: Messages = ru;

/** Fills "{name}" placeholders: `fmt('Ступень {n}', { n: 2 })` gives "Ступень 2". */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
