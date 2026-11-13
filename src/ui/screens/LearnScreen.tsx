import { useEffect, useMemo, useState } from 'preact/hooks';
import { Chess, type Square } from 'chess.js';
import {
  isPromotionMove,
  legalDests,
  turnColor,
  type Dests,
  type PromotionPiece,
} from '../../core/chess-helpers';
import { getTrap } from '../../content/traps';
import {
  hintLevelForErrors,
  judgeMove,
  learnQueue,
  MAX_HINT_LEVEL,
  type HintLevel,
  type PlayerMove,
  type Verdict,
} from '../../core/learn';
import { fenAtPly, type CompiledTrap } from '../../core/trap-model';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { Board, type BoardHint } from '../board/Board';
import { PromotionPicker } from '../board/PromotionPicker';
import { MoveList } from '../trap/MoveList';
import { lineHelp, lineTitle, numberedSan, resultText } from '../trap/labels';
import { MissingTrap } from './TrapScreen';

const NO_DESTS: Dests = new Map();
/** Pause before the opponent's move, so the player sees their own move land first. */
const OPPONENT_DELAY_MS = 650;

interface Progress {
  /** Index in the practice queue. */
  item: number;
  /** Moves of the line already on the board. */
  ply: number;
  /** Wrong moves in the current position. */
  errors: number;
  hintLevel: HintLevel;
  /** Totals for the current line. */
  lineErrors: number;
  lineHints: number;
  /** What the app says about the player's last move. */
  verdict: Verdict | undefined;
  /** Set when the player ended the line with a mate that is not the move of the line. */
  otherMate: { fen: string; from: Square; to: Square } | undefined;
}

function startOf(item: number, ply: number): Progress {
  return {
    item,
    ply,
    errors: 0,
    hintLevel: 0,
    lineErrors: 0,
    lineHints: 0,
    verdict: undefined,
    otherMate: undefined,
  };
}

function verdictText(verdict: Verdict | undefined): string {
  switch (verdict?.kind) {
    case undefined:
      return '';
    case 'correct':
      return t.learn.correct;
    case 'wrong':
      return t.learn.wrong;
    case 'otherLine':
      return t.learn.otherLine;
    case 'otherMate':
      return fmt(t.learn.otherMate, { san: verdict.san });
    case 'knownMistake': {
      const { reply, result } = verdict.mistake;
      const first = reply
        ? fmt(t.learn.knownMistake, { reply: numberedSan(reply) })
        : t.learn.knownMistakeNoReply;
      return `${first} ${resultText(result)}`.trim();
    }
  }
}

/** Learn mode: the player makes the moves of their side, the app answers for the opponent. */
export function LearnScreen({ id }: { id: string }) {
  const trap = getTrap(id);
  return trap ? <LearnSession key={id} trap={trap} /> : <MissingTrap />;
}

