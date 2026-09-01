// Wake-alarm-domain wrapper around the shared, generic WakeScanScreen (see
// that file — it deliberately knows nothing about "correct" and just reports
// whatever it scanned). This file supplies the domain logic: compare the
// scanned QR payload against this (user, prayer)'s real token, handle the
// two-stage flow (wudu scan → mat scan), log verification, and schedule /
// cancel follow-up notifications.
//
// Reached by tapping the wake-alarm local notification (App.tsx's
// notification-response handler deep-links here via `nav.wakeScan`, carrying
// the prayer, calendar date, and stage the notification was scheduled for —
// see services/wakeAlarmScheduling.ts's `WakeAlarmNotificationData`) — not
// from anywhere else in the app.
import React, { useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '../../state/AuthContext';
import { getAlarmConfig, logWakeVerification, logWuduScan } from '../../services/wakeAlarm';
import type { PrayerName } from '../../services/prayers';
import { nav } from '../../navigation/navigate';
import {
  cancelWuduFollowUp,
  scheduleMatFollowUp,
  cancelMatFollowUp,
} from '../../services/wakeAlarmScheduling';
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
  /** Which stage of the two-stage verification flow this screen is handling. */
  stage: 'wudu' | 'mat';
  /** Called when the full flow is done (mat stage succeeded). */
  onComplete: () => void;
};

export default function WakeAlarmScanScreen({ prayerName, alarmDate, stage, onComplete }: Props) {
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

      if (stage === 'wudu') {
        if (scannedText.trim() !== config.wuduToken) {
          setToast('Wrong tag — scan the correct one');
          setAttempt((a) => a + 1);
          return;
        }
        await logWuduScan(user.id, prayerName, alarmDate);
        // Cancel the wudu follow-up (the +5min re-alarm), schedule the mat
        // follow-up (10min window to complete the prayer), then navigate to
        // the mat stage. Best-effort for notification ops — verification is
        // already logged, so don't let a notification hiccup surface as an error.
        await cancelWuduFollowUp(prayerName, alarmDate).catch(() => {});
        await scheduleMatFollowUp(prayerName, alarmDate).catch(() => {});
        nav.wakeScan(prayerName, alarmDate, 'mat');
        return;
      }

      // mat stage
      if (scannedText.trim() !== config.verificationToken) {
        setToast('Wrong tag — scan the correct one');
        setAttempt((a) => a + 1);
        return;
      }
      await logWakeVerification(user.id, prayerName, alarmDate, 'two_stage_qr');
      await cancelMatFollowUp(prayerName, alarmDate).catch(() => {});
      // Best-effort: see nativeWakeAlarmId's doc comment.
      stopWakeAlarmRinging(nativeWakeAlarmId(prayerName)).catch(() => {});
      onComplete();
    } catch {
      setToast('Could not verify right now — check your connection and try again.');
      setAttempt((a) => a + 1);
    }
  };

  const stepLabel = stage === 'wudu' ? 'Step 1 of 2 — Wudu' : 'Step 2 of 2 — Prayer';
  const title = stage === 'wudu' ? `Wake check for ${prayerName}` : `Complete your ${prayerName}`;
  const subtitle =
    stage === 'wudu'
      ? 'Go to your washroom and scan the tag on your sink'
      : 'Scan the tag on your prayer mat — you have 10 minutes before the alarm sounds again';

  return (
    <View style={{ flex: 1 }}>
      <WakeScanScreen
        key={attempt}
        stepLabel={stepLabel}
        title={title}
        subtitle={subtitle}
        onVerified={onVerified}
      />
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
