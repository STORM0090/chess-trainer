import { useMemo, useState } from 'preact/hooks';
import type { PuzzleEntry } from '../../../shared/puzzle-types.ts';
import { usePuzzles } from '../../content/puzzles';
import { getTrap } from '../../content/traps';
import { chainLength, nextChainStep, reviewLine } from '../../core/chain';
import { sessionProgress, streakState, type SessionItem } from '../../core/daily';
import { dayKey, type DayKey } from '../../core/days';
import { emptyProgress, gradeOf, isClean } from '../../core/progress';
import { compilePuzzle } from '../../core/puzzle-model';
import type { Grade } from '../../core/schedule';
import { currentLevel } from '../../core/tactics';
import type { CompiledTrap } from '../../core/trap-model';
import { fmt, plural, t } from '../../i18n';
import { routeHref } from '../../router';
import {
  appNow,
  finishSessionItem,
  getStore,
  recordChainRun,
  recordPuzzle,
  recordReview,
  startSession,
  today,
  useStore,
} from '../../storage/store';
import { LineDrill, type DrillResult } from '../drill/LineDrill';
import { PoolNotice, PuzzleHead } from '../puzzle/PuzzleParts';
import { buildSessionPlan, isPlayable } from '../session/plan';
import { TrapHead } from '../trap/access';
import { LineNotes } from '../trap/LineNotes';

/** The daily session: today's short list of exercises, one after another. */
export function SessionScreen() {
  const pool = usePuzzles();
  if (pool.state !== 'ready') return <PoolNotice pool={pool} />;
  return <Session puzzles={pool.puzzles} />;
}

/**
 * The first item from `from` that can be played. Items that cannot (already done outside
 * the session) are marked as finished on the way, so the session can end.
 */
function nextPlayable(date: DayKey, from: number, puzzles: PuzzleEntry[]): number {
  const now = appNow();
  let index = from;
  for (;;) {
    const { data } = getStore();
    const item = data.days[date]?.session?.[index];
    if (!item) return index;
    if (isPlayable(item, data, puzzles, now)) return index;
    if (!item.done) finishSessionItem(date, index, false);
    index++;
  }
}

function Session({ puzzles }: { puzzles: PuzzleEntry[] }) {
  // The plan is made on the first visit of the day and stays the same after that. The date
  // is fixed for this visit: a session that runs past midnight still finishes its own plan.
  const [date] = useState(() => {
    const now = appNow();
    const { data } = getStore();
    return startSession(buildSessionPlan(data, today(now), puzzles, now)).date;
  });
  const [index, setIndex] = useState(() => nextPlayable(date, 0, puzzles));
  const { data } = useStore();
  const items = data.days[date]?.session ?? [];
  const item = items[index];
  const position = fmt(t.session.itemOf, { n: Math.min(index + 1, items.length), total: items.length });
  const isLast = nextIndexAfter(items, index) >= items.length;

  const done = (clean: boolean) => finishSessionItem(date, index, clean);
  const next = () => setIndex(nextPlayable(date, index + 1, puzzles));
  const nextLabel = isLast ? t.session.finish : t.session.next;

  if (!item) return <SessionSummary date={date} />;

  const entry = item.kind === 'puzzle' ? puzzles.find((puzzle) => puzzle.id === item.id) : undefined;
  const trap = item.kind === 'puzzle' ? undefined : getTrap(item.id);

  return (
    <>
      <ol class="session-dots" aria-label={position}>
        {items.map((other, at) => (
          <li
            key={at}
            class={`session-dot${other.done ? (other.clean ? ' session-dot-clean' : ' session-dot-done') : ''}${
              at === index ? ' session-dot-current' : ''
            }`}
          />
        ))}
      </ol>
      {item.kind === 'puzzle' && entry && (
        <PuzzleItem key={index} entry={entry} role={item.role} position={position} onDone={done} onNext={next} nextLabel={nextLabel} />
      )}
      {item.kind === 'trapReview' && trap && (
        <TrapReviewItem key={index} trap={trap} position={position} onDone={done} onNext={next} nextLabel={nextLabel} />
      )}
      {item.kind === 'trapStep' && trap && (
        <TrapStepItem key={index} trap={trap} position={position} onDone={done} onNext={next} nextLabel={nextLabel} />
      )}
    </>
  );
}

