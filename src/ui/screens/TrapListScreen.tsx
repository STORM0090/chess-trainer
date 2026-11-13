import type { TrapFile } from '../../../shared/trap-types.ts';
import { allTraps } from '../../content/traps';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { ReliabilityBadge } from '../trap/ReliabilityBadge';

function byStage(traps: TrapFile[]): [number, TrapFile[]][] {
  const stages = new Map<number, TrapFile[]>();
  for (const trap of traps) {
    const list = stages.get(trap.stage);
    if (list) list.push(trap);
    else stages.set(trap.stage, [trap]);
  }
  return [...stages.entries()].sort(([a], [b]) => a - b);
}

/** Every trap, grouped by ladder stage. In this stage of the project all of them are open. */
export function TrapListScreen() {
  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.traps.title}</h1>
      <p class="hint">{t.traps.intro}</p>
      {byStage(allTraps()).map(([stage, traps]) => (
        <section key={stage} class="stage">
          <h2 class="stage-title">{fmt(t.traps.stage, { n: stage })}</h2>
          <ul class="trap-list">
            {traps.map((trap) => (
              <li key={trap.id}>
                <a class="trap-card" href={routeHref({ name: 'trap', id: trap.id })}>
                  <span class="trap-card-text">
                    <span class="trap-card-title">{trap.title.ru}</span>
                    <span class="trap-card-meta">
                      <span class={`side-dot side-dot-${trap.side}`} aria-hidden="true" />
                      {t.traps.kind[trap.kind]} {t.traps.side[trap.side]}
                    </span>
                  </span>
                  <ReliabilityBadge reliability={trap.verification?.reliability} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
