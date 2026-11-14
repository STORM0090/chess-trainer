import { useMemo, useState } from 'preact/hooks';
import { TACTICS_LEVELS, TOP_LEVEL, type PuzzleEntry } from '../../../shared/puzzle-types.ts';
import { usePuzzles } from '../../content/puzzles';
import { isClean } from '../../core/progress';
import { compilePuzzle } from '../../core/puzzle-model';
import { levelFromTest, pickTestPuzzles, TEST_PER_LEVEL } from '../../core/tactics';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { recordPuzzle, recordTest } from '../../storage/store';
import { LineDrill, type DrillResult } from '../drill/LineDrill';
import { PoolNotice, PuzzleHead } from '../puzzle/PuzzleParts';

/** The entry test: ten puzzles, easiest first. Its result sets the starting level. */
export function PuzzleTestScreen() {
  const pool = usePuzzles();
  if (pool.state !== 'ready') return <PoolNotice pool={pool} />;
  return <TestSession puzzles={pool.puzzles} />;
}

function TestSession({ puzzles }: { puzzles: PuzzleEntry[] }) {
  /** Chosen when the player presses "start"; a new test gets new puzzles. */
  const [test, setTest] = useState<PuzzleEntry[]>();
  const [results, setResults] = useState<boolean[]>([]);
  const [last, setLast] = useState<DrillResult>();
  const [showResult, setShowResult] = useState(false);
  const puzzlesHref = routeHref({ name: 'puzzles' });

  const index = Math.min(results.length - (last ? 1 : 0), (test?.length ?? 1) - 1);
  const entry = test?.[index];
  const puzzle = useMemo(() => entry && compilePuzzle(entry), [entry]);

  if (!test || !entry || !puzzle) {
    return (
      <div class="screen list-screen">
        <h1 class="screen-title">{t.puzzles.test.title}</h1>
        <section class="panel">
          <p>{t.puzzles.test.intro}</p>
          <p class="hint-text">{t.puzzles.test.introLeave}</p>
          <div class="panel-actions">
            <button
              type="button"
              class="button button-primary"
              onClick={() => setTest(pickTestPuzzles(puzzles, Math.random))}
            >
              {t.puzzles.test.start}
            </button>
            <a class="button" href={puzzlesHref}>
              {t.puzzles.toThemes}
            </a>
          </div>
        </section>
      </div>
    );
  }

  if (showResult) {
    const level = levelFromTest(results);
    const band = TACTICS_LEVELS[level];
    return (
      <div class="screen list-screen">
        <h1 class="screen-title">{t.puzzles.test.doneTitle}</h1>
        <section class="panel" aria-live="polite">
          <p class="verdict verdict-ok">
            {band && fmt(t.puzzles.test.result, { n: level + 1, total: TOP_LEVEL + 1, min: band.min, max: band.max })}
          </p>
          <p>{fmt(t.puzzles.test.score, { n: results.filter(Boolean).length, total: results.length })}</p>
          <ul class="test-rows">
            {TACTICS_LEVELS.map((own, row) => {
              const mine = results.slice(row * TEST_PER_LEVEL, (row + 1) * TEST_PER_LEVEL);
              return (
                <li key={row}>
                  {fmt(t.puzzles.test.levelRow, {
                    n: row + 1,
                    min: own.min,
                    max: own.max,
                    solved: mine.filter(Boolean).length,
                    total: mine.length,
                  })}
                </li>
              );
            })}
          </ul>
          <p class="hint-text">{t.puzzles.test.resultHelp}</p>
          <a class="button button-primary" href={puzzlesHref}>
            {t.puzzles.test.toPuzzles}
          </a>
        </section>
      </div>
    );
  }

  const finish = (drill: DrillResult) => {
    const clean = isClean(drill);
    const all = [...results, clean];
    setLast(drill);
    setResults(all);
    recordPuzzle(entry.id, entry.rating, clean, false);
    // Saved with the last puzzle, not with the button: closing the app here loses nothing.
    if (all.length >= test.length) recordTest(all);
  };

  const isLast = index >= test.length - 1;
  const clean = last !== undefined && isClean(last);

  return (
    <div class="screen board-screen learn-screen" data-puzzle={entry.id}>
      <PuzzleHead title={fmt(t.puzzles.test.itemOf, { n: index + 1, total: test.length })} puzzle={puzzle}>
        <p class="trap-meta">{t.puzzles.test.goal}</p>
      </PuzzleHead>

      <LineDrill key={index} trap={puzzle} line={puzzle.line} startPly={0} doneStatus={t.puzzles.done} onDone={finish}>
        <section class="panel" aria-live="polite">
          <p class={clean ? 'verdict verdict-ok' : 'verdict'}>
            {clean
              ? t.puzzles.test.solved
              : fmt(t.puzzles.test.missed, { errors: last?.errors ?? 0, hints: last?.hints ?? 0 })}
          </p>
          <div class="panel-actions">
            <button
              type="button"
              class="button button-primary"
              onClick={() => {
                setLast(undefined);
                if (isLast) setShowResult(true);
              }}
            >
              {isLast ? t.puzzles.test.finish : t.puzzles.test.next}
            </button>
          </div>
          {last?.otherMateSan && <p>{fmt(t.learn.otherMate, { san: last.otherMateSan })}</p>}
        </section>
      </LineDrill>
    </div>
  );
}
