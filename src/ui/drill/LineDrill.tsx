import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Chess, type Square } from 'chess.js';
import {
  isPromotionMove,
  legalDests,
  turnColor,
  type Dests,
  type PromotionPiece,
} from '../../core/chess-helpers';
import {
  hintLevelForErrors,
  judgeMove,
  MAX_HINT_LEVEL,
  type HintLevel,
  type PlayerMove,
  type Verdict,
} from '../../core/learn';
import { fenAtPly, type CompiledLine, type CompiledTrap } from '../../core/trap-model';
import { fmt, t } from '../../i18n';
import { Board, type BoardHint } from '../board/Board';
import { PromotionPicker } from '../board/PromotionPicker';
import { MoveList } from '../trap/MoveList';
import { numberedSan, resultText } from '../trap/labels';

const NO_DESTS: Dests = new Map();
/** Pause before the opponent's move, so the player sees their own move land first. */
const OPPONENT_DELAY_MS = 650;

/** How one run through a line ended. */
export interface DrillResult {
  errors: number;
  hints: number;
  /** The line the run ended in; differs from the starting line when the run followed another. */
  line: CompiledLine;
  /** Set when the player ended the run with a mate that is not the move of the line. */
  otherMateSan: string | undefined;
}

interface DrillState {
  line: CompiledLine;
  /** Moves of the line already on the board. */
  ply: number;
  /** Wrong moves in the current position. */
  errors: number;
  hintLevel: HintLevel;
  /** Totals for the run. */
  totalErrors: number;
  totalHints: number;
  /** What the app says about the player's last move. */
  verdict: Verdict | undefined;
  otherMate: { fen: string; from: Square; to: Square; san: string } | undefined;
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
      return verdict.follow ? t.learn.correct : t.learn.otherLine;
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

interface LineDrillProps {
  trap: CompiledTrap;
  line: CompiledLine;
  /** The run starts in the position before this ply. */
  startPly: number;
  /**
   * Chain and review: a good move that belongs to another line with the same moves so far is
   * accepted, and the run goes on along that line. Learn mode asks for the move of its line.
   */
  followOtherLines?: boolean;
  /** Text of the status line once the run is over. */
  doneStatus: string;
  /** Called once, when the run ends. */
  onDone: (result: DrillResult) => void;
  /** Extra buttons next to "Подсказка" while the run is going. */
  actions?: ComponentChildren;
  /** Shown under the board once the run is over. */
  children: ComponentChildren;
}

/**
 * One run through a line: the player makes the moves of their side, the app answers for the
 * opponent and gives hints. To start again, give the component a new `key`.
 */
export function LineDrill(props: LineDrillProps) {
  const { trap } = props;
  const [state, setState] = useState<DrillState>(() => ({
    line: props.line,
    ply: props.startPly,
    errors: 0,
    hintLevel: 0,
    totalErrors: 0,
    totalHints: 0,
    verdict: undefined,
    otherMate: undefined,
  }));
  const [syncKey, setSyncKey] = useState(0);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square }>();

  const line = state.line;
  const step = line.steps[state.ply];
  const done = state.otherMate !== undefined || step === undefined;
  const playerToMove = !done && step.mover === trap.side;
  const opponentToMove = !done && step.mover !== trap.side;

  useEffect(() => {
    if (!opponentToMove) return;
    const timer = setTimeout(() => {
      setState((current) => ({ ...current, ply: current.ply + 1 }));
    }, OPPONENT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [opponentToMove, state.ply]);

  useEffect(() => {
    if (!done) return;
    props.onDone({
      errors: state.totalErrors,
      hints: state.totalHints,
      line,
      otherMateSan: state.otherMate?.san,
    });
    // Reported once: nothing changes after the run is over.
  }, [done]);

  const fen = state.otherMate?.fen ?? fenAtPly(line, state.ply);
  const chess = useMemo(() => new Chess(fen), [fen]);
  const dests = useMemo(() => (playerToMove ? legalDests(chess) : NO_DESTS), [chess, playerToMove]);
  const last = state.ply > 0 ? line.steps[state.ply - 1] : undefined;
  const lastMove: [Square, Square] | undefined = state.otherMate
    ? [state.otherMate.from, state.otherMate.to]
    : last
      ? [last.from, last.to]
      : undefined;

  const attempt = (move: PlayerMove) => {
    const verdict = judgeMove(trap, line, state.ply, move);
    // The board already shows the player's move; put it back to the app's position.
    setSyncKey((key) => key + 1);
    setState((current) => {
      switch (verdict.kind) {
        case 'correct':
          return { ...current, ply: current.ply + 1, errors: 0, hintLevel: 0, verdict };
        case 'otherMate':
          return {
            ...current,
            verdict,
            otherMate: { fen: verdict.fen, from: move.from, to: move.to, san: verdict.san },
          };
        case 'otherLine':
          if (props.followOtherLines && verdict.follow) {
            return {
              ...current,
              line: verdict.follow,
              ply: current.ply + 1,
              errors: 0,
              hintLevel: 0,
              verdict,
            };
          }
          return { ...current, verdict };
        case 'knownMistake':
        case 'wrong': {
          const errors = current.errors + 1;
          const earned = hintLevelForErrors(errors);
          return {
            ...current,
            errors,
            totalErrors: current.totalErrors + 1,
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
    setState((current) =>
      current.hintLevel >= MAX_HINT_LEVEL
        ? current
        : {
            ...current,
            hintLevel: (current.hintLevel + 1) as HintLevel,
            totalHints: current.totalHints + 1,
            verdict: undefined,
          },
    );
  };

  let hint: BoardHint | undefined;
  let hintText = '';
  if (playerToMove && state.hintLevel >= 1) {
    hintText = t.learn.hintKind[step.kind];
    if (state.hintLevel === 2) {
      hint = { kind: 'piece', square: step.from };
      hintText = t.learn.hintPiece;
    } else if (state.hintLevel === 3) {
      hint = { kind: 'move', from: step.from, to: step.to };
      hintText = t.learn.hintArrow;
    }
  }

  const status = done ? props.doneStatus : playerToMove ? t.learn.yourMove : t.learn.opponentMoves;

  return (
    <>
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

      <MoveList steps={line.steps.slice(0, state.ply)} ply={state.ply} />

      <div class="trap-body">
        {done ? (
          props.children
        ) : (
          <section class="panel">
            <p class="feedback" aria-live="polite">
              {verdictText(state.verdict)} {hintText}
            </p>
            <div class="panel-actions">
              <button
                type="button"
                class="button"
                disabled={!playerToMove || state.hintLevel >= MAX_HINT_LEVEL}
                onClick={askHint}
              >
                {t.learn.hintButton}
              </button>
              {props.actions}
            </div>
            <p class="hint-text">{t.learn.shvu}</p>
          </section>
        )}
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
    </>
  );
}
