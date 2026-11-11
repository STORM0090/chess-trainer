import { ru } from './ru';

export type Messages = typeof ru;

/**
 * The active dictionary. Only Russian exists for now; components read strings through `t`
 * so a language switch later is a change in this file only.
 */
export const t: Messages = ru;
