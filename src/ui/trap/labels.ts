// Russian texts derived from trap data: evaluations, line titles, move numbers.

import type { LineResult } from '../../../shared/trap-types.ts';
import { commonPrefix, type CompiledLine, type CompiledTrap, type Step } from '../../core/trap-model';
import { fmt, t } from '../../i18n';

/** Centipawns from the player's point of view as "+2.4" or "−0.3". */
export function formatEval(cp: number): string {
  const pawns = (Math.abs(cp) / 100).toFixed(1);
  if (pawns === '0.0') return '0.0';
  return `${cp > 0 ? '+' : '−'}${pawns}`;
}

function verdict(cp: number): string {
  const words = t.traps.result.verdict;
  if (cp >= 200) return words.winning;
  if (cp >= 50) return words.better;
  if (cp > -50) return words.equal;
  if (cp > -200) return words.worse;
  return words.losing;
}

/** A full sentence about how a line ends. */
export function resultText(result: LineResult | undefined): string {
  if (!result) return '';
  const texts = t.traps.result;
  if (result.end === 'checkmate') return texts.checkmate;
  if (result.end === 'checkmated') return texts.checkmated;
  if (result.mate !== undefined) {
    return result.mate > 0
      ? fmt(texts.mateIn, { n: result.mate })
      : fmt(texts.matedIn, { n: -result.mate });
  }
  if (result.cp !== undefined) {
    return fmt(texts.eval, { eval: formatEval(result.cp), verdict: verdict(result.cp) });
  }
  return '';
}

/** The same in two or three words, for the list of lines. */
export function resultShort(result: LineResult | undefined): string {
  if (!result) return '';
  const texts = t.traps.result.short;
  if (result.end === 'checkmate') return texts.checkmate;
  if (result.end === 'checkmated') return texts.checkmated;
  if (result.mate !== undefined) {
    return result.mate > 0
      ? fmt(texts.mateIn, { n: result.mate })
      : fmt(texts.matedIn, { n: -result.mate });
  }
  return result.cp !== undefined ? formatEval(result.cp) : '';
}

export function lineTitle(line: CompiledLine): string {
  return line.main ? t.traps.lineTitle.main : t.traps.lineTitle[line.tag];
}

export function lineHelp(trap: CompiledTrap, line: CompiledLine): string {
  const help = t.traps.lineHelp;
  if (line.main) return trap.file.kind === 'defence' ? help.mainDefence : help.mainTrap;
  return help[line.tag];
}

/** "4.Nc3" for a white move, "4...g6" for a black one. */
export function numberedSan(step: Step, withMark = false): string {
  const number = Math.floor(step.ply / 2) + 1;
  const mark = withMark && step.mark ? step.mark : '';
  return `${number}${step.mover === 'white' ? '.' : '...'}${step.san}${mark}`;
}

/** The move where a line leaves the main line, for example "4...Nf6". */
export function divergenceLabel(trap: CompiledTrap, line: CompiledLine): string {
  if (line.main) return '';
  const step = line.steps[commonPrefix(trap.main, line)];
  return step ? numberedSan(step) : '';
}
