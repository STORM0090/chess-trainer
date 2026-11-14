// Trap content bundled into the app. The files are small, so all of them ship in the main
// bundle and work offline without extra requests.

import { compareLadder } from '../../shared/ladder.ts';
import type { TrapFile } from '../../shared/trap-types.ts';
import { compileTrap, type CompiledTrap } from '../core/trap-model';

const files = import.meta.glob<TrapFile>('../../content/traps/*.json', {
  eager: true,
  import: 'default',
});

/** Verified traps only, in ladder order: by stage, then by the `order` field of the file. */
const traps: TrapFile[] = Object.values(files)
  .filter((file) => file.verified === true && file.draft !== true)
  .sort(compareLadder);

export function allTraps(): TrapFile[] {
  return traps;
}

const compiled = new Map<string, CompiledTrap>();

/** Compiles a trap on first use and remembers it. */
export function getTrap(id: string): CompiledTrap | undefined {
  const cached = compiled.get(id);
  if (cached) return cached;
  const file = traps.find((trap) => trap.id === id);
  if (!file) return undefined;
  const trap = compileTrap(file);
  compiled.set(id, trap);
  return trap;
}
