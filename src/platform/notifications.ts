// Daily reminders as local notifications, in the installed app only. No server: the app
// schedules 14 days ahead every time it starts or comes back to the screen, and whenever
// something that changes the plan happens (the time, the switch, the norm met today).
//
// Nothing depends on it. Without the permission, with the switch off, or in the browser, the
// app works the same; the calendar file on the settings screen is the other way to remind.

import type { PlannedReminder } from '../core/reminders';
import { planReminders, reminderChanges } from '../core/reminders';
import { dayKey } from '../core/days';
import { t } from '../i18n';
import { appNow, getStore, subscribeStore } from '../storage/store';
import { isNativeApp } from './native';

export type ReminderPermission = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface ReminderStatus {
  permission: ReminderPermission;
  /** Android 12 and later: whether the app may use exact alarms. Without them a reminder can come up to an hour late. */
  exact: boolean;
}

async function plugin() {
  return (await import('@capacitor/local-notifications')).LocalNotifications;
}

export async function reminderStatus(): Promise<ReminderStatus> {
  if (!isNativeApp()) return { permission: 'unavailable', exact: false };
  const notifications = await plugin();
  const { display } = await notifications.checkPermissions();
  let exact = false;
  try {
    exact = (await notifications.checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    // Not on Android, or an old Android without the setting: alarms are exact there anyway.
    exact = true;
  }
  const permission: ReminderPermission = display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
  return { permission, exact };
}

/** Asks for the notification permission (Android 13 and later show a dialog). */
export async function askReminderPermission(): Promise<ReminderPermission> {
  if (!isNativeApp()) return 'unavailable';
  const { display } = await (await plugin()).requestPermissions();
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
}

/** Opens the system screen "Alarms & reminders" for this app. */
export async function openExactAlarmSetting(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const status = await (await plugin()).changeExactNotificationSetting();
  return status.exact_alarm === 'granted';
}

function textOf(item: PlannedReminder): { title: string; body: string } {
  const texts = t.reminders.texts;
  const body = texts[item.text % texts.length] ?? texts[0] ?? '';
  return { title: t.reminders.title, body };
}

let syncing: Promise<void> = Promise.resolve();
let lastSignature = '';

/**
 * Makes the scheduled notifications match the plan: cancels what is not wanted, schedules
 * what is missing. Runs one at a time; a failure is swallowed (and tried again on the next
 * change), because a reminder must never break the app.
 */
export function syncReminders(force = false): Promise<void> {
  if (!isNativeApp()) return Promise.resolve();
  syncing = syncing.then(async () => {
    const now = appNow();
    const { data } = getStore();
    const { remindersOn, reminderTime } = data.settings;
    const metToday = data.days[dayKey(now)]?.metAt != null;
    const signature = `${remindersOn}|${reminderTime}|${metToday}|${dayKey(now)}`;
    if (!force && signature === lastSignature) return;
    try {
      const notifications = await plugin();
      const pending = (await notifications.getPending()).notifications;
      const scheduled = pending.map((item) => ({ id: item.id, at: item.schedule?.at ? new Date(item.schedule.at).getTime() : 0 }));
      const status = remindersOn ? await reminderStatus() : undefined;
      const plan =
        remindersOn && status?.permission === 'granted'
          ? planReminders(reminderTime, metToday, now, t.reminders.texts.length)
          : [];
      const { cancel, schedule } = reminderChanges(plan, scheduled);
      if (cancel.length > 0) await notifications.cancel({ notifications: cancel.map((id) => ({ id })) });
      if (schedule.length > 0) {
        await notifications.schedule({
          notifications: schedule.map((item) => ({
            id: item.id,
            ...textOf(item),
            schedule: { at: new Date(item.at), allowWhileIdle: true },
            // Exact only when the user allowed it; never send them to the settings unasked.
            isExactNotification: status?.exact === true,
          })),
        });
      }
      lastSignature = signature;
    } catch {
      lastSignature = '';
    }
  });
  return syncing;
}

/** Keeps the reminders in step with the app: on start, on every change, when the app comes back. */
export function startReminders(): void {
  if (!isNativeApp()) return;
  void syncReminders(true);
  subscribeStore(() => void syncReminders());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncReminders(true);
  });
}
