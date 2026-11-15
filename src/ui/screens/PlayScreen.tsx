import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Chess, type Square } from 'chess.js';
import { BOT_LEVELS, botLevel } from '../../../shared/bot/levels.ts';
import { chooseMove, paramsFor } from '../../../shared/bot/policy.ts';
import { getTrap } from '../../content/traps';
import { bookMoves, findMistakes, gameEnd, insideTrapLines, resultFor, type GameEnd, type Mistake } from '../../core/bot-game';
import { isPromotionMove, lastMoveSquares, legalDests, turnColor, type Dests, type PromotionPiece } from '../../core/chess-helpers';
import type { CompiledTrap } from '../../core/trap-model';
import { browserAnalyse, warmUpEngine } from '../../engine/bot-analyse';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { recordBotGame, updateSettings, useStore } from '../../storage/store';
import { Board, type BoardHint } from '../board/Board';
import { PromotionPicker } from '../board/PromotionPicker';
import { MissingTrap } from './TrapScreen';

type Side = 'white' | 'black';
const NO_DESTS: Dests = new Map();
/** The bot never answers faster than this: the player should see their own move land. */
const BOT_MIN_DELAY_MS = 650;
/** Nodes per position for the review after a game. */
const REVIEW_NODES = 20_000;

type EngineState = 'loading' | 'ready' | 'failed';

function useEngine(): [EngineState, () => void] {
  const [state, setState] = useState<EngineState>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setState('loading');
    warmUpEngine().then(
      () => alive && setState('ready'),
      () => alive && setState('failed'),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);
  return [state, () => setAttempt((current) => current + 1)];
}

function EngineNotice({ state, retry }: { state: EngineState; retry: () => void }) {
  if (state === 'ready') return null;
  return (
    <section class="panel" role="status">
      <p class={state === 'failed' ? 'verdict verdict-bad' : 'hint-text'}>
        {state === 'failed' ? t.play.engineFailed : t.play.engineLoading}
      </p>
      {state === 'failed' && (
        <button type="button" class="button" onClick={retry}>
          {t.play.retry}
        </button>
      )}
    </section>
  );
}

/** Choose a level and a side, then play. */
export function PlayScreen() {
  const { data } = useStore();
  const [engine, retry] = useEngine();
  const [level, setLevel] = useState(() => data.settings.botLevel);
  const [side, setSide] = useState<Side | 'random'>('white');
  const [game, setGame] = useState<{ side: Side; level: number; key: number }>();

  if (game) {
    return (
      <Game
        key={game.key}
        side={game.side}
        level={game.level}
        trap={undefined}
        onAgain={(next) => setGame({ ...game, level: next, key: game.key + 1 })}
      />
    );
  }

  const offered = data.settings.botLevel;
  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.play.title}</h1>
      <EngineNotice state={engine} retry={retry} />
      <section class="panel">
        <h2 class="panel-title">{t.play.levelTitle}</h2>
        <div class="stepper">
          <button type="button" class="button" disabled={level <= 1} onClick={() => setLevel(level - 1)} aria-label={t.play.levelDown}>
            −
          </button>
          <p class="stepper-value" aria-live="polite">
            {fmt(t.play.level, { n: level, total: BOT_LEVELS.length })}
          </p>
          <button
            type="button"
            class="button"
            disabled={level >= BOT_LEVELS.length}
            onClick={() => setLevel(level + 1)}
            aria-label={t.play.levelUp}
          >
            +
          </button>
        </div>
        <p class="hint-text">
          {level === offered ? t.play.levelOffered : fmt(t.play.levelOther, { n: offered })} {t.play.levelHelp}
        </p>
      </section>
      <section class="panel">
        <h2 class="panel-title">{t.play.sideTitle}</h2>
        <div class="choice" role="radiogroup" aria-label={t.play.sideTitle}>
          {(['white', 'black', 'random'] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={side === choice}
              class={`button${side === choice ? ' button-chosen' : ''}`}
              onClick={() => setSide(choice)}
            >
              {t.play.side[choice]}
            </button>
          ))}
        </div>
      </section>
      <ChecklistToggle />
      <button
        type="button"
        class="button button-primary"
        disabled={engine !== 'ready'}
        onClick={() =>
          setGame({ side: side === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : side, level, key: 1 })
        }
      >
        {t.play.start}
      </button>
      <p class="hint-text">{t.play.trapHint}</p>
    </div>
  );
}

