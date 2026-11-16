// Daily reminders as local notifications, in the installed app only. No server: the app
// schedules 14 days ahead every time it starts or comes back to the screen, and whenever
// something that changes the plan happens (the time, the switch, the norm met today).
//
// Nothing depends on it. Without the permission, with the switch off, or in the browser, the
// app works the same; the calendar file on the settings screen is the other way to remind.

import type { PlannedReminder } from '../core/reminders';
import { planReminders, staleReminders } from '../core/reminders';
import { dayKey } from '../core/days';
import { t } from '../i18n';
import { getStore, subscribeStore } from '../storage/store';
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
 * Makes the scheduled notifications match the plan. Runs one at a time; a failure is
 * swallowed (and tried again on the next change), because a reminder must never break the
 * app.
 *
 * The whole plan is scheduled again every time, not only what seems to be missing. The
 * plugin's list of pending notifications is its own record, not what Android really holds:
 * after a force stop, after Samsung's battery management, or when "Alarms & reminders" is
 * switched off, Android drops the alarms while the record stays. Scheduling an id again
 * replaces its alarm, so this is safe, and it also applies a changed time or exactness.
 * Only cancelling uses the list: ids that are not wanted any more.
 *
 * Times come from the real clock, not the app's test clock: a notification fires by the
 * device's time.
 */
export function syncReminders(force = false): Promise<void> {
  if (!isNativeApp()) return Promise.resolve();
  syncing = syncing.then(async () => {
    try {
      const now = Date.now();
      const { data } = getStore();
      const { remindersOn, reminderTime } = data.settings;
      const metToday = data.days[dayKey(now)]?.metAt != null;
      const status = remindersOn ? await reminderStatus() : undefined;
      // The permission and the exact-alarm setting are part of the signature: granting
      // either changes what must be scheduled although no setting of the app changed.
      const signature = [remindersOn, reminderTime, metToday, dayKey(now), status?.permission, status?.exact].join('|');
      if (!force && signature === lastSignature) return;
      const notifications = await plugin();
      const plan =
        remindersOn && status?.permission === 'granted'
          ? planReminders(reminderTime, metToday, now, t.reminders.texts.length)
          : [];
      const pending = (await notifications.getPending()).notifications.map((item) => item.id);
      const cancel = staleReminders(plan, pending);
      if (cancel.length > 0) await notifications.cancel({ notifications: cancel.map((id) => ({ id })) });
      if (plan.length > 0) {
        await notifications.schedule({
          notifications: plan.map((item) => ({
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
