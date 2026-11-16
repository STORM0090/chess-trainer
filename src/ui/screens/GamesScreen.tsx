import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  commonPlayers,
  mineGame,
  ownEntry,
  readGame,
  splitPgn,
  type OwnExercise,
  type ReadGame,
} from '../../core/own-games';
import { isClean } from '../../core/progress';
import { compilePuzzle } from '../../core/puzzle-model';
import { duePuzzleIds, isPuzzleDue } from '../../core/tactics';
import { browserAnalyse } from '../../engine/bot-analyse';
import { fmt, plural, t } from '../../i18n';
import { routeHref } from '../../router';
import { addOwnExercises, appNow, getStore, recordPuzzle, removeOwnExercises, useStore } from '../../storage/store';
import { LineDrill, type DrillResult } from '../drill/LineDrill';
import { PuzzleHead } from '../puzzle/PuzzleParts';
import { EngineNotice, useEngine } from './PlayScreen';

/** More games than this in one go would keep the phone busy for minutes. */
const MAX_GAMES = 20;

type Side = 'white' | 'black';
type Stage =
  | { step: 'input' }
  | { step: 'read'; games: ReadGame[]; skipped: number; names: string[] }
  | { step: 'running'; game: number; games: number; done: number; total: number }
  | { step: 'done'; added: number; known: number; games: number }
  | { step: 'failed' };

/** Import of the player's own games and the list of exercises made from them. */
export function GamesScreen() {
  const { data } = useStore();
  const [engine, retry] = useEngine();
  const [text, setText] = useState('');
  const [stage, setStage] = useState<Stage>({ step: 'input' });
  /** A name from the games, or a colour when no name plays in all of them. */
  const [who, setWho] = useState<string>('white');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const now = appNow();
  const exercises = Object.values(data.own);
  const due = duePuzzleIds(data.puzzles, now).filter((id) => data.own[id] !== undefined).length;

  const read = (source: string) => {
    const parts = splitPgn(source);
    const games = parts.map(readGame).filter((game): game is ReadGame => game !== undefined);
    const names = commonPlayers(games);
    setWho(names[0] ?? 'white');
    setStage({ step: 'read', games: games.slice(0, MAX_GAMES), skipped: parts.length - games.length, names });
  };

  const run = async (games: ReadGame[], names: string[]) => {
    const found: OwnExercise[] = [];
    try {
      for (let index = 0; index < games.length; index++) {
        const game = games[index];
        if (!game) continue;
        const side: Side = names.length > 0 ? (game.white === who ? 'white' : 'black') : (who as Side);
        setStage({ step: 'running', game: index + 1, games: games.length, done: 0, total: 0 });
        found.push(
          ...(await mineGame(
            game.moves,
            side,
            browserAnalyse,
            appNow(),
            undefined,
            (done, total) => setStage({ step: 'running', game: index + 1, games: games.length, done, total }),
            () => alive.current,
          )),
        );
      }
      const unique = new Set(found.map((exercise) => exercise.id)).size;
      const added = addOwnExercises(found);
      // The text with the names is not needed any more.
      setText('');
      setStage({ step: 'done', added, known: unique - added, games: games.length });
    } catch {
      if (alive.current) setStage({ step: 'failed' });
    }
  };

  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.games.screenTitle}</h1>
      <p class="hint">{t.games.intro}</p>

      <section class="panel">
        <h2 class="panel-title">{t.games.listTitle}</h2>
        <p>
          {exercises.length === 0
            ? t.games.listEmpty
            : fmt(t.games.listCount, { n: exercises.length, exercises: plural(exercises.length, t.plural.exercise), due })}
        </p>
        {exercises.length > 0 && (
          <div class="panel-actions">
            <a class="button button-primary" href={routeHref({ name: 'gamesPractice' })}>
              {t.games.practise}
            </a>
            {confirmClear ? (
              <>
                <button
                  type="button"
                  class="button"
                  onClick={() => {
                    removeOwnExercises(exercises.map((exercise) => exercise.id));
                    setConfirmClear(false);
                  }}
                >
                  {t.games.clearYes}
                </button>
                <button type="button" class="button" onClick={() => setConfirmClear(false)}>
                  {t.progress.knownNo}
                </button>
              </>
            ) : (
              <button type="button" class="button button-quiet" onClick={() => setConfirmClear(true)}>
                {t.games.clear}
              </button>
            )}
          </div>
        )}
      </section>

      <section class="panel">
        <h2 class="panel-title">{t.games.importTitle}</h2>
        <EngineNotice state={engine} retry={retry} />
        {(stage.step === 'input' || stage.step === 'done' || stage.step === 'failed') && (
          <>
            <p class="hint-text">{t.games.importHelp}</p>
            <textarea
              class="pgn-input"
              rows={6}
              value={text}
              placeholder={t.games.placeholder}
              aria-label={t.games.importTitle}
              onInput={(event) => setText(event.currentTarget.value)}
            />
            <input
              ref={fileInput}
              class="visually-hidden"
              type="file"
              aria-label={t.games.chooseFile}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void file.text().then(read);
                event.currentTarget.value = '';
              }}
            />
            <div class="panel-actions">
              <button type="button" class="button button-primary" disabled={text.trim() === ''} onClick={() => read(text)}>
                {t.games.read}
              </button>
              <button type="button" class="button" onClick={() => fileInput.current?.click()}>
                {t.games.chooseFile}
              </button>
            </div>
          </>
        )}
        <div aria-live="polite">
          {stage.step === 'read' && stage.games.length === 0 && (
            <>
              <p class="verdict verdict-bad">{t.games.noGames}</p>
              <button type="button" class="button" onClick={() => setStage({ step: 'input' })}>
                {t.games.back}
              </button>
            </>
          )}
          {stage.step === 'read' && stage.games.length > 0 && (
            <>
              <p>
                {fmt(t.games.readCount, { n: stage.games.length })}{' '}
                {stage.skipped > 0 && fmt(t.games.skipped, { n: stage.skipped })}
              </p>
              <p class="hint-text">{stage.names.length > 0 ? t.games.whoName : t.games.whoColour}</p>
              <div class="choice" role="radiogroup" aria-label={t.games.who}>
                {(stage.names.length > 0 ? stage.names : ['white', 'black']).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={who === option}
                    class={`button${who === option ? ' button-chosen' : ''}`}
                    onClick={() => setWho(option)}
                  >
                    {stage.names.length > 0 ? option : t.play.side[option as Side]}
                  </button>
                ))}
              </div>
              <div class="panel-actions">
                <button
                  type="button"
                  class="button button-primary"
                  disabled={engine !== 'ready'}
                  onClick={() => void run(stage.games, stage.names)}
                >
                  {t.games.find}
                </button>
                <button type="button" class="button" onClick={() => setStage({ step: 'input' })}>
                  {t.games.back}
                </button>
              </div>
            </>
          )}
          {stage.step === 'running' && (
            <p>
              {fmt(t.games.running, { game: stage.game, games: stage.games, done: stage.done, total: stage.total })}
            </p>
          )}
          {stage.step === 'done' && (
            <p class="verdict verdict-ok">
              {fmt(t.games.done, { games: stage.games, added: stage.added })}{' '}
              {stage.known > 0 && fmt(t.games.known, { n: stage.known })}
            </p>
          )}
          {stage.step === 'failed' && <p class="verdict verdict-bad">{t.games.failed}</p>}
        </div>
      </section>

      <p class="hint-text">{t.games.privacy}</p>
      <a class="button button-quiet" href={routeHref({ name: 'more' })}>
        {t.more.back}
      </a>
    </div>
  );
}

