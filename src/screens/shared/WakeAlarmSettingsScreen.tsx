import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/AuthContext';
import { getAllAlarmConfigs, setAlarmEnabled, type PrayerAlarmConfig } from '../../services/wakeAlarm';
import { syncWakeAlarmSchedule, WAKE_ALARM_SCHEDULE_DAYS } from '../../services/wakeAlarmScheduling';
import { PRAYER_NAMES, type PrayerName } from '../../services/prayers';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import Toggle from '../../components/Toggle';
import EmptyState from '../../components/EmptyState';
import { RowSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { ChevronLeftIcon, ChevronRightIcon, BellIcon, WarningIcon } from '../../theme/icons';

type LoadState = 'loading' | 'error' | 'ready';

const PRAYER_TINTS: Record<PrayerName, { ink: string; tint: string }> = {
  Fajr: colors.fajr,
  Dhuhr: colors.dhuhr,
  Asr: colors.asr,
  Maghrib: colors.maghrib,
  Isha: colors.isha,
};

// Task item 3/4 — the settings surface for the wake-verified alarm: toggle
// per prayer, jump to that prayer's printable QR tag, and — the important
// part — copy that tells the truth about what this alarm actually is (see
// LIMITATION_COPY below and src/services/wakeAlarmScheduling.ts's file
// header for the full platform reasoning).
const LIMITATION_COPY =
  'This rings once, as a real alert with sound — not a looping alarm. Neither iOS nor Android lets an ordinary app take over the phone like a dedicated alarm clock. Tap the alert, then scan your tag to confirm you’re actually up.';

export default function WakeAlarmSettingsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [configs, setConfigs] = useState<Record<PrayerName, PrayerAlarmConfig> | null>(null);
  // Per-prayer busy flag — disables just that row's toggle while its own
  // enable/disable + reschedule round-trip is in flight, not the whole list.
  const [busyPrayer, setBusyPrayer] = useState<PrayerName | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAllAlarmConfigs(user.id)
      .then((result) => {
        if (!cancelled) {
          setConfigs(result);
          setLoading(false);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    setReloadKey((k) => k + 1);
  }, []);

  const loadState: LoadState = loading ? 'loading' : error ? 'error' : 'ready';

  const onToggle = async (prayerName: PrayerName) => {
    if (!user || !configs || busyPrayer) return;
    const previous = configs[prayerName];
    const next = !previous.enabled;

    // Optimistic flip so the row feels instant; reverted below on failure.
    setConfigs({ ...configs, [prayerName]: { ...previous, enabled: next } });
    setBusyPrayer(prayerName);
    try {
      await setAlarmEnabled(user.id, prayerName, next);
      const result = await syncWakeAlarmSchedule(user.id, prayerName);
      if (result === 'permission-denied') {
        setToast('Notifications are off for Ibadah — enable them in your phone’s Settings app to use this alarm.');
      } else if (result === 'no-location') {
        setToast('Set your prayer location first (Privacy → Location & calculation method), then turn this back on.');
      } else if (result === 'scheduled') {
        setToast(`${prayerName} wake alert scheduled for the next ${WAKE_ALARM_SCHEDULE_DAYS} days.`);
      }
    } catch (e) {
      setConfigs((c) => (c ? { ...c, [prayerName]: previous } : c));
      setToast(e instanceof Error ? e.message : `Couldn’t update ${prayerName}. Try again.`);
    } finally {
      setBusyPrayer(null);
    }
  };

  return (
    <ScreenFade duration={300} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <PressableScale onPress={nav.back} scaleTo={1} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 }}>
          <ChevronLeftIcon color={colors.inkMuted} />
        </PressableScale>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>Wake-verification alarm</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13.5, lineHeight: 20.5, color: colors.inkMuted }}>{LIMITATION_COPY}</Text>

        {loadState === 'loading' ? (
          <View style={{ marginTop: 22 }}>
            <RowSkeleton rows={5} />
          </View>
        ) : loadState === 'error' || !configs ? (
          <View style={{ marginTop: 22 }}>
            <EmptyState
              icon={<WarningIcon size={22} color={colors.inkMuted} />}
              title="Couldn’t load your alarms"
              subtitle="Check your connection and try again."
              actionLabel="Retry"
              onAction={load}
            />
          </View>
        ) : (
          <>
            <View style={{ marginTop: 20, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, backgroundColor: colors.card, ...shadow.card }}>
              {PRAYER_NAMES.map((name, i) => {
                const config = configs[name];
                const tint = PRAYER_TINTS[name];
                const isBusy = busyPrayer === name;
                return (
                  <View
                    key={name}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 18,
                      borderBottomWidth: i === PRAYER_NAMES.length - 1 ? 0 : 1,
                      borderColor: colors.divider,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 13,
                      minHeight: 60,
                    }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: radii.control, backgroundColor: tint.tint, alignItems: 'center', justifyContent: 'center' }}>
                      <BellIcon size={16} color={tint.ink} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{name}</Text>
                      <PressableScale
                        onPress={() => nav.prayerMatTag(name)}
                        scaleTo={1}
                        accessibilityRole="button"
                        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: 'flex-start' }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary }}>View my tag</Text>
                        <ChevronRightIcon size={12} color={colors.primary} />
                      </PressableScale>
                    </View>
                    <Toggle on={config.enabled} disabled={isBusy} />
                    <PressableScale
                      onPress={() => onToggle(name)}
                      disabled={isBusy}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: config.enabled, disabled: isBusy }}
                      accessibilityLabel={`${name} wake-verification alarm`}
                      style={{ position: 'absolute', inset: 0 }}
                    />
                  </View>
                );
              })}
            </View>

            <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 12, lineHeight: 18 }}>
              {Object.values(configs).filter((c) => c.enabled).length} of {PRAYER_NAMES.length} prayers on. Each prints its own QR tag —
              scanning the wrong prayer’s tag won’t confirm a different one.
            </Text>
          </>
        )}
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
