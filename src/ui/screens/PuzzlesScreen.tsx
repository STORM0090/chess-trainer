import { PUZZLE_THEMES, TACTICS_LEVELS, TOP_LEVEL, themeLevel } from '../../../shared/puzzle-types.ts';
import { usePuzzles } from '../../content/puzzles';
import { currentLevel, LEVEL_PASS, LEVEL_WINDOW, solvedCount, TEST_SIZE } from '../../core/tactics';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { useStore } from '../../storage/store';
import { PoolNotice } from '../puzzle/PuzzleParts';

/** The player's level and the list of themes. */
export function PuzzlesScreen() {
  const pool = usePuzzles();
  const { data } = useStore();
  if (pool.state !== 'ready') return <PoolNotice pool={pool} />;

  const { tactics } = data;
  const level = currentLevel(tactics);
  const band = TACTICS_LEVELS[level];
  const cleanRecent = tactics.recent.filter(Boolean).length;
  const testHref = routeHref({ name: 'puzzleTest' });

  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.puzzles.title}</h1>
      <section class="panel today">
        <h2 class="panel-title">{t.puzzles.levelTitle}</h2>
        {tactics.level === null ? (
          <>
            <p>{fmt(t.puzzles.noTest, { n: TEST_SIZE })}</p>
            <a class="button button-primary" href={testHref}>
              {t.puzzles.testStart}
            </a>
            <p class="hint-text">{t.puzzles.noTestHelp}</p>
          </>
        ) : (
          <>
            <p class="today-count">
              {band && fmt(t.puzzles.level, { n: level + 1, total: TOP_LEVEL + 1, min: band.min, max: band.max })}
            </p>
            <p class="hint-text">
              {level < TOP_LEVEL
                ? fmt(t.puzzles.levelProgress, {
                    window: LEVEL_WINDOW,
                    percent: Math.round(LEVEL_PASS * 100),
                    clean: cleanRecent,
                    n: tactics.recent.length,
                  })
                : t.puzzles.levelTop}{' '}
              {t.puzzles.levelScale}
            </p>
            <a class="button button-quiet" href={testHref}>
              {t.puzzles.testAgain}
            </a>
          </>
        )}
      </section>

      <p class="hint">{t.puzzles.intro}</p>
      {TACTICS_LEVELS.map((own, index) => {
        if (own.themes.length === 0) return null;
        return (
          <section key={index} class="stage">
            <h2 class="stage-title">{fmt(t.puzzles.themeLevel, { n: index + 1 })}</h2>
            <ul class="trap-list">
              {PUZZLE_THEMES.filter((theme) => themeLevel(theme) === index).map((theme) => {
                const total = pool.puzzles.filter((puzzle) => puzzle.themes.includes(theme)).length;
                return (
                  <li key={theme}>
                    <a class="trap-card" href={routeHref({ name: 'puzzleTheme', theme })}>
                      <span class="trap-card-text">
                        <span class="trap-card-title">{t.puzzles.theme[theme]}</span>
                        <span class="trap-card-meta theme-help">{t.puzzles.themeHelp[theme]}</span>
                        <span class="trap-card-meta trap-card-marks">
                          <span class="badge">
                            {fmt(t.puzzles.solved, {
                              n: solvedCount(pool.puzzles, theme, data.puzzles),
                              total,
                            })}
                          </span>
                          {index > level && <span class="badge badge-status-locked">{t.puzzles.harder}</span>}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p class="hint-text">{t.puzzles.sourceNote}</p>
    </div>
  );
}
