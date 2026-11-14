import type { ComponentChildren } from 'preact';
import type { TrapFile } from '../../../shared/trap-types.ts';
import { allTraps } from '../../content/traps';
import { emptyProgress, unlockedIds, type TrapProgress } from '../../core/progress';
import type { CompiledTrap } from '../../core/trap-model';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { useStore, type StoreState } from '../../storage/store';

/** Ladder order: the order of the trap list. */
export function trapOrder(): string[] {
  return allTraps().map((trap) => trap.id);
}

export interface TrapAccess {
  store: StoreState;
  progress: TrapProgress;
  /** Practice (chain, review, Learn) is open. View is always open. */
  unlocked: boolean;
  /** The trap that has to be mastered first, when practice is closed. */
  blocker: TrapFile | undefined;
}

export function useTrapAccess(id: string): TrapAccess {
  const store = useStore();
  const traps = allTraps();
  const unlocked = unlockedIds(trapOrder(), store.data.traps).has(id);
  const index = traps.findIndex((trap) => trap.id === id);
  return {
    store,
    progress: store.data.traps[id] ?? emptyProgress(id),
    unlocked,
    blocker: unlocked ? undefined : traps[index - 1],
  };
}

/** Title, side and one or two lines about the current exercise. */
export function TrapHead({ trap, children }: { trap: CompiledTrap; children?: ComponentChildren }) {
  return (
    <div class="trap-head">
      <h1 class="screen-title">{trap.file.title.ru}</h1>
      <p class="trap-meta">
        <span class={`side-dot side-dot-${trap.side}`} aria-hidden="true" />
        {t.learn.playAs[trap.side]}
      </p>
      {children}
    </div>
  );
}

/** Shown instead of a practice screen when the trap is not open yet. */
export function LockedScreen({ trap, blocker }: { trap: CompiledTrap; blocker: TrapFile | undefined }) {
  return (
    <div class="screen board-screen">
      <TrapHead trap={trap} />
      <div class="trap-body">
        <section class="panel">
          {blocker && <p class="verdict">{fmt(t.progress.locked, { title: blocker.title.ru })}</p>}
          <p class="hint-text">{t.progress.lockedHelp}</p>
          <div class="panel-actions">
            {blocker && (
              <a class="button button-primary" href={routeHref({ name: 'trap', id: blocker.id })}>
                {blocker.title.ru}
              </a>
            )}
            <a class="button" href={routeHref({ name: 'trap', id: trap.file.id })}>
              {t.traps.view}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
