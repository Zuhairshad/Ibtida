// Wake-verified prayer alarm — the notification-based fallback that actually
// makes an alarm sound today, on both platforms, before either native agent's
// AlarmManager (Android) / real alarm mechanism (iOS, which doesn't have one
// for third-party apps — see the platform note below) lands in
// modules/expo-ibadah-native. This file owns *scheduling only*; the
// enabled/verification_token config it reads lives in
// src/services/wakeAlarm.ts, and the actual wake-time UI is
// src/screens/shared/WakeScanScreen.tsx (deep-linked to from App.tsx when the
// user taps one of these notifications).
//
// ---------------------------------------------------------------------------
// THE REAL LIMITATION (read before changing the scheduling strategy below):
// ---------------------------------------------------------------------------
// iOS has no API that lets a third-party app schedule a *ringtone-style*
// alarm that loops indefinitely in the background past a single local
// notification — that capability is reserved for Apple's own Clock app and,
// for other narrow health/safety cases, the separately-gated Critical Alerts
// entitlement (out of scope, per task instructions: it's an Apple approval
// process, not something buildable here, and misusing it is a common app
// rejection reason). What we *can* do, and what this file does, is schedule a
// real local notification at the user's actual computed Fajr/Dhuhr/etc. time,
// with sound + (on a build that also sets `NSSupportsTimeSensitiveNotifications`
// in Info.plist, an app.json-level change out of this file's scope — see the
// report) `interruptionLevel: 'timeSensitive'` so it has the best chance of
// breaking through Focus modes and Do Not Disturb. It rings once as a normal
// notification sound (not a looping alarm), and tapping it is how the user
// gets to the QR-scan confirmation screen. This is a strong reminder with a
// verification step, not a literal unstoppable alarm clock — see
// WakeAlarmSettingsScreen's copy, which says exactly this to the user.
//
// ---------------------------------------------------------------------------
// WHY A ROLLING WINDOW OF ONE-SHOT NOTIFICATIONS, NOT expo-notifications'
// own `daily` trigger type:
// ---------------------------------------------------------------------------
// `SchedulableTriggerInputTypes.DAILY` fires at a fixed hour:minute forever,
// but real Fajr (and every other prayer) time drifts by roughly 1-3 minutes
// a day and much more across the seasons — a fixed daily trigger would be
// several minutes wrong within a couple of weeks. Instead we schedule one
// precise `DATE` trigger per upcoming day, each computed for real via
// src/lib/prayerTimes.ts (adhan-js). Apple documents a hard cap of 64 pending
// local notifications per app (UNUserNotificationCenter only keeps the
// soonest 64) — see
// https://developer.apple.com/documentation/usernotifications/unusernotificationcenter —
// so `WAKE_ALARM_SCHEDULE_DAYS` below is kept modest (10 days) and multiplied
// by at most 5 enabled prayers = 50, comfortably under that ceiling. The
// window needs periodic topping-up as days consume themselves off the front
// — call `syncAllWakeAlarmSchedules` again on every app foreground/launch
// (wired in App.tsx) so a user who opens the app at least once every ~10 days
// never runs dry. A user who never reopens the app for 10+ days stops
// getting notified until they do — an inherent tradeoff of "no server, no
// push token" local-only scheduling, worth knowing about but not solvable
// without a backend push component (out of scope here).
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { getAlarmConfig, getAllAlarmConfigs } from './wakeAlarm';
import { getPrayerCalcSettings } from './prayerSettings';
import { computePrayerTimes, type PrayerTimesOfDay } from '../lib/prayerTimes';
import { PRAYER_NAMES, toISODate, type PrayerName } from './prayers';

/** How many upcoming days to keep one precise notification scheduled for, per
 * enabled prayer. Kept well under iOS's ~64-pending-notification ceiling —
 * see the file header. */
export const WAKE_ALARM_SCHEDULE_DAYS = 10;

const ANDROID_CHANNEL_ID = 'wake-alarm';

/** Carried in the notification's `data` payload so App.tsx's response
 * listener knows which prayer/day to open WakeScanScreen against, without
 * having to re-derive "today's" prayer from scratch (the user may tap the
 * notification well after it fired). */
export type WakeAlarmNotificationData = {
  kind: 'wake-alarm';
  prayerName: PrayerName;
  alarmDate: string; // YYYY-MM-DD, see services/prayers.ts's toISODate
};

export function isWakeAlarmNotificationData(data: unknown): data is WakeAlarmNotificationData {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as Record<string, unknown>).kind === 'wake-alarm' &&
    typeof (data as Record<string, unknown>).prayerName === 'string' &&
    typeof (data as Record<string, unknown>).alarmDate === 'string'
  );
}

function notificationIdFor(prayerName: PrayerName, alarmDate: string): string {
  return `wake-alarm:${prayerName}:${alarmDate}`;
}

