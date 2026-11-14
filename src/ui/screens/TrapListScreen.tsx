import type { TrapFile } from '../../../shared/trap-types.ts';
import { allTraps, getTrap } from '../../content/traps';
import { chainLength, nextChainStep } from '../../core/chain';
import { dueReviews, emptyProgress, trapStatus, unlockedIds, type AppData } from '../../core/progress';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { appNow, useStore } from '../../storage/store';
import { ReliabilityBadge } from '../trap/ReliabilityBadge';
import { trapOrder } from '../trap/access';
import { whenText } from '../trap/labels';

function byStage(traps: TrapFile[]): [number, TrapFile[]][] {
  const stages = new Map<number, TrapFile[]>();
  for (const trap of traps) {
    const list = stages.get(trap.stage);
    if (list) list.push(trap);
    else stages.set(trap.stage, [trap]);
  }
  return [...stages.entries()].sort(([a], [b]) => a - b);
}

/** What to do now: due reviews first, then the next step of the trap in progress. */
function Today({ data, open }: { data: AppData; open: Set<string> }) {
  const traps = allTraps();
  const now = appNow();
  const due = dueReviews(trapOrder(), data.traps, now);
  const mastered = traps.filter((trap) => trapStatus(data.traps[trap.id]) === 'mastered').length;
  // The open trap that is not learned yet. With one trap opening at a time there is one at most.
  const current = traps.find((trap) => open.has(trap.id) && (data.traps[trap.id]?.learnedAt ?? null) === null);
  const compiled = current && getTrap(current.id);
  const step = compiled && nextChainStep(compiled, data.traps[compiled.file.id] ?? emptyProgress(compiled.file.id));
  // Learned but not reviewed yet: the trap everything is waiting for.
  const waiting = traps.find((trap) => trapStatus(data.traps[trap.id]) === 'learned');
  const waitingDue = waiting && data.traps[waiting.id]?.dueAt;

  return (
    <section class="panel today">
      <p class="today-count">{fmt(t.home.mastered, { n: mastered, total: traps.length })}</p>
      {due[0] !== undefined && (
        <a class="button button-primary" href={routeHref({ name: 'review', id: due[0] })}>
          {fmt(t.home.reviews, { n: due.length })}
        </a>
      )}
      {compiled && current && (
        <a class={due.length > 0 ? 'button' : 'button button-primary'} href={routeHref({ name: 'chain', id: current.id })}>
          <span class="button-two-lines">
            <span>{current.title.ru}</span>
            <span class="button-note">
              {step?.kind === 'main' && step.depth > 1
                ? fmt(t.home.chainStep, { n: step.depth, total: chainLength(compiled) })
                : t.home.chainStart}
            </span>
          </span>
        </a>
      )}
      {!current && waiting && waitingDue != null && due.length === 0 && (
        <p class="hint-text">
          {fmt(t.home.waiting, { title: waiting.title.ru, when: whenText(waitingDue, now) })}
        </p>
      )}
      {mastered === traps.length && <p class="hint-text">{t.home.allMastered}</p>}
    </section>
  );
}

/** Every trap, grouped by ladder stage, with the player's status. Viewing is always open. */
export function TrapListScreen() {
  const { data } = useStore();
  const open = unlockedIds(trapOrder(), data.traps);
  const worked = new Set(data.games.filter((game) => game.outcome === 'worked').map((game) => game.trapId));

  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.traps.title}</h1>
      <Today data={data} open={open} />
      <p class="hint">{t.traps.intro}</p>
      {byStage(allTraps()).map(([stage, traps]) => (
        <section key={stage} class="stage">
          <h2 class="stage-title">{fmt(t.traps.stage, { n: stage })}</h2>
          <ul class="trap-list">
            {traps.map((trap) => {
              const status = trapStatus(data.traps[trap.id]);
              const locked = !open.has(trap.id);
              return (
                <li key={trap.id}>
                  <a
                    class={`trap-card${locked ? ' trap-card-locked' : ''}`}
                    href={routeHref({ name: 'trap', id: trap.id })}
                  >
                    <span class="trap-card-text">
                      <span class="trap-card-title">{trap.title.ru}</span>
                      <span class="trap-card-meta">
                        <span class={`side-dot side-dot-${trap.side}`} aria-hidden="true" />
                        {t.traps.kind[trap.kind]} {t.traps.side[trap.side]}
                      </span>
                      {(status !== 'new' || locked || worked.has(trap.id)) && (
                        <span class="trap-card-meta trap-card-marks">
                          {status !== 'new' && (
                            <span class={`badge badge-status-${status}`}>{t.progress.status[status]}</span>
                          )}
                          {locked && <span class="badge badge-status-locked">{t.progress.lockedShort}</span>}
                          {worked.has(trap.id) && (
                            <span class="badge badge-status-worked">{t.home.worked}</span>
                          )}
                        </span>
                      )}
                    </span>
                    <ReliabilityBadge reliability={trap.verification?.reliability} />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
