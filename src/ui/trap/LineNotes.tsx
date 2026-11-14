import type { LineExplanation } from '../../../shared/trap-types.ts';
import type { CompiledLine, CompiledTrap } from '../../core/trap-model';
import { t } from '../../i18n';
import { lineHelp, resultText } from './labels';

function sourceText(explanation: LineExplanation): string {
  const { sources } = explanation;
  if (sources.includes('board') && sources.includes('engine')) return t.traps.source.both;
  if (sources.includes('board')) return t.traps.source.board;
  return sources.includes('engine') ? t.traps.source.engine : '';
}

/**
 * What the app says about a line: the reviewed text with its source mark when the line has
 * one, otherwise one general sentence for the kind of line; then how the line ends.
 */
export function LineNotes({
  trap,
  line,
  showResult = true,
}: {
  trap: CompiledTrap;
  line: CompiledLine;
  showResult?: boolean;
}) {
  const explanation = line.explanation;
  return (
    <>
      {explanation ? (
        <p class="line-explanation">
          {explanation.ru}{' '}
          <span class="line-source">
            {sourceText(explanation)}
            {explanation.link && (
              <>
                {' '}
                <a href={explanation.link} target="_blank" rel="noopener noreferrer">
                  {t.traps.source.link}
                </a>
              </>
            )}
          </span>
        </p>
      ) : (
        <p>{lineHelp(trap, line)}</p>
      )}
      {showResult && <p class="line-result">{resultText(line.result)}</p>}
    </>
  );
}
