import { useEffect, useRef, useState } from 'preact/hooks';
import { Chess, type Square } from 'chess.js';
import {
  gameStatus,
  isPromotionMove,
  lastMoveSquares,
  legalDests,
  turnColor,
  type Color,
  type PromotionPiece,
} from '../../core/chess-helpers';
import { t } from '../../i18n';
import { Board } from '../board/Board';
import { PromotionPicker } from '../board/PromotionPicker';

function statusText(chess: Chess): string {
  const toMove = turnColor(chess);
  switch (gameStatus(chess)) {
    case 'checkmate':
      // The side to move is the side that got mated.
      return toMove === 'white' ? t.board.checkmateBlackWins : t.board.checkmateWhiteWins;
    case 'stalemate':
      return t.board.stalemate;
    case 'draw':
      return t.board.draw;
    case 'check':
      return `${t.board.check}. ${toMove === 'white' ? t.board.whiteToMove : t.board.blackToMove}`;
    case 'playing':
      return toMove === 'white' ? t.board.whiteToMove : t.board.blackToMove;
  }
}

/** Groups SAN moves into numbered pairs: "1. e4 e5", "2. Nf3". */
function numberedMoves(history: string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push(`${i / 2 + 1}. ${history.slice(i, i + 2).join(' ')}`);
  }
  return pairs;
}

/**
 * Free board for stage M1a: the user moves both sides from the starting position.
 * It exists to check touch handling (tap-tap and drag), promotion and layout on real devices.
 */
export function BoardScreen() {
  const chessRef = useRef<Chess | undefined>(undefined);
  chessRef.current ??= new Chess();
  const chess = chessRef.current;

  // chess.js mutates in place, so a counter triggers re-rendering after each change.
  const [, setRevision] = useState(0);
  const [syncKey, setSyncKey] = useState(0);
  const [orientation, setOrientation] = useState<Color>('white');
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square }>();
  const moveList = useRef<HTMLOListElement>(null);

  const refresh = () => setRevision((revision) => revision + 1);
  const resyncBoard = () => setSyncKey((key) => key + 1);

  const play = (from: Square, to: Square, promotion?: PromotionPiece) => {
    try {
      chess.move({ from, to, promotion });
    } catch {
      // The board only offers legal moves; if the two ever disagree, snap back to the position.
    }
    resyncBoard();
    refresh();
  };

  const handleMove = (from: Square, to: Square) => {
    if (isPromotionMove(chess, from, to)) setPendingPromotion({ from, to });
    else play(from, to);
  };

  const history = chess.history();
  useEffect(() => {
    const list = moveList.current;
    if (list) list.scrollLeft = list.scrollWidth;
  }, [history.length]);

  return (
    <div class="screen board-screen">
      <p class="status" role="status">
        {statusText(chess)}
      </p>

      <Board
        fen={chess.fen()}
        orientation={orientation}
        turnColor={turnColor(chess)}
        movableColor={pendingPromotion ? undefined : turnColor(chess)}
        dests={legalDests(chess)}
        lastMove={lastMoveSquares(chess)}
        inCheck={chess.isCheck()}
        syncKey={syncKey}
        onMove={handleMove}
      />

      {history.length === 0 ? (
        <p class="hint">{t.board.noMoves}</p>
      ) : (
        <ol class="moves" ref={moveList}>
          {numberedMoves(history).map((pair) => (
            <li key={pair}>{pair}</li>
          ))}
        </ol>
      )}

      <div class="controls">
        <button
          type="button"
          class="button"
          disabled={history.length === 0}
          onClick={() => {
            chess.undo();
            resyncBoard();
            refresh();
          }}
        >
          {t.board.undo}
        </button>
        <button
          type="button"
          class="button"
          disabled={history.length === 0}
          onClick={() => {
            chess.reset();
            resyncBoard();
            refresh();
          }}
        >
          {t.board.reset}
        </button>
        <button
          type="button"
          class="button"
          onClick={() => setOrientation((side) => (side === 'white' ? 'black' : 'white'))}
        >
          {t.board.flip}
        </button>
      </div>

      {pendingPromotion && (
        <PromotionPicker
          color={turnColor(chess)}
          onPick={(piece) => {
            const { from, to } = pendingPromotion;
            setPendingPromotion(undefined);
            play(from, to, piece);
          }}
          onCancel={() => {
            setPendingPromotion(undefined);
            resyncBoard();
          }}
        />
      )}
    </div>
  );
}
