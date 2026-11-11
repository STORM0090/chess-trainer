import type { Color, PromotionPiece } from '../../core/chess-helpers';
import { t } from '../../i18n';

const GLYPHS: Record<Color, Record<PromotionPiece, string>> = {
  white: { q: '♕', r: '♖', b: '♗', n: '♘' },
  black: { q: '♛', r: '♜', b: '♝', n: '♞' },
};

const ORDER: PromotionPiece[] = ['q', 'n', 'r', 'b'];

export interface PromotionPickerProps {
  color: Color;
  onPick: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

/** Modal with four large buttons, shown when a pawn reaches the last rank. */
export function PromotionPicker({ color, onPick, onCancel }: PromotionPickerProps) {
  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-label={t.board.promotionTitle}>
      <div class="dialog">
        <p class="dialog-title">{t.board.promotionTitle}</p>
        <div class="promotion-grid">
          {ORDER.map((piece) => (
            <button key={piece} type="button" class="promotion-button" onClick={() => onPick(piece)}>
              <span class="promotion-glyph" aria-hidden="true">
                {GLYPHS[color][piece]}
              </span>
              {t.board.pieces[piece]}
            </button>
          ))}
        </div>
        <button type="button" class="button button-quiet" onClick={onCancel}>
          {t.board.promotionCancel}
        </button>
      </div>
    </div>
  );
}
