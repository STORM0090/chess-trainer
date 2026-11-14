import { useState } from 'preact/hooks';
import { getTrap } from '../../content/traps';
import { blowDepths, chainLength, nextChainStep, type ChainStep } from '../../core/chain';
import { applyChainRun, isClean, skipDeviation, type TrapProgress } from '../../core/progress';
import type { CompiledTrap } from '../../core/trap-model';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { appNow, updateTrap } from '../../storage/store';
import { LineDrill, type DrillResult } from '../drill/LineDrill';
import { LockedScreen, TrapHead, useTrapAccess } from '../trap/access';
import { lineHelp, resultText } from '../trap/labels';
import { MissingTrap } from './TrapScreen';

/**
 * Backward chain: the last move first, then the last two, back to move 1, with the
 * opponent's deviations in between. This is where a trap gets learned; every step is saved.
 */
export function ChainScreen({ id }: { id: string }) {
  const trap = getTrap(id);
  return trap ? <ChainGate key={id} trap={trap} /> : <MissingTrap />;
}

function ChainGate({ trap }: { trap: CompiledTrap }) {
  const access = useTrapAccess(trap.file.id);
  return access.unlocked ? (
    <ChainSession trap={trap} progress={access.progress} />
  ) : (
    <LockedScreen trap={trap} blocker={access.blocker} />
  );
}

function stepHelp(trap: CompiledTrap, step: ChainStep): string {
  if (step.kind === 'deviation') return t.chain.deviationHelp;
  const blow = blowDepths(trap);
  if (blow === 0) return t.chain.defence;
  return step.depth <= blow ? t.chain.inBlow : t.chain.withSetup;
}

function ChainSession({ trap, progress }: { trap: CompiledTrap; progress: TrapProgress }) {
  const id = trap.file.id;
  const length = chainLength(trap);
  // The step of the current run stays the same while the saved progress moves on under it.
  const [step, setStep] = useState(() => nextChainStep(trap, progress));
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<DrillResult>();
  const [justLearned, setJustLearned] = useState(false);

  const trapHref = routeHref({ name: 'trap', id });
  const upcoming = nextChainStep(trap, progress);

  if (!step) {
    return (
      <div class="screen board-screen">
        <TrapHead trap={trap} />
        <div class="trap-body">
          <section class="panel">
            <p class="verdict verdict-ok">{t.chain.finished}</p>
            <a class="button button-primary" href={trapHref}>
              {t.learn.toTrap}
            </a>
          </section>
        </div>
      </div>
    );
  }

  const start = (next: ChainStep | undefined) => {
    setStep(next);
    setRun((current) => current + 1);
    setResult(undefined);
    setJustLearned(false);
  };

  const finish = (drill: DrillResult) => {
    setResult(drill);
    setJustLearned(
      step.kind === 'main' && step.depth === length && isClean(drill) && progress.learnedAt === null,
    );
    updateTrap(id, (current) => applyChainRun(current, step, length, drill, appNow()));
  };

  const skip = () => {
    const now = appNow();
    updateTrap(id, (current) => skipDeviation(current, step.key, now));
    // The store has the new progress already; this render still sees the old one.
    start(nextChainStep(trap, skipDeviation(progress, step.key, now)));
  };

  const clean = result !== undefined && isClean(result);
  const isMain = step.kind === 'main';
  const skipButton = !isMain && (
    <button type="button" class="button" onClick={skip}>
      {t.chain.skip}
    </button>
  );

  return (
    <div class="screen board-screen learn-screen">
      <TrapHead trap={trap}>
        <p class="trap-meta">
          {isMain ? fmt(t.chain.stepOf, { n: step.depth, total: length }) : t.chain.deviation}
        </p>
        <p class="trap-meta">
          {isMain && `${fmt(t.chain.movesLeft, { n: step.depth })} `}
          {stepHelp(trap, step)}
        </p>
      </TrapHead>

      <LineDrill
        key={run}
        trap={trap}
        line={step.line}
        startPly={step.startPly}
        followOtherLines
        doneStatus={t.chain.stepDone}
        onDone={finish}
        actions={skipButton}
      >
        <section class="panel" aria-live="polite">
          <p class={clean ? 'verdict verdict-ok' : 'verdict'}>
            {clean
              ? isMain
                ? t.chain.stepClean
                : t.chain.deviationClean
              : fmt(t.learn.stats, { errors: result?.errors ?? 0, hints: result?.hints ?? 0 })}
          </p>
          {!clean && <p>{isMain ? t.chain.stepRepeat : t.chain.deviationRepeat}</p>}
          {justLearned && <p>{t.chain.learned}</p>}
          <div class="panel-actions">
            {clean && upcoming && (
              <button type="button" class="button button-primary" onClick={() => start(upcoming)}>
                {t.chain.next}
              </button>
            )}
            {clean && !upcoming && (
              <a class="button button-primary" href={trapHref}>
                {t.learn.toTrap}
              </a>
            )}
            <button type="button" class={clean ? 'button' : 'button button-primary'} onClick={() => start(step)}>
              {t.chain.repeat}
            </button>
            {!clean && skipButton}
          </div>
          {clean && !upcoming && <p>{t.chain.finished}</p>}
          {result?.otherMateSan && <p>{fmt(t.learn.otherMate, { san: result.otherMateSan })}</p>}
          {result && !result.otherMateSan && (
            <>
              <p>{lineHelp(trap, result.line)}</p>
              <p class="line-result">{resultText(result.line.result)}</p>
            </>
          )}
        </section>
      </LineDrill>

      <div class="trap-body">
        <a class="button button-quiet" href={trapHref}>
          {t.learn.toTrap}
        </a>
      </div>
    </div>
  );
}
