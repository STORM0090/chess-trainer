import { useMemo, useState } from 'preact/hooks';
import { getTrap } from '../../content/traps';
import { learnQueue } from '../../core/learn';
import type { CompiledTrap } from '../../core/trap-model';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { LineDrill, type DrillResult } from '../drill/LineDrill';
import { LockedScreen, TrapHead, useTrapAccess } from '../trap/access';
import { lineHelp, lineTitle, resultText } from '../trap/labels';
import { MissingTrap } from './TrapScreen';

/**
 * Learn mode: every line of the trap from move 1, one after another. Free practice: nothing
 * here is saved, and progress is made in the chain.
 */
export function LearnScreen({ id }: { id: string }) {
  const trap = getTrap(id);
  return trap ? <LearnGate key={id} trap={trap} /> : <MissingTrap />;
}

function LearnGate({ trap }: { trap: CompiledTrap }) {
  const access = useTrapAccess(trap.file.id);
  return access.unlocked ? <LearnSession trap={trap} /> : <LockedScreen trap={trap} blocker={access.blocker} />;
}

function LearnSession({ trap }: { trap: CompiledTrap }) {
  const queue = useMemo(() => learnQueue(trap), [trap]);
  const [index, setIndex] = useState(0);
  // A new number starts the run again, also for the same line.
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<DrillResult>();

  // The queue always holds the main line, so the fallback is never used.
  const item = queue[index] ?? queue[0]!;
  const line = item.line;
  const remaining = queue.length - 1 - index;
  const clean = result !== undefined && result.errors === 0 && result.hints === 0;

  const goTo = (next: number) => {
    if (!queue[next]) return;
    setIndex(next);
    setRun((current) => current + 1);
    setResult(undefined);
  };

  return (
    <div class="screen board-screen learn-screen">
      <TrapHead trap={trap}>
        <p class="trap-meta">
          {fmt(t.learn.itemOf, { n: index + 1, total: queue.length })}: {lineTitle(line)}
        </p>
      </TrapHead>

      <LineDrill
        key={run}
        trap={trap}
        line={line}
        startPly={item.startPly}
        doneStatus={remaining === 0 ? t.learn.allDone : t.learn.lineDone}
        onDone={setResult}
        actions={
          remaining > 0 && (
            <button type="button" class="button" onClick={() => goTo(index + 1)}>
              {t.learn.skip}
            </button>
          )
        }
      >
        <section class="panel" aria-live="polite">
          <p class={clean ? 'verdict verdict-ok' : 'verdict'}>
            {clean
              ? t.learn.clean
              : fmt(t.learn.stats, { errors: result?.errors ?? 0, hints: result?.hints ?? 0 })}
          </p>
          <div class="panel-actions">
            {remaining > 0 ? (
              <button type="button" class="button button-primary" onClick={() => goTo(index + 1)}>
                {t.learn.next}
              </button>
            ) : (
              <a class="button button-primary" href={routeHref({ name: 'traps' })}>
                {t.traps.toList}
              </a>
            )}
            <button type="button" class="button" onClick={() => goTo(index)}>
              {t.learn.repeat}
            </button>
            {remaining === 0 && queue.length > 1 && (
              <button type="button" class="button" onClick={() => goTo(0)}>
                {t.learn.restart}
              </button>
            )}
          </div>
          {result?.otherMateSan && <p>{fmt(t.learn.otherMate, { san: result.otherMateSan })}</p>}
          <p>{lineHelp(trap, line)}</p>
          {!result?.otherMateSan && <p class="line-result">{resultText(line.result)}</p>}
          {remaining > 0 && <p class="hint-text">{fmt(t.learn.more, { n: remaining })}</p>}
        </section>
      </LineDrill>

      <div class="trap-body">
        <a class="button button-quiet" href={routeHref({ name: 'trap', id: trap.file.id })}>
          {t.learn.toTrap}
        </a>
      </div>
    </div>
  );
}
