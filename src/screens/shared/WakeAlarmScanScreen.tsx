// Wake-alarm-domain wrapper around the shared, generic WakeScanScreen (see
// that file — it deliberately knows nothing about "correct" and just reports
// whatever it scanned). This file supplies the domain logic the task asked
// for: compare the scanned QR payload against this (user, prayer)'s real
// `verification_token` (services/wakeAlarm.ts), and only on a real match log
// a verified wake and dismiss. A wrong/unrelated QR code (e.g. someone else's
// tag, or a stale/regenerated one) shows an inline error and lets the user
// scan again rather than silently "verifying" on any scan.
//
// Reached by tapping the wake-alarm local notification (App.tsx's
// notification-response handler deep-links here via `nav.wakeScan`, carrying
// the prayer + calendar date the notification itself was scheduled for — see
// services/wakeAlarmScheduling.ts's `WakeAlarmNotificationData`) — not from
// anywhere else in the app.
import React, { useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '../../state/AuthContext';
import { getAlarmConfig, logWakeVerification } from '../../services/wakeAlarm';
import type { PrayerName } from '../../services/prayers';
import { nav } from '../../navigation/navigate';
import Toast from '../../components/Toast';
import WakeScanScreen from './WakeScanScreen';
import { stopWakeAlarmRinging } from '../../../modules/expo-ibadah-native';

/** Stable per-prayer id for the *native* (Android) wake alarm — matches the
 * "reuse across days, no date in the id" convention documented on
 * `scheduleWakeAlarm` in modules/expo-ibadah-native/index.ts. Deliberately
 * distinct from `wakeAlarmScheduling.ts`'s per-day notification identifier
 * (`wake-alarm:${prayerName}:${alarmDate}`) — that's a separate, already-live
 * scheduling path this screen doesn't touch. Calling `stopWakeAlarmRinging`
 * with this id is a safe no-op today (nothing schedules the native alarm
 * yet) and becomes load-bearing the moment something does. */
function nativeWakeAlarmId(prayerName: PrayerName): string {
  return `wake-alarm:${prayerName}`;
}

type Props = {
  prayerName: PrayerName;
  /** YYYY-MM-DD — the calendar day this specific alarm firing was scheduled
   * for (may be in the past if the user opens the notification late; still
   * logged against that date, not "today"). */
  alarmDate: string;
};

export default function WakeAlarmScanScreen({ prayerName, alarmDate }: Props) {
  const { user } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  // Bumped on a failed attempt to remount WakeScanScreen — that component
  // latches its own internal `scanned` flag after the first read and has no
  // "scan again" prop of its own, so a fresh mount is how this screen lets
  // the user retry after a mismatch instead of dead-ending on one bad scan.
  const [attempt, setAttempt] = useState(0);

  const onVerified = async (scannedText: string) => {
    if (!user) return;
    try {
      const config = await getAlarmConfig(user.id, prayerName);
      if (scannedText.trim() !== config.verificationToken) {
        setToast('That tag doesn’t match this prayer’s alarm — scan your printed tag again.');
        setAttempt((a) => a + 1);
        return;
      }
      await logWakeVerification(user.id, prayerName, alarmDate, 'qr_scan');
      // Best-effort: verification already succeeded and is logged above, so
      // don't let a native-side hiccup here turn into a false "couldn't
      // verify" error toast — see nativeWakeAlarmId's doc comment.
      stopWakeAlarmRinging(nativeWakeAlarmId(prayerName)).catch(() => {});
      nav.back();
    } catch {
      setToast('Could not verify right now — check your connection and try again.');
      setAttempt((a) => a + 1);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <WakeScanScreen
        key={attempt}
        title={`Confirm you're awake for ${prayerName}`}
        subtitle="Scan your prayer mat tag to confirm you’re awake."
        onVerified={onVerified}
      />
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
