import type { Step } from '../../core/trap-model';
import { t } from '../../i18n';

interface MoveListProps {
  steps: Step[];
  /** Number of moves already on the board; the last of them is highlighted. */
  ply: number;
  /** When given, every move is a button that jumps to the position after it. */
  onSelect?: (ply: number) => void;
}

/** Moves with numbers: "1. e4 e5 2. Nf3". Wraps onto several rows. */
export function MoveList({ steps, ply, onSelect }: MoveListProps) {
  if (steps.length === 0) return <p class="movelist movelist-empty">{t.traps.startPosition}</p>;
  return (
    <ol class="movelist">
      {steps.map((step) => {
        const text = `${step.san}${step.mark ?? ''}`;
        const isCurrent = step.ply === ply - 1;
        const isBad = step.mark === '?' || step.mark === '??';
        const className = `move${isCurrent ? ' move-current' : ''}${isBad ? ' move-bad' : ''}`;
        return (
          <li key={step.ply} class="movelist-item">
            {step.mover === 'white' && <span class="move-number">{step.ply / 2 + 1}.</span>}
            {onSelect ? (
              <button
                type="button"
                class={className}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onSelect(step.ply + 1)}
              >
                {text}
              </button>
            ) : (
              <span class={className}>{text}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
