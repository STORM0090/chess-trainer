import { allTraps } from '../../content/traps';
import { backupHintDue, recentDays, sessionProgress, streakState, MAX_FREEZES } from '../../core/daily';
import { DAY_MS, dayKey, weekdayOfKey } from '../../core/days';
import { trapStatus } from '../../core/progress';
import { currentLevel } from '../../core/tactics';
import { TOP_LEVEL } from '../../../shared/puzzle-types.ts';
import { fmt, plural, t } from '../../i18n';
import { routeHref } from '../../router';
import { appNow, today, updateSettings, useStore } from '../../storage/store';
import { expectedShape } from '../session/plan';

/** How long the backup hint stays away after "later". */
const SNOOZE_MS = 30 * DAY_MS;

/** The home screen: what to do today and how far the player has come. Nothing here blames. */
export function TodayScreen() {
  const { data } = useStore();
  const now = appNow();
  const date = dayKey(now);
  const day = today(now);
  const streak = streakState(data.days, date);
  const week = recentDays(data.days, date, 7);
  const progress = sessionProgress(day.session);
  const sessionDone = day.session !== null && progress.total > 0 && progress.done >= progress.total;
  const sessionHref = routeHref({ name: 'session' });
  const norm = data.settings.dailyNorm;

  const traps = allTraps();
  const mastered = traps.filter((trap) => trapStatus(data.traps[trap.id]) === 'mastered').length;
  const solved = Object.values(data.puzzles).filter((puzzle) => puzzle.clean > 0).length;
  const showBackupHint = backupHintDue(data.settings, data.days, now);

  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.today.title}</h1>

      <section class="panel today">
        <h2 class="panel-title">
          {day.session === null
            ? t.today.shape[expectedShape(data, day, now)]
            : sessionDone
              ? t.today.sessionDone
              : t.today.sessionGoing}
        </h2>
        {sessionDone ? (
          <>
            <p class="hint-text">{t.today.sessionDoneHelp}</p>
            <div class="panel-actions">
              <a class="button" href={routeHref({ name: 'puzzles' })}>
                {t.nav.puzzles}
              </a>
              <a class="button" href={routeHref({ name: 'traps' })}>
                {t.nav.traps}
              </a>
            </div>
          </>
        ) : (
          <>
            <p class="hint-text">
              {day.session === null ? t.today.sessionHelp : fmt(t.today.sessionProgress, progress)}
            </p>
            <a class="button button-primary" href={sessionHref}>
              {day.session === null ? t.today.start : t.today.resume}
            </a>
          </>
        )}
        <p class="hint-text">
          {day.metAt !== null
            ? fmt(t.today.normMet, { done: day.done })
            : fmt(t.today.norm, { norm, exercises: plural(norm, t.plural.exercise), done: day.done })}
        </p>
      </section>

      <section class="panel">
        <h2 class="panel-title">{fmt(t.today.totalDays, { n: streak.totalDays })}</h2>
        <ol class="week" aria-label={t.today.weekLabel}>
          {week.map(({ date: key, mark }) => (
            <li key={key} class={`week-day week-day-${mark}`}>
              <span class="week-name">{t.today.weekdays[weekdayOfKey(key)]}</span>
              <span class="week-mark" aria-label={t.today.mark[mark]} />
            </li>
          ))}
        </ol>
        <p>
          {streak.current > 0
            ? fmt(t.today.streak, { n: streak.current, days: plural(streak.current, t.plural.day) })
            : t.today.streakNone}{' '}
          {fmt(t.today.freezes, { n: streak.freezes, max: MAX_FREEZES })}
        </p>
        <p class="hint-text">
          {streak.freezes >= MAX_FREEZES
            ? t.today.freezeFull
            : fmt(t.today.freezeNext, { n: streak.toNextFreeze, days: plural(streak.toNextFreeze, t.plural.dayOf) })}
        </p>
      </section>

      <section class="panel">
        <h2 class="panel-title">{t.today.progressTitle}</h2>
        <p>
          <a href={routeHref({ name: 'traps' })}>{fmt(t.home.mastered, { n: mastered, total: traps.length })}</a>
        </p>
        <p>
          <a href={routeHref({ name: 'puzzles' })}>
            {data.tactics.level === null
              ? fmt(t.today.puzzlesNoLevel, { solved })
              : fmt(t.today.puzzles, { level: currentLevel(data.tactics) + 1, total: TOP_LEVEL + 1, solved })}
          </a>
        </p>
        {data.tactics.level === null && (
          <a class="button" href={routeHref({ name: 'puzzleTest' })}>
            {t.puzzles.testStart}
          </a>
        )}
      </section>

      {showBackupHint && (
        <section class="panel">
          <p>{t.today.backupHint}</p>
          <div class="panel-actions">
            <a class="button" href={routeHref({ name: 'data' })}>
              {t.today.backupOpen}
            </a>
            <button
              type="button"
              class="button button-quiet"
              onClick={() => updateSettings({ backupSnoozedUntil: now + SNOOZE_MS })}
            >
              {t.today.backupLater}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