/** The next exercise to show: one that is due (the longest waiting first), else the one tried longest ago. */
function chooseOwn(exclude?: string): OwnExercise | undefined {
  const { data } = getStore();
  const now = appNow();
  const all = Object.values(data.own).filter((exercise) => exercise.id !== exclude);
  const dueId = duePuzzleIds(data.puzzles, now).find((id) => data.own[id] !== undefined && id !== exclude);
  if (dueId !== undefined) return data.own[dueId];
  return [...all].sort((a, b) => (data.puzzles[a.id]?.lastAt ?? 0) - (data.puzzles[b.id]?.lastAt ?? 0))[0];
}

/** Practice of the exercises from own games, one after another. */
export function GamesPracticeScreen() {
  const [exercise, setExercise] = useState(() => chooseOwn());
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<DrillResult>();
  const [wasDue, setWasDue] = useState(false);
  const puzzle = useMemo(() => exercise && compilePuzzle(ownEntry(exercise)), [exercise]);
  const listHref = routeHref({ name: 'games' });

  if (!exercise || !puzzle) {
    return (
      <div class="screen list-screen">
        <h1 class="screen-title">{t.games.screenTitle}</h1>
        <p class="hint">{t.games.listEmpty}</p>
        <a class="button button-primary" href={listHref}>
          {t.games.toList}
        </a>
      </div>
    );
  }

  const finish = (drill: DrillResult) => {
    setWasDue(isPuzzleDue(getStore().data.puzzles[exercise.id], appNow()));
    setResult(drill);
    recordPuzzle(exercise.id, 0, drill, false);
  };
  const next = (remove = false) => {
    const upcoming = chooseOwn(exercise.id);
    if (remove) removeOwnExercises([exercise.id]);
    setExercise(upcoming);
    setRun((current) => current + 1);
    setResult(undefined);
  };
  const clean = result !== undefined && isClean(result);

  return (
    <div class="screen board-screen learn-screen" data-puzzle={exercise.id}>
      <PuzzleHead title={t.games.practiceTitle} puzzle={puzzle}>
        <p class="trap-meta">{t.puzzles.test.goal}</p>
      </PuzzleHead>
      <LineDrill key={run} trap={puzzle} line={puzzle.line} startPly={0} doneStatus={t.puzzles.done} onDone={finish}>
        <section class="panel" aria-live="polite">
          <p class={clean ? 'verdict verdict-ok' : 'verdict'}>
            {clean ? t.puzzles.clean : fmt(t.learn.stats, { errors: result?.errors ?? 0, hints: result?.hints ?? 0 })}
          </p>
          <p>{fmt(t.games.played, { san: exercise.played })}</p>
          {!wasDue && <p class="hint-text">{t.games.notDue}</p>}
          <div class="panel-actions">
            <button type="button" class="button button-primary" onClick={() => next()}>
              {t.puzzles.next}
            </button>
            <a class="button" href={listHref}>
              {t.games.toList}
            </a>
          </div>
          <button type="button" class="button button-quiet" onClick={() => next(true)}>
            {t.games.remove}
          </button>
          <p class="hint-text">{t.games.source}</p>
        </section>
      </LineDrill>
    </div>
  );
}
