import { useState } from 'preact/hooks';
import { DAILY_NORMS } from '../../core/daily';
import { dayKey } from '../../core/days';
import { isReminderTime, reminderCalendar } from '../../core/ics';
import { fmt, plural, t } from '../../i18n';
import { routeHref } from '../../router';
import { updateSettings, useStore } from '../../storage/store';
import { isNativeApp, saveTextFile } from '../../platform/native';
import { RemindersPanel } from '../settings/RemindersPanel';

const REMINDER_FILE = 'chess-trainer-reminder.ics';

/** The daily norm and the calendar reminder. */
export function SettingsScreen() {
  const { data } = useStore();
  const { dailyNorm, reminderTime } = data.settings;
  const [saved, setSaved] = useState(false);

  const saveReminder = async () => {
    // The real clock, not the test clock: the calendar entry must start today.
    const now = Date.now();
    const text = reminderCalendar({
      time: reminderTime,
      startDate: dayKey(now),
      title: t.settings.reminderEventTitle,
      description: t.settings.reminderEventText,
      url: `${location.origin}${location.pathname}`,
      createdAt: now,
    });
    setSaved(await saveTextFile(REMINDER_FILE, text, 'text/calendar'));
  };

  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.settings.title}</h1>

      <section class="panel">
        <h2 class="panel-title">{t.settings.normTitle}</h2>
        <p class="hint-text">{t.settings.normHelp}</p>
        <div class="choice" role="radiogroup" aria-label={t.settings.normTitle}>
          {DAILY_NORMS.map((norm) => (
            <button
              key={norm}
              type="button"
              role="radio"
              aria-checked={norm === dailyNorm}
              class={`button${norm === dailyNorm ? ' button-chosen' : ''}`}
              onClick={() => updateSettings({ dailyNorm: norm })}
            >
              {norm} {plural(norm, t.plural.exercise)}
            </button>
          ))}
        </div>
        <p class="hint-text">{t.settings.normNote}</p>
      </section>

      {isNativeApp() && <RemindersPanel />}

      <section class="panel">
        <h2 class="panel-title">{isNativeApp() ? t.settings.calendarTitle : t.settings.reminderTitle}</h2>
        <p class="hint-text">{isNativeApp() ? t.settings.calendarHelp : t.settings.reminderHelp}</p>
        <label class="field">
          <span>{t.settings.reminderTime}</span>
          <input
            type="time"
            value={reminderTime}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (isReminderTime(value)) {
                updateSettings({ reminderTime: value });
                setSaved(false);
              }
            }}
          />
        </label>
        <button type="button" class="button button-primary" onClick={() => void saveReminder()}>
          {t.settings.reminderButton}
        </button>
        {saved && (
          <p class="verdict verdict-ok" role="status">
            {fmt(t.settings.reminderSaved, { name: REMINDER_FILE })}
          </p>
        )}
        <p class="hint-text">{t.settings.reminderChange}</p>
      </section>

      <section class="panel">
        <h2 class="panel-title">{t.play.title}</h2>
        <label class="toggle">
          <input
            type="checkbox"
            checked={data.settings.shvuChecklist}
            onChange={(event) => updateSettings({ shvuChecklist: event.currentTarget.checked })}
          />
          <span>{t.play.checklistToggle}</span>
        </label>
        <p class="hint-text">{t.play.checklistHelp}</p>
      </section>

      <a class="button button-quiet" href={routeHref({ name: 'more' })}>
        {t.more.back}
      </a>
    </div>
  );
}
