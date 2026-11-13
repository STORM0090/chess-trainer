import { chainLength, nextChainStep, openDeviations } from '../../core/chain';
import { gameCounts, isReviewDue, trapStatus, type GameOutcome } from '../../core/progress';
import type { CompiledTrap } from '../../core/trap-model';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { appNow, logGame, removeGame, useStore } from '../../storage/store';
import type { TrapAccess } from './access';
import { whenText } from './labels';

/** Where the player stands with this trap, and the button for the next thing to do. */
export function ProgressPanel({ trap, access }: { trap: CompiledTrap; access: TrapAccess }) {
  const { progress, unlocked, blocker } = access;
  const id = trap.file.id;
  const status = trapStatus(progress);
  const length = chainLength(trap);
  const now = appNow();
  const next = nextChainStep(trap, progress);
  const deviations = openDeviations(trap, progress);
  const chainHref = routeHref({ name: 'chain', id });

  return (
    <section class="panel">
      <h2 class="panel-title">
        {t.progress.title}: <span class={`badge badge-status-${status}`}>{t.progress.status[status]}</span>
      </h2>

      {!unlocked && (
        <>
          {blocker && <p>{fmt(t.progress.locked, { title: blocker.title.ru })}</p>}
          <p class="hint-text">{t.progress.lockedHelp}</p>
          {blocker && (
            <a class="button" href={routeHref({ name: 'trap', id: blocker.id })}>
              {blocker.title.ru}
            </a>
          )}
        </>
      )}

      {unlocked && progress.learnedAt === null && (
        <>
          {progress.chainDepth > 0 && (
            <p>{fmt(t.progress.chainDepth, { n: Math.min(progress.chainDepth, length), total: length })}</p>
          )}
          <a class="button button-primary" href={chainHref}>
            {progress.chainDepth === 0 || next?.kind !== 'main'
              ? progress.chainDepth === 0
                ? t.progress.chainStart
                : fmt(t.progress.deviationsLeft, { n: deviations })
              : fmt(t.progress.chainContinue, { n: next.depth, total: length })}
          </a>
          <p class="hint-text">{t.progress.chainHelp}</p>
        </>
      )}

      {unlocked && progress.learnedAt !== null && (
        <>
          <p>{status === 'mastered' ? t.progress.masteredNote : t.progress.learnedNote}</p>
          {isReviewDue(progress, now) ? (
            <a class="button button-primary" href={routeHref({ name: 'review', id })}>
              {t.progress.reviewNow}
            </a>
          ) : (
            progress.dueAt !== null && (
              <p class="line-result">{fmt(t.progress.reviewAt, { when: whenText(progress.dueAt, now) })}</p>
            )
          )}
          {deviations > 0 && (
            <a class="button" href={chainHref}>
              {fmt(t.progress.deviationsLeft, { n: deviations })}
            </a>
          )}
        </>
      )}

      {unlocked && (
        <a class="button" href={routeHref({ name: 'learn', id })}>
          {t.progress.learnAll}
        </a>
      )}
    </section>
  );
}

const OUTCOMES: GameOutcome[] = ['worked', 'declined', 'refuted'];
/** After this many logged games a doubtful trap is worth a second look. */
const REVIEW_AFTER_GAMES = 25;

/** "It came up in a real game": three outcomes, counted per trap. */
export function GamesPanel({ trap }: { trap: CompiledTrap }) {
  const { data } = useStore();
  const id = trap.file.id;
  const own = data.games.filter((game) => game.trapId === id);
  const counts = gameCounts(data.games, id);
  const last = own.at(-1);

  return (
    <section class="panel">
      <h2 class="panel-title">{t.games.title}</h2>
      <p class="hint-text">{t.games.help}</p>
      <div class="panel-actions panel-actions-column">
        {OUTCOMES.map((outcome) => (
          <button key={outcome} type="button" class="button" onClick={() => logGame(id, outcome)}>
            {t.games.outcome[outcome]}
          </button>
        ))}
      </div>
      <p class="line-result" aria-live="polite">
        {own.length === 0 ? t.games.none : fmt(t.games.counts, counts)}
      </p>
      {trap.file.verification?.reliability === 'dubious' && (
        <p class="hint-text">{fmt(t.games.dubious, { total: REVIEW_AFTER_GAMES, n: own.length })}</p>
      )}
      {last && (
        <button type="button" class="button button-quiet" onClick={() => removeGame(last.id)}>
          {t.games.undo}
        </button>
      )}
    </section>
  );
}
