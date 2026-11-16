import { useEffect, useState } from 'preact/hooks';
import { t } from '../../i18n';
import {
  askReminderPermission,
  openExactAlarmSetting,
  reminderStatus,
  syncReminders,
  type ReminderStatus,
} from '../../platform/notifications';
import { updateSettings, useStore } from '../../storage/store';

/** Daily notifications in the installed app. The time is the one of the calendar reminder. */
export function RemindersPanel() {
  const { data } = useStore();
  const on = data.settings.remindersOn;
  const [status, setStatus] = useState<ReminderStatus>();

  const refresh = () =>
    void reminderStatus().then(setStatus, () => setStatus({ permission: 'unavailable', exact: false }));
  useEffect(refresh, []);

  const toggle = async (wanted: boolean) => {
    if (wanted && status?.permission !== 'granted') {
      // Android 13 and later ask here, when the player switches reminders on, never earlier.
      const permission = await askReminderPermission();
      setStatus((current) => ({ exact: current?.exact ?? false, permission }));
      if (permission !== 'granted') return;
    }
    updateSettings({ remindersOn: wanted });
    // The switch may already have been on (an imported file, a permission taken away and
    // given back): then no setting changes, and the reminders must be scheduled all the same.
    void syncReminders(true);
  };

  return (
    <section class="panel">
      <h2 class="panel-title">{t.settings.notificationsTitle}</h2>
      <label class="toggle">
        <input type="checkbox" checked={on && status?.permission === 'granted'} onChange={(event) => void toggle(event.currentTarget.checked)} />
        <span>{t.settings.notificationsToggle}</span>
      </label>
      <p class="hint-text">{t.settings.notificationsHelp}</p>
      {status?.permission === 'denied' && <p class="verdict">{t.settings.notificationsDenied}</p>}
      {on && status?.permission === 'granted' && !status.exact && (
        <>
          <p class="hint-text">{t.settings.notificationsInexact}</p>
          <button
            type="button"
            class="button"
            onClick={() =>
              void openExactAlarmSetting().then(() => {
                refresh();
                void syncReminders(true);
              })
            }
          >
            {t.settings.notificationsExactButton}
          </button>
        </>
      )}
    </section>
  );
}
