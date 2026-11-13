import type { Reliability } from '../../../shared/trap-types.ts';
import { t } from '../../i18n';

/** How well the trap holds up when the opponent does not fall for it. */
export function ReliabilityBadge({ reliability }: { reliability: Reliability | null | undefined }) {
  if (!reliability) return null;
  return <span class={`badge badge-${reliability}`}>{t.traps.reliability[reliability]}</span>;
}
