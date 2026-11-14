import { useMemo, useState } from 'preact/hooks';
import type { PuzzleEntry, PuzzleTheme } from '../../../shared/puzzle-types.ts';
import { usePuzzles } from '../../content/puzzles';
import { isClean } from '../../core/progress';
import { compilePuzzle } from '../../core/puzzle-model';
import { currentLevel, nextPuzzle } from '../../core/tactics';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { appNow, getStore, recordPuzzle } from '../../storage/store';
import { LineDrill, type DrillResult } from '../drill/LineDrill';
import { PoolNotice, PuzzleHead } from '../puzzle/PuzzleParts';

/** Puzzles of one theme, one after another, from the player's rating band. */
export function PuzzleThemeScreen({ theme }: { theme: PuzzleTheme }) {
  const pool = usePuzzles();
  if (pool.state !== 'ready') return <PoolNotice pool={pool} />;
  return <ThemeSession key={theme} theme={theme} puzzles={pool.puzzles} />;
}

/** Reads the store at the moment of the call: the choice must see the puzzle just solved. */
function choose(puzzles: PuzzleEntry[], theme: PuzzleTheme, exclude?: string): PuzzleEntry | undefined {
  const { data } = getStore();
  return nextPuzzle(puzzles, theme, currentLevel(data.tactics), data.puzzles, appNow(), Math.random, exclude);
}

function ThemeSession({ theme, puzzles }: { theme: PuzzleTheme; puzzles: PuzzleEntry[] }) {
  const [entry, setEntry] = useState(() => choose(puzzles, theme));
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<DrillResult>();
  /** The level this puzzle took the player to, as shown to the player (from 1). */
  const [levelUp, setLevelUp] = useState<number>();
  const puzzle = useMemo(() => entry && compilePuzzle(entry), [entry]);
  const themesHref = routeHref({ name: 'puzzles' });

  if (!entry || !puzzle) {
    return (
      <div class="screen list-screen">
        <h1 class="screen-title">{t.puzzles.theme[theme]}</h1>
        <p class="hint">{t.puzzles.empty}</p>
        <a class="button button-primary" href={themesHref}>
          {t.puzzles.toThemes}
        </a>
      </div>
    );
  }

  const finish = (drill: DrillResult) => {
    setResult(drill);
    if (recordPuzzle(entry.id, entry.rating, drill, true)) {
      setLevelUp(currentLevel(getStore().data.tactics) + 1);
    }
  };

  const next = () => {
    setEntry(choose(puzzles, theme, entry.id));
    setRun((current) => current + 1);
    setResult(undefined);
    setLevelUp(undefined);
  };

  const clean = result !== undefined && isClean(result);

  return (
    <div class="screen board-screen learn-screen" data-puzzle={entry.id}>
      <PuzzleHead title={t.puzzles.theme[theme]} puzzle={puzzle}>
        <p class="trap-meta">
          {t.puzzles.themeHelp[theme]} {fmt(t.puzzles.rating, { rating: entry.rating })}
        </p>
      </PuzzleHead>

      <LineDrill key={run} trap={puzzle} line={puzzle.line} startPly={0} doneStatus={t.puzzles.done} onDone={finish}>
        <section class="panel" aria-live="polite">
          <p class={clean ? 'verdict verdict-ok' : 'verdict'}>
            {clean
              ? t.puzzles.clean
              : fmt(t.puzzles.notClean, { errors: result?.errors ?? 0, hints: result?.hints ?? 0 })}
          </p>
          {levelUp !== undefined && <p class="verdict verdict-ok">{fmt(t.puzzles.levelUp, { n: levelUp })}</p>}
          <div class="panel-actions">
            <button type="button" class="button button-primary" onClick={next}>
              {t.puzzles.next}
            </button>
            <a class="button" href={themesHref}>
              {t.puzzles.toThemes}
            </a>
          </div>
          {result?.otherMateSan && <p>{fmt(t.learn.otherMate, { san: result.otherMateSan })}</p>}
          <p class="hint-text">{fmt(t.puzzles.source, { id: entry.id })}</p>
        </section>
      </LineDrill>

      <div class="trap-body">
        <a class="button button-quiet" href={themesHref}>
          {t.puzzles.toThemes}
        </a>
      </div>
    </div>
  );
}