function ChecklistToggle() {
  const { data } = useStore();
  const on = data.settings.shvuChecklist;
  return (
    <section class="panel">
      <label class="toggle">
        <input type="checkbox" checked={on} onChange={(event) => updateSettings({ shvuChecklist: event.currentTarget.checked })} />
        <span>{t.play.checklistToggle}</span>
      </label>
      <p class="hint-text">{t.play.checklistHelp}</p>
    </section>
  );
}

/** Practice of one trap: the bot opens along the lines of the trap, then plays by itself. */
export function PlayTrapScreen({ id }: { id: string }) {
  const trap = getTrap(id);
  const { data } = useStore();
  const [engine, retry] = useEngine();
  const [key, setKey] = useState(0);
  const [level, setLevel] = useState(() => data.settings.botLevel);
  if (!trap) return <MissingTrap />;
  if (engine !== 'ready' && key === 0) {
    return (
      <div class="screen list-screen">
        <h1 class="screen-title">{trap.file.title.ru}</h1>
        <EngineNotice state={engine} retry={retry} />
      </div>
    );
  }
  return (
    <Game
      key={key}
      side={trap.side}
      level={level}
      trap={trap}
      onAgain={(next) => {
        setLevel(next);
        setKey((current) => current + 1);
      }}
    />
  );
}

interface GameProps {
  side: Side;
  level: number;
  trap: CompiledTrap | undefined;
  /** Starts another game at the given level. */
  onAgain: (level: number) => void;
}

