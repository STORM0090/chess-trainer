import { useEffect, useRef } from 'preact/hooks';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { Dests as BoardDests, Key } from '@lichess-org/chessground/types';
import type { Square } from 'chess.js';
import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.brown.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';
import type { Color, Dests } from '../../core/chess-helpers';

export interface BoardProps {
  fen: string;
  orientation: Color;
  turnColor: Color;
  /** Which side the user may move. `undefined` makes the board read-only. */
  movableColor: Color | 'both' | undefined;
  dests: Dests;
  lastMove: [Square, Square] | undefined;
  inCheck: boolean;
  /**
   * Change this to force the board back to `fen` even when `fen` itself did not change,
   * for example after a cancelled promotion, when the pawn already sits on the last rank.
   */
  syncKey: number;
  /** Called after the user moved a piece by tapping two squares or by dragging. */
  onMove: (from: Square, to: Square) => void;
}

function positionConfig(props: BoardProps): Config {
  return {
    fen: props.fen,
    orientation: props.orientation,
    turnColor: props.turnColor,
    check: props.inCheck,
    lastMove: props.lastMove,
    movable: {
      free: false,
      color: props.movableColor,
      // chess.js squares and chessground keys are the same strings ("e4").
      dests: props.dests as BoardDests,
      showDests: true,
    },
  };
}

/** A thin Preact wrapper around chessground. All chess rules live outside, in chess.js. */
export function Board(props: BoardProps) {
  const element = useRef<HTMLDivElement>(null);
  const api = useRef<Api | undefined>(undefined);
  const onMove = useRef(props.onMove);
  onMove.current = props.onMove;

  useEffect(() => {
    const wrap = element.current;
    if (!wrap) return;
    const board = Chessground(wrap, {
      ...positionConfig(props),
      coordinates: true,
      // Dragging a piece must not scroll the page under the finger.
      blockTouchScroll: true,
      animation: { enabled: true, duration: 180 },
      highlight: { lastMove: true, check: true },
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true },
      premovable: { enabled: false },
      drawable: { enabled: false },
      events: {},
    });
    board.set({
      movable: {
        events: { after: (from: Key, to: Key) => onMove.current(from as Square, to as Square) },
      },
    });
    api.current = board;

    // chessground caches the board's screen position and refreshes it only on scroll and
    // resize. When something above the board appears or disappears (the update banner),
    // the cache goes stale and taps land one row off. Refresh it before every touch.
    const refreshBounds = () => board.state.dom.bounds.clear();
    wrap.addEventListener('touchstart', refreshBounds, { capture: true, passive: true });
    wrap.addEventListener('mousedown', refreshBounds, { capture: true });

    return () => {
      wrap.removeEventListener('touchstart', refreshBounds, { capture: true });
      wrap.removeEventListener('mousedown', refreshBounds, { capture: true });
      board.destroy();
      api.current = undefined;
    };
    // Created once; later changes go through the effect below.
  }, []);

  useEffect(() => {
    api.current?.set(positionConfig(props));
    // dests, lastMove and inCheck are all derived from the position, so `fen` covers them.
  }, [props.fen, props.orientation, props.turnColor, props.movableColor, props.syncKey]);

  return <div class="board" ref={element} />;
}
