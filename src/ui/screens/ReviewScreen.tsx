import { useState } from 'preact/hooks';
import { allTraps, getTrap } from '../../content/traps';
import { reviewLine } from '../../core/chain';
import {
  applyReview,
  dueReviews,
  gradeOf,
  isReviewDue,
  unlockedIds,
  type TrapProgress,
} from '../../core/progress';
import type { Grade } from '../../core/schedule';
import type { CompiledTrap } from '../../core/trap-model';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { appNow, updateTrap, type StoreState } from '../../storage/store';
import { LineDrill, type DrillResult } from '../drill/LineDrill';
import { TrapHead, trapOrder, useTrapAccess } from '../trap/access';
import { lineHelp, resultText, whenText } from '../trap/labels';
import { MissingTrap } from './TrapScreen';

/**
 * A spaced review of a learned trap: one line from move 1. The opponent follows the main
 * line or one of the deviations; the player does not know which.
 */
export function ReviewScreen({ id }: { id: string }) {
  const trap = getTrap(id);
  return trap ? <ReviewGate key={id} trap={trap} /> : <MissingTrap />;
}

function ReviewGate({ trap }: { trap: CompiledTrap }) {
  const { store, progress } = useTrapAccess(trap.file.id);
  // Decided once: after the review is saved the trap is no longer due, but the screen stays.
  const [due] = useState(() => isReviewDue(progress, appNow()));
  if (due) return <ReviewSession trap={trap} progress={progress} store={store} />;
  return (
    <div class="screen board-screen">
      <TrapHead trap={trap} />
      <div class="trap-body">
        <section class="panel">
          <p class="verdict">
            {progress.dueAt === null
              ? t.review.notLearned
              : fmt(t.review.notDue, { when: whenText(progress.dueAt, appNow()) })}
          </p>
          <a class="button button-primary" href={routeHref({ name: 'trap', id: trap.file.id })}>
            {t.learn.toTrap}
          </a>
        </section>
      </div>
    </div>
  );
}

interface Outcome {
  drill: DrillResult;
  grade: Grade;
  /** The trap became mastered by this review. */
  mastered: boolean;
  /** Title of the trap this review opened, if any. */
  opened: string | undefined;
}

function ReviewSession({
  trap,
  progress,
  store,
}: {
  trap: CompiledTrap;
  progress: TrapProgress;
  store: StoreState;
}) {
  const id = trap.file.id;
  const [line] = useState(() => reviewLine(trap, Math.random));
  const [outcome, setOutcome] = useState<Outcome>();

  const finish = (drill: DrillResult) => {
    const now = appNow();
    const grade = gradeOf(drill);
    const after = applyReview(progress, grade, now);
    const order = trapOrder();
    const before = unlockedIds(order, store.data.traps);
    const newlyOpen = [...unlockedIds(order, { ...store.data.traps, [id]: after })].find(
      (candidate) => !before.has(candidate),
    );
    setOutcome({
      drill,
      grade,
      mastered: progress.masteredAt === null && after.masteredAt !== null,
      opened: allTraps().find((file) => file.id === newlyOpen)?.title.ru,
    });
    updateTrap(id, (current) => applyReview(current, grade, now));
  };

  const now = appNow();
  const nextDue = dueReviews(trapOrder(), store.data.traps, now).find((other) => other !== id);

  return (
    <div class="screen board-screen learn-screen">
      <TrapHead trap={trap}>
        <p class="trap-meta">
          {t.review.title}. {t.review.intro}
        </p>
      </TrapHead>

      <LineDrill
        trap={trap}
        line={line}
        startPly={0}
        followOtherLines
        doneStatus={t.review.done}
        onDone={finish}
      >
        {outcome && (
          <section class="panel" aria-live="polite">
            <p class={outcome.grade === 'again' ? 'verdict' : 'verdict verdict-ok'}>
              {t.review.grade[outcome.grade]}
            </p>
            {outcome.mastered && <p>{t.review.mastered}</p>}
            {outcome.opened && <p>{fmt(t.review.unlocked, { title: outcome.opened })}</p>}
            {progress.dueAt !== null && (
              <p>{fmt(t.review.next, { when: whenText(progress.dueAt, now) })}</p>
            )}
            <div class="panel-actions">
              {nextDue ? (
                <a class="button button-primary" href={routeHref({ name: 'review', id: nextDue })}>
                  {t.review.more}
                </a>
              ) : (
                <a class="button button-primary" href={routeHref({ name: 'traps' })}>
                  {t.traps.toList}
                </a>
              )}
              <a class="button" href={routeHref({ name: 'trap', id })}>
                {t.learn.toTrap}
              </a>
            </div>
            {outcome.drill.otherMateSan ? (
              <p>{fmt(t.learn.otherMate, { san: outcome.drill.otherMateSan })}</p>
            ) : (
              <>
                <p>{lineHelp(trap, outcome.drill.line)}</p>
                <p class="line-result">{resultText(outcome.drill.line.result)}</p>
              </>
            )}
          </section>
        )}
      </LineDrill>
    </div>
  );
}