function Game({ side, level, trap, onAgain }: GameProps) {
  const { data } = useStore();
  const chessRef = useRef<Chess | undefined>(undefined);
  chessRef.current ??= new Chess();
  const chess = chessRef.current;
  const [, setRevision] = useState(0);
  const [syncKey, setSyncKey] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [resigned, setResigned] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square }>();
  /** The ply at which the player confirmed the checklist. */
  const [checkedAt, setCheckedAt] = useState(-1);
  /** Ply at which the game left the lines of the trap; undefined while inside them. */
  const [leftBookAt, setLeftBookAt] = useState<number>();
  const [botFailed, setBotFailed] = useState(false);
  const [recorded, setRecorded] = useState<{ result: 'win' | 'draw' | 'loss'; next: number }>();

  const refresh = () => setRevision((revision) => revision + 1);
  const history = chess.history();
  const ply = history.length;
  const end: GameEnd | undefined = resigned ? { kind: 'resign', winner: side === 'white' ? 'black' : 'white' } : gameEnd(chess);
  const playerToMove = !end && turnColor(chess) === side;
  const checklist = data.settings.shvuChecklist && playerToMove && checkedAt !== ply;
  const canMove = playerToMove && !thinking && !checklist && !pendingPromotion;

  // The bot's move.
  useEffect(() => {
    if (end || turnColor(chess) === side || botFailed) return;
    let alive = true;
    setThinking(true);
    const started = Date.now();
    const fen = chess.fen();
    (async () => {
      let uci: string | undefined;
      let san: string | undefined;
      const book = trap ? bookMoves(trap, chess.history()) : [];
      if (book.length > 0) {
        san = book[Math.min(Math.floor(Math.random() * book.length), book.length - 1)];
      } else {
        const choice = await chooseMove(fen, paramsFor(botLevel(level).strength), browserAnalyse, Math.random);
        uci = choice.uci;
      }
      const wait = BOT_MIN_DELAY_MS - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      if (!alive || chess.fen() !== fen) return;
      if (san) chess.move(san);
      else if (uci) chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (trap && leftBookAt === undefined && !insideTrapLines(trap, chess.history())) setLeftBookAt(chess.history().length);
      setThinking(false);
      setSyncKey((key) => key + 1);
      refresh();
    })().catch(() => {
      if (!alive) return;
      setThinking(false);
      setBotFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [ply, end === undefined, botFailed]);

  // The result is recorded once, when the game ends.
  useEffect(() => {
    if (!end || recorded) return;
    const result = resultFor(end, side);
    setRecorded({ result, next: recordBotGame(level, result) });
  }, [end === undefined]);

  const play = (from: Square, to: Square, promotion?: PromotionPiece) => {
    try {
      chess.move({ from, to, promotion });
    } catch {
      // The board offers only legal moves; if the two ever disagree, snap back.
    }
    if (trap && leftBookAt === undefined && !insideTrapLines(trap, chess.history())) setLeftBookAt(chess.history().length);
    setSyncKey((key) => key + 1);
    refresh();
  };

  const handleMove = (from: Square, to: Square) => {
    if (!canMove) return;
    if (isPromotionMove(chess, from, to)) setPendingPromotion({ from, to });
    else play(from, to);
  };

  const dests = useMemo(() => (canMove ? legalDests(chess) : NO_DESTS), [ply, canMove]);
  const status = end
    ? endText(end, side)
    : thinking
      ? t.play.botThinking
      : playerToMove
        ? chess.isCheck()
          ? t.play.yourMoveCheck
          : t.learn.yourMove
        : t.play.botThinking;

  return (
    <div class="screen board-screen learn-screen">
      <div class="trap-head">
        <h1 class="screen-title">{trap ? trap.file.title.ru : t.play.title}</h1>
        <p class="trap-meta">
          <span class={`side-dot side-dot-${side}`} aria-hidden="true" />
          {t.learn.playAs[side]}. {fmt(t.play.level, { n: level, total: BOT_LEVELS.length })}
        </p>
        {trap && (
          <p class="trap-meta">{leftBookAt === undefined ? t.play.inBook : fmt(t.play.leftBook, { n: Math.floor(leftBookAt / 2) + 1 })}</p>
        )}
      </div>
      <p class={`status${end ? ' status-done' : ''}`} role="status">
        {status}
      </p>
      <Board
        fen={chess.fen()}
        orientation={side}
        turnColor={turnColor(chess)}
        movableColor={canMove ? side : undefined}
        dests={dests}
        lastMove={lastMoveSquares(chess)}
        inCheck={chess.isCheck()}
        syncKey={syncKey}
        onMove={handleMove}
      />
      <GameMoves history={history} />
      <div class="trap-body">
        {botFailed && (
          <section class="panel">
            <p class="verdict verdict-bad">{t.play.botFailed}</p>
            <button type="button" class="button" onClick={() => setBotFailed(false)}>
              {t.play.retry}
            </button>
          </section>
        )}
        {checklist && (
          <section class="panel checklist" aria-live="polite">
            <h2 class="panel-title">{t.play.checklistTitle}</h2>
            <ol class="checklist-items">
              {t.play.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <button type="button" class="button button-primary" onClick={() => setCheckedAt(ply)}>
              {t.play.checklistDone}
            </button>
          </section>
        )}
        {!end && (
          <section class="panel">
            <button type="button" class="button button-quiet" onClick={() => setResigned(true)}>
              {t.play.resign}
            </button>
          </section>
        )}
        {end && recorded && (
          <AfterGame history={history} side={side} level={level} recorded={recorded} trap={trap} onAgain={onAgain} />
        )}
      </div>
      {pendingPromotion && (
        <PromotionPicker
          color={side}
          onPick={(piece) => {
            const { from, to } = pendingPromotion;
            setPendingPromotion(undefined);
            play(from, to, piece);
          }}
          onCancel={() => {
            setPendingPromotion(undefined);
            setSyncKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
}

function endText(end: GameEnd, side: Side): string {
  if (end.kind === 'draw') return t.play.end.draw[end.reason];
  if (end.kind === 'resign') return t.play.end.resigned;
  return end.winner === side ? t.play.end.youMate : t.play.end.botMate;
}

/** Moves of the game with numbers, wrapping onto several rows. */
function GameMoves({ history }: { history: string[] }) {
  if (history.length === 0) return <p class="movelist movelist-empty">{t.traps.startPosition}</p>;
  return (
    <ol class="movelist">
      {history.map((san, index) => (
        <li key={index} class="movelist-item">
          {index % 2 === 0 && <span class="move-number">{index / 2 + 1}.</span>}
          <span class={`move${index === history.length - 1 ? ' move-current' : ''}`}>{san}</span>
        </li>
      ))}
    </ol>
  );
}

function AfterGame({
  history,
  side,
  level,
  recorded,
  trap,
  onAgain,
}: {
  history: string[];
  side: Side;
  level: number;
  recorded: { result: 'win' | 'draw' | 'loss'; next: number };
  trap: CompiledTrap | undefined;
  onAgain: (level: number) => void;
}) {
  const [review, setReview] = useState<{ state: 'idle' | 'running' | 'done' | 'failed'; done: number; total: number; mistakes: Mistake[] }>({
    state: 'idle',
    done: 0,
    total: 0,
    mistakes: [],
  });
  const [shown, setShown] = useState(0);
  const playerMoves = Math.ceil((history.length - (side === 'white' ? 0 : 1)) / 2);

  const startReview = () => {
    setReview({ state: 'running', done: 0, total: playerMoves, mistakes: [] });
    findMistakes(history, side, browserAnalyse, REVIEW_NODES, 3, (done, total) =>
      setReview((current) => ({ ...current, done, total })),
    ).then(
      (mistakes) => setReview((current) => ({ ...current, state: 'done', mistakes })),
      () => setReview((current) => ({ ...current, state: 'failed' })),
    );
  };

  const mistake = review.mistakes[shown];
  const hint: BoardHint | undefined = useMemo(() => {
    if (!mistake) return undefined;
    const chess = new Chess(mistake.fen);
    try {
      const move = chess.move(mistake.best);
      return { kind: 'move', from: move.from, to: move.to };
    } catch {
      return undefined;
    }
  }, [mistake]);

  return (
    <section class="panel" aria-live="polite">
      <p class={recorded.result === 'win' ? 'verdict verdict-ok' : 'verdict'}>{t.play.result[recorded.result]}</p>
      <p>
        {recorded.next > level
          ? fmt(t.play.nextUp, { n: recorded.next })
          : recorded.next < level
            ? fmt(t.play.nextDown, { n: recorded.next })
            : fmt(t.play.nextSame, { n: recorded.next })}
      </p>
      <div class="panel-actions">
        <button type="button" class="button button-primary" onClick={() => onAgain(recorded.next)}>
          {t.play.again}
        </button>
        <a class="button" href={trap ? routeHref({ name: 'trap', id: trap.file.id }) : routeHref({ name: 'today' })}>
          {trap ? t.learn.toTrap : t.session.toToday}
        </a>
      </div>

      {playerMoves >= 3 && review.state === 'idle' && (
        <button type="button" class="button" onClick={startReview}>
          {t.play.reviewStart}
        </button>
      )}
      {review.state === 'running' && <p class="hint-text">{fmt(t.play.reviewRunning, { done: review.done, total: review.total })}</p>}
      {review.state === 'failed' && <p class="verdict verdict-bad">{t.play.reviewFailed}</p>}
      {review.state === 'done' && review.mistakes.length === 0 && <p>{t.play.reviewNone}</p>}
      {review.state === 'done' && mistake && (
        <div class="review">
          <h2 class="panel-title">{fmt(t.play.reviewTitle, { n: review.mistakes.length })}</h2>
          <div class="choice">
            {review.mistakes.map((item, index) => (
              <button
                key={item.ply}
                type="button"
                class={`button${index === shown ? ' button-chosen' : ''}`}
                onClick={() => setShown(index)}
              >
                {`${Math.floor(item.ply / 2) + 1}${item.ply % 2 === 0 ? '.' : '...'}${item.played}`}
              </button>
            ))}
          </div>
          <p>{fmt(t.play.reviewMistake, { played: mistake.played, best: mistake.best })}</p>
          <ReviewBoard fen={mistake.fen} side={side} hint={hint} />
          <p class="hint-text">{t.play.reviewSource}</p>
        </div>
      )}
    </section>
  );
}

function ReviewBoard({ fen, side, hint }: { fen: string; side: Side; hint: BoardHint | undefined }) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  return (
    <div class="review-board">
      <Board
        fen={fen}
        orientation={side}
        turnColor={turnColor(chess)}
        movableColor={undefined}
        dests={NO_DESTS}
        lastMove={undefined}
        inCheck={chess.isCheck()}
        syncKey={0}
        onMove={() => undefined}
        hint={hint}
      />
    </div>
  );
}

