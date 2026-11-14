import type { ComponentChildren } from 'preact';
import type { PuzzlePool } from '../../content/puzzles';
import type { CompiledPuzzle } from '../../core/puzzle-model';
import { t } from '../../i18n';
import { routeHref } from '../../router';

/** Shown while the puzzle file is loading, and when it could not be loaded. */
export function PoolNotice({ pool }: { pool: PuzzlePool }) {
  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.puzzles.title}</h1>
      <p class={pool.state === 'failed' ? 'verdict verdict-bad' : 'hint'} role="status">
        {pool.state === 'failed' ? t.puzzles.loadFailed : t.puzzles.loading}
      </p>
      {pool.state === 'failed' && (
        <a class="button" href={routeHref({ name: 'traps' })}>
          {t.traps.toList}
        </a>
      )}
    </div>
  );
}

/** Title, the player's side and one or two lines about the puzzle. */
export function PuzzleHead({
  title,
  puzzle,
  children,
}: {
  title: string;
  puzzle: CompiledPuzzle;
  children?: ComponentChildren;
}) {
  return (
    <div class="trap-head">
      <h1 class="screen-title">{title}</h1>
      <p class="trap-meta">
        <span class={`side-dot side-dot-${puzzle.side}`} aria-hidden="true" />
        {t.learn.playAs[puzzle.side]}
      </p>
      {children}
    </div>
  );
}