/** Index of the next item that is not finished, after `index`. */
function nextIndexAfter(items: SessionItem[], index: number): number {
  for (let at = index + 1; at < items.length; at++) if (!items[at]?.done) return at;
  return items.length;
}

interface ItemProps {
  /** "Сессия: 2 из 6". */
  position: string;
  /** Called once, when the exercise is finished: the item is then counted as done. */
  onDone: (clean: boolean) => void;
  onNext: () => void;
  nextLabel: string;
}

function NextButton({ onNext, nextLabel }: Pick<ItemProps, 'onNext' | 'nextLabel'>) {
  return (
    <button type="button" class="button button-primary" onClick={onNext}>
      {nextLabel}
    </button>
  );
}

function PuzzleItem({
  entry,
  role,
  position,
  onDone,
  onNext,
  nextLabel,
}: ItemProps & { entry: PuzzleEntry; role: 'warmup' | 'new' | 'review' }) {
  const puzzle = useMemo(() => compilePuzzle(entry), [entry]);
  const [result, setResult] = useState<DrillResult>();
  const [levelUp, setLevelUp] = useState<number>();
  const clean = result !== undefined && isClean(result);

  const finish = (drill: DrillResult) => {
    setResult(drill);
    if (recordPuzzle(entry.id, entry.rating, drill, true)) setLevelUp(currentLevel(getStore().data.tactics) + 1);
    onDone(isClean(drill));
  };

  return (
    <div class="screen board-screen learn-screen" data-puzzle={entry.id}>
      {/* The theme is not named in a mixed session: it would be half of the answer. */}
      <PuzzleHead title={position} puzzle={puzzle}>
        <p class="trap-meta">
          {t.session.role[role]} {t.puzzles.test.goal}
        </p>
      </PuzzleHead>
      <LineDrill trap={puzzle} line={puzzle.line} startPly={0} doneStatus={t.puzzles.done} onDone={finish}>
        <section class="panel" aria-live="polite">
          <p class={clean ? 'verdict verdict-ok' : 'verdict'}>
            {clean
              ? t.puzzles.clean
              : fmt(t.puzzles.notClean, { errors: result?.errors ?? 0, hints: result?.hints ?? 0 })}
          </p>
          {levelUp !== undefined && <p class="verdict verdict-ok">{fmt(t.puzzles.levelUp, { n: levelUp })}</p>}
          <div class="panel-actions">
            <NextButton onNext={onNext} nextLabel={nextLabel} />
          </div>
          {result?.otherMateSan && <p>{fmt(t.learn.otherMate, { san: result.otherMateSan })}</p>}
        </section>
      </LineDrill>
    </div>
  );
}

function TrapReviewItem({ trap, position, onDone, onNext, nextLabel }: ItemProps & { trap: CompiledTrap }) {
  const id = trap.file.id;
  const [line] = useState(() => reviewLine(trap, Math.random));
  const [outcome, setOutcome] = useState<{ drill: DrillResult; grade: Grade; mastered: boolean }>();

  const finish = (drill: DrillResult) => {
    const grade = gradeOf(drill);
    const before = getStore().data.traps[id];
    recordReview(id, grade);
    const after = getStore().data.traps[id];
    setOutcome({ drill, grade, mastered: (before?.masteredAt ?? null) === null && (after?.masteredAt ?? null) !== null });
    onDone(grade === 'good');
  };

  return (
    <div class="screen board-screen learn-screen">
      <TrapHead trap={trap}>
        <p class="trap-meta">
          {position}. {t.review.title}. {t.review.intro}
        </p>
      </TrapHead>
      <LineDrill trap={trap} line={line} startPly={0} followOtherLines doneStatus={t.review.done} onDone={finish}>
        {outcome && (
          <section class="panel" aria-live="polite">
            <p class={outcome.grade === 'again' ? 'verdict' : 'verdict verdict-ok'}>{t.review.grade[outcome.grade]}</p>
            {outcome.mastered && <p>{t.review.mastered}</p>}
            <div class="panel-actions">
              <NextButton onNext={onNext} nextLabel={nextLabel} />
            </div>
            {outcome.drill.otherMateSan ? (
              <p>{fmt(t.learn.otherMate, { san: outcome.drill.otherMateSan })}</p>
            ) : (
              <LineNotes trap={trap} line={outcome.drill.line} />
            )}
          </section>
        )}
      </LineDrill>
    </div>
  );
}