function LearnSession({ trap }: { trap: CompiledTrap }) {
  const queue = useMemo(() => learnQueue(trap), [trap]);
  const [progress, setProgress] = useState<Progress>(() => startOf(0, queue[0]?.startPly ?? 0));
  const [syncKey, setSyncKey] = useState(0);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square }>();

  // The queue always holds the main line, so the fallback is never used.
  const item = queue[progress.item] ?? queue[0]!;
  const line = item.line;
  const step = line.steps[progress.ply];
  const done = progress.otherMate !== undefined || step === undefined;
  const playerToMove = !done && step.mover === trap.side;
  const opponentToMove = !done && step.mover !== trap.side;

  useEffect(() => {
    if (!opponentToMove) return;
    const timer = setTimeout(() => {
      setProgress((current) => ({ ...current, ply: current.ply + 1 }));
    }, OPPONENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [opponentToMove, progress.ply, progress.item]);

  const fen = progress.otherMate?.fen ?? fenAtPly(line, progress.ply);
  const chess = useMemo(() => new Chess(fen), [fen]);
  const dests = useMemo(() => (playerToMove ? legalDests(chess) : NO_DESTS), [chess, playerToMove]);
  const last = progress.ply > 0 ? line.steps[progress.ply - 1] : undefined;
  const lastMove: [Square, Square] | undefined = progress.otherMate
    ? [progress.otherMate.from, progress.otherMate.to]
    : last
      ? [last.from, last.to]
      : undefined;

  const attempt = (move: PlayerMove) => {
    const verdict = judgeMove(trap, line, progress.ply, move);
    // The board already shows the player's move; put it back to the app's position.
    setSyncKey((key) => key + 1);
    setProgress((current) => {
      switch (verdict.kind) {
        case 'correct':
          return { ...current, ply: current.ply + 1, errors: 0, hintLevel: 0, verdict };
        case 'otherMate':
          return { ...current, verdict, otherMate: { fen: verdict.fen, from: move.from, to: move.to } };
        case 'otherLine':
          return { ...current, verdict };
        case 'knownMistake':
        case 'wrong': {
          const errors = current.errors + 1;
          const earned = hintLevelForErrors(errors);
          return {
            ...current,
            errors,
            lineErrors: current.lineErrors + 1,
            hintLevel: earned > current.hintLevel ? earned : current.hintLevel,
            verdict,
          };
        }
      }
    });
  };

  const handleMove = (from: Square, to: Square) => {
    if (!playerToMove) return;
    if (isPromotionMove(chess, from, to)) setPendingPromotion({ from, to });
    else attempt({ from, to, promotion: undefined });
  };

  const askHint = () => {
    setProgress((current) =>
      current.hintLevel >= MAX_HINT_LEVEL
        ? current
        : {
            ...current,
            hintLevel: (current.hintLevel + 1) as HintLevel,
            lineHints: current.lineHints + 1,
            verdict: undefined,
          },
    );
  };

  const goToItem = (index: number) => {
    const next = queue[index];
    if (!next) return;
    setPendingPromotion(undefined);
    setSyncKey((key) => key + 1);
    setProgress(startOf(index, next.startPly));
  };

  let hint: BoardHint | undefined;
  let hintText = '';
  if (playerToMove && progress.hintLevel >= 1) {
    hintText = t.learn.hintKind[step.kind];
    if (progress.hintLevel === 2) {
      hint = { kind: 'piece', square: step.from };
      hintText = t.learn.hintPiece;
    } else if (progress.hintLevel === 3) {
      hint = { kind: 'move', from: step.from, to: step.to };
      hintText = t.learn.hintArrow;
    }
  }

  const status = done
    ? progress.item === queue.length - 1
      ? t.learn.allDone
      : t.learn.lineDone
    : playerToMove
      ? t.learn.yourMove
      : t.learn.opponentMoves;
  const remaining = queue.length - 1 - progress.item;
  const clean = progress.lineErrors === 0 && progress.lineHints === 0;
  const trapHref = routeHref({ name: 'trap', id: trap.file.id });

  return (
    <div class="screen board-screen learn-screen">
      <div class="trap-head">
        <h1 class="screen-title">{trap.file.title.ru}</h1>
        <p class="trap-meta">
          <span class={`side-dot side-dot-${trap.side}`} aria-hidden="true" />
          {t.learn.playAs[trap.side]}
        </p>
        <p class="trap-meta">
          {fmt(t.learn.itemOf, { n: progress.item + 1, total: queue.length })}: {lineTitle(line)}
        </p>
      </div>

      <p class={`status${done ? ' status-done' : ''}`} role="status">
        {status}
      </p>

      <Board
        fen={fen}
        orientation={trap.side}
        turnColor={turnColor(chess)}
        movableColor={playerToMove && !pendingPromotion ? trap.side : undefined}
        dests={dests}
        lastMove={lastMove}
        inCheck={chess.isCheck()}
        syncKey={syncKey}
        onMove={handleMove}
        hint={hint}
      />

      <MoveList steps={line.steps.slice(0, progress.ply)} ply={progress.ply} />

      <div class="trap-body">
        {done ? (
          <section class="panel" aria-live="polite">
            <p class={clean ? 'verdict verdict-ok' : 'verdict'}>
              {clean
                ? t.learn.clean
                : fmt(t.learn.stats, { errors: progress.lineErrors, hints: progress.lineHints })}
            </p>
            <div class="panel-actions">
              {remaining > 0 ? (
                <button type="button" class="button button-primary" onClick={() => goToItem(progress.item + 1)}>
                  {t.learn.next}
                </button>
              ) : (
                <a class="button button-primary" href={routeHref({ name: 'traps' })}>
                  {t.traps.toList}
                </a>
              )}
              <button type="button" class="button" onClick={() => goToItem(progress.item)}>
                {t.learn.repeat}
              </button>
              {remaining === 0 && queue.length > 1 && (
                <button type="button" class="button" onClick={() => goToItem(0)}>
                  {t.learn.restart}
                </button>
              )}
            </div>
            {progress.verdict?.kind === 'otherMate' && <p>{verdictText(progress.verdict)}</p>}
            <p>{lineHelp(trap, line)}</p>
            {progress.otherMate === undefined && <p class="line-result">{resultText(line.result)}</p>}
            {remaining > 0 && <p class="hint-text">{fmt(t.learn.more, { n: remaining })}</p>}
          </section>
        ) : (
          <section class="panel">
            <p class="feedback" aria-live="polite">
              {verdictText(progress.verdict)} {hintText}
            </p>
            <div class="panel-actions">
              <button
                type="button"
                class="button"
                disabled={!playerToMove || progress.hintLevel >= MAX_HINT_LEVEL}
                onClick={askHint}
              >
                {t.learn.hintButton}
              </button>
            </div>
            <p class="hint-text">{t.learn.shvu}</p>
          </section>
        )}

        <a class="button button-quiet" href={trapHref}>
          {t.learn.toTrap}
        </a>
      </div>

      {pendingPromotion && (
        <PromotionPicker
          color={trap.side}
          onPick={(piece: PromotionPiece) => {
            const { from, to } = pendingPromotion;
            setPendingPromotion(undefined);
            attempt({ from, to, promotion: piece });
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
