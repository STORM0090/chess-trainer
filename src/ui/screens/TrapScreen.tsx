import { useEffect, useMemo, useState } from 'preact/hooks';
import { Chess, type Square } from 'chess.js';
import { turnColor, type Dests } from '../../core/chess-helpers';
import { getTrap } from '../../content/traps';
import { commonPrefix, fenAtPly, type CompiledTrap } from '../../core/trap-model';
import { markSeen } from '../../core/progress';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { appNow, updateTrap } from '../../storage/store';
import { Board } from '../board/Board';
import { MoveList } from '../trap/MoveList';
import { GamesPanel, ProgressPanel } from '../trap/ProgressPanel';
import { ReliabilityBadge } from '../trap/ReliabilityBadge';
import { useTrapAccess } from '../trap/access';
import {
  divergenceLabel,
  formatEval,
  lineHelp,
  lineTitle,
  resultShort,
  resultText,
} from '../trap/labels';

const NO_DESTS: Dests = new Map();
const AUTOPLAY_MS = 1100;

export function MissingTrap() {
  return (
    <div class="screen">
      <h1 class="screen-title">{t.traps.missing}</h1>
      <a class="button button-primary" href={routeHref({ name: 'traps' })}>
        {t.traps.toList}
      </a>
    </div>
  );
}

/** View mode: step through any line of a trap. Nothing is checked here. */
export function TrapScreen({ id }: { id: string }) {
  const trap = getTrap(id);
  // The key resets the position when the user opens another trap.
  return trap ? <TrapView key={id} trap={trap} /> : <MissingTrap />;
}

function TrapView({ trap }: { trap: CompiledTrap }) {
  const [lineIndex, setLineIndex] = useState(trap.main.index);
  const [ply, setPly] = useState(0);
  const [playing, setPlaying] = useState(false);
  const line = trap.lines[lineIndex] ?? trap.main;
  const total = line.steps.length;
  const access = useTrapAccess(trap.file.id);

  // Opening the trap is what "seen" means in the collection.
  useEffect(() => {
    updateTrap(trap.file.id, (progress) => markSeen(progress, appNow()));
  }, [trap.file.id]);

  useEffect(() => {
    if (!playing) return;
    if (ply >= total) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setPly((current) => current + 1), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, ply, total]);

  const fen = fenAtPly(line, ply);
  const chess = useMemo(() => new Chess(fen), [fen]);
  const last = ply > 0 ? line.steps[ply - 1] : undefined;
  const lastMove: [Square, Square] | undefined = last ? [last.from, last.to] : undefined;

  const goTo = (target: number) => {
    setPlaying(false);
    setPly(Math.max(0, Math.min(total, target)));
  };

  const selectLine = (index: number) => {
    const next = trap.lines[index];
    if (!next) return;
    setPlaying(false);
    setLineIndex(index);
    // Open another line at the point where it leaves the main line.
    setPly(next.main ? 0 : commonPrefix(trap.main, next));
    // The list of lines sits below the board; bring the board back into view.
    window.scrollTo(0, 0);
  };

  const verification = trap.file.verification;
  const reliability = verification?.reliability;

  return (
    <div class="screen board-screen trap-screen">
      <div class="trap-head">
        <h1 class="screen-title">{trap.file.title.ru}</h1>
        <p class="trap-meta">
          <span class={`side-dot side-dot-${trap.side}`} aria-hidden="true" />
          {t.traps.kind[trap.file.kind]} {t.traps.side[trap.side]}
          <ReliabilityBadge reliability={reliability} />
        </p>
        <p class="trap-idea">{trap.file.idea.ru}</p>
      </div>

      <Board
        fen={fen}
        orientation={trap.side}
        turnColor={turnColor(chess)}
        movableColor={undefined}
        dests={NO_DESTS}
        lastMove={lastMove}
        inCheck={chess.isCheck()}
        syncKey={0}
        onMove={() => undefined}
      />

      <MoveList steps={line.steps} ply={ply} onSelect={goTo} />

      <div class="controls">
        <button type="button" class="button button-step" disabled={ply === 0} aria-label={t.traps.control.first} onClick={() => goTo(0)}>
          «
        </button>
        <button type="button" class="button button-step" disabled={ply === 0} aria-label={t.traps.control.prev} onClick={() => goTo(ply - 1)}>
          ‹
        </button>
        <button type="button" class="button button-step" disabled={ply >= total} aria-label={t.traps.control.next} onClick={() => goTo(ply + 1)}>
          ›
        </button>
        <button type="button" class="button button-step" disabled={ply >= total} aria-label={t.traps.control.last} onClick={() => goTo(total)}>
          »
        </button>
        <button
          type="button"
          class="button button-play"
          onClick={() => {
            if (playing) {
              setPlaying(false);
            } else {
              if (ply >= total) setPly(0);
              setPlaying(true);
            }
          }}
        >
          {playing ? t.traps.control.pause : t.traps.control.play}
        </button>
      </div>

      <div class="trap-body">
        <section class="panel">
          <h2 class="panel-title">
            {lineTitle(line)}
            {!line.main && <span class="panel-title-move"> {divergenceLabel(trap, line)}</span>}
          </h2>
          <p>{lineHelp(trap, line)}</p>
          <p class="line-result">{resultText(line.result)}</p>
        </section>

        <ProgressPanel trap={trap} access={access} />

        <section class="panel">
          <h2 class="panel-title">{t.traps.lines}</h2>
          <ul class="line-list">
            {trap.lines.map((candidate) => (
              <li key={candidate.index}>
                <button
                  type="button"
                  class={`line-button line-${candidate.tag}`}
                  aria-pressed={candidate.index === line.index}
                  onClick={() => selectLine(candidate.index)}
                >
                  <span class="line-button-text">
                    <span class="line-button-title">{lineTitle(candidate)}</span>
                    {!candidate.main && (
                      <span class="line-button-move">{divergenceLabel(trap, candidate)}</span>
                    )}
                  </span>
                  <span class="line-button-result">{resultShort(candidate.result)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {reliability && (
          <section class="panel">
            <h2 class="panel-title">
              {t.traps.reliabilityTitle}: <ReliabilityBadge reliability={reliability} />
            </h2>
            <p>{t.traps.reliabilityHelp[reliability]}</p>
            {verification?.worstCorrectPlayCp != null && (
              <p class="line-result">
                {fmt(t.traps.worstCase, { eval: formatEval(verification.worstCorrectPlayCp) })}
              </p>
            )}
          </section>
        )}

        <GamesPanel trap={trap} />

        <a class="button button-quiet" href={routeHref({ name: 'traps' })}>
          {t.traps.toList}
        </a>
      </div>
    </div>
  );
}