function TrapStepItem({ trap, position, onDone, onNext, nextLabel }: ItemProps & { trap: CompiledTrap }) {
  const id = trap.file.id;
  const length = chainLength(trap);
  // The step of this item stays the same while the saved progress moves on under it.
  const [step] = useState(() => nextChainStep(trap, getStore().data.traps[id] ?? emptyProgress(id)));
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<DrillResult>();
  const [learned, setLearned] = useState(false);
  if (!step) return null;
  const clean = result !== undefined && isClean(result);
  const isMain = step.kind === 'main';

  const finish = (drill: DrillResult) => {
    const before = getStore().data.traps[id];
    recordChainRun(id, step, length, drill);
    const after = getStore().data.traps[id];
    setLearned((before?.learnedAt ?? null) === null && (after?.learnedAt ?? null) !== null);
    setResult(drill);
    onDone(isClean(drill));
  };

  return (
    <div class="screen board-screen learn-screen">
      <TrapHead trap={trap}>
        <p class="trap-meta">
          {position}. {isMain ? fmt(t.chain.stepOf, { n: step.depth, total: length }) : t.chain.deviation}
        </p>
        <p class="trap-meta">{isMain ? fmt(t.chain.movesLeft, { n: step.depth }) : t.chain.deviationHelp}</p>
      </TrapHead>
      <LineDrill
        key={run}
        trap={trap}
        line={step.line}
        startPly={step.startPly}
        followOtherLines
        doneStatus={t.chain.stepDone}
        onDone={finish}
      >
        <section class="panel" aria-live="polite">
          <p class={clean ? 'verdict verdict-ok' : 'verdict'}>
            {clean
              ? isMain
                ? t.chain.stepClean
                : t.chain.deviationClean
              : fmt(t.learn.stats, { errors: result?.errors ?? 0, hints: result?.hints ?? 0 })}
          </p>
          {!clean && <p>{t.session.stepRepeat}</p>}
          {learned && <p>{t.chain.learned}</p>}
          <div class="panel-actions">
            {clean ? (
              <NextButton onNext={onNext} nextLabel={nextLabel} />
            ) : (
              <>
                <button
                  type="button"
                  class="button button-primary"
                  onClick={() => {
                    setRun((current) => current + 1);
                    setResult(undefined);
                  }}
                >
                  {t.chain.repeat}
                </button>
                <button type="button" class="button" onClick={onNext}>
                  {nextLabel}
                </button>
              </>
            )}
          </div>
          {result?.otherMateSan && <p>{fmt(t.learn.otherMate, { san: result.otherMateSan })}</p>}
          {result && !result.otherMateSan && <LineNotes trap={trap} line={result.line} />}
        </section>
      </LineDrill>
    </div>
  );
}

function SessionSummary({ date }: { date: DayKey }) {
  const { data } = useStore();
  const day = data.days[date];
  const now = appNow();
  const streak = streakState(data.days, dayKey(now));
  const progress = sessionProgress(day?.session ?? null);
  const cleanItems = day?.session?.filter((item) => item.clean).length ?? 0;
  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.session.doneTitle}</h1>
      <section class="panel today" aria-live="polite">
        <p class="verdict verdict-ok">
          {fmt(t.session.doneCount, { n: progress.total, clean: cleanItems })}
        </p>
        <p>
          {fmt(t.today.totalDays, { n: streak.totalDays })}{' '}
          {streak.current > 1 &&
            fmt(t.today.streak, { n: streak.current, days: plural(streak.current, t.plural.day) })}
        </p>
        <p class="hint-text">{t.session.doneHelp}</p>
        <a class="button button-primary" href={routeHref({ name: 'today' })}>
          {t.session.toToday}
        </a>
        <a class="button" href={routeHref({ name: 'puzzles' })}>
          {t.session.morePuzzles}
        </a>
      </section>
    </div>
  );
}