/** Same per-slot lookup as the private `salahTime` helper in
 * src/lib/prayerTimes.ts — not exported from there, so duplicated here
 * rather than widening that module's public surface for one internal use. */
function salahTimeFor(times: PrayerTimesOfDay, prayerName: PrayerName): Date {
  switch (prayerName) {
    case 'Fajr':
      return times.fajr;
    case 'Dhuhr':
      return times.dhuhr;
    case 'Asr':
      return times.asr;
    case 'Maghrib':
      return times.maghrib;
    case 'Isha':
      return times.isha;
  }
}

/** Sets the foreground notification presentation (this app wants the alert
 * + sound to show even while it's open, e.g. mid-Quran-reading right before
 * Fajr) and, on Android, creates the high-importance channel these
 * notifications post to. Call once, near app startup (see App.tsx) — safe to
 * call more than once. */
export function configureWakeAlarmNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Wake-verification alarm',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    }).catch(() => {
      // Best-effort — a failed channel create just means these notifications
      // fall back to the app's default channel/importance instead.
    });
  }
}

/** Read-only permission check — does not prompt. Use this to render current
 * status in settings UI without surprising the user with a system dialog. */
export async function getWakeAlarmNotificationPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  const current = await Notifications.getPermissionsAsync();
  return { granted: current.granted, canAskAgain: current.canAskAgain };
}

/** Prompts for notification permission if not already resolved. Returns
 * whether we can actually schedule anything. */
export async function requestWakeAlarmNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

async function cancelPendingFor(prayerName: PrayerName): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `wake-alarm:${prayerName}:`;
  const toCancel = scheduled.filter((n) => n.identifier.startsWith(prefix));
  await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/** Cancels every pending notification for one prayer — call when the user
 * turns wake-verification off for it. Safe to call when nothing is
 * scheduled. */
export async function cancelWakeAlarmSchedule(prayerName: PrayerName): Promise<void> {
  await cancelPendingFor(prayerName);
}

export type WakeAlarmSyncResult = 'scheduled' | 'disabled' | 'no-location' | 'permission-denied';

/** The main entry point: re-reads this prayer's alarm config + the user's
 * saved location, clears any previously scheduled notifications for it
 * (idempotent — safe to call repeatedly, e.g. after every toggle and again
 * on every app foreground), and if enabled schedules a fresh rolling window
 * of `WAKE_ALARM_SCHEDULE_DAYS` precise one-shot notifications. Returns which
 * of those things happened so the calling screen can show the right toast
 * (e.g. "Enable notifications in Settings to use this"). */
export async function syncWakeAlarmSchedule(userId: string, prayerName: PrayerName): Promise<WakeAlarmSyncResult> {
  await cancelPendingFor(prayerName);

  const config = await getAlarmConfig(userId, prayerName);
  if (!config.enabled) return 'disabled';

  const calc = await getPrayerCalcSettings(userId);
  if (!calc) return 'no-location';

  const granted = await requestWakeAlarmNotificationPermission();
  if (!granted) return 'permission-denied';

  const now = new Date();
  for (let offset = 0; offset < WAKE_ALARM_SCHEDULE_DAYS; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const times = computePrayerTimes(calc.latitude, calc.longitude, calc.calculationMethod, calc.madhab, day);
    const at = salahTimeFor(times, prayerName);
    if (at.getTime() <= now.getTime()) continue; // today's own time already passed — tomorrow's (offset 1) covers it

    const alarmDate = toISODate(day);
    const data: WakeAlarmNotificationData = { kind: 'wake-alarm', prayerName, alarmDate };

    // Sequential (not Promise.all) — each call schedules one distinct
    // notification; sequential keeps this readable and the total count
    // (<=10) is too small for the serialization to matter.
    await Notifications.scheduleNotificationAsync({
      identifier: notificationIdFor(prayerName, alarmDate),
      content: {
        title: `Time to wake for ${prayerName}`,
        body: 'Tap this, then scan your prayer mat tag to confirm you’re actually up.',
        sound: 'default', // no custom alarm-style sound asset bundled yet — see report
        interruptionLevel: 'timeSensitive',
        data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }

  return 'scheduled';
}

/** Re-syncs every enabled prayer's schedule in one call — what App.tsx should
 * call on launch and on every foreground transition to keep the rolling
 * window topped up (see the file header's note on why this needs
 * re-running periodically, not just once at setup). Silently skips prayers
 * with no config row yet rather than creating one — `getAllAlarmConfigs`
 * lazily creates rows for all 5 anyway, so in practice every prayer has a
 * (likely disabled) row by the time this is called from an authenticated
 * screen. */
export async function syncAllWakeAlarmSchedules(userId: string): Promise<void> {
  const configs = await getAllAlarmConfigs(userId);
  await Promise.all(
    PRAYER_NAMES.map((name) => (configs[name].enabled ? syncWakeAlarmSchedule(userId, name) : cancelWakeAlarmSchedule(name)))
  );
}
