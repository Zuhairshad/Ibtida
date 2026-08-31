import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigation/types';
import { useAppState, PrayerName } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import * as PrayerService from '../../services/prayers';
import * as PrayerSettingsService from '../../services/prayerSettings';
import type { PrayerCalcSettings } from '../../services/prayerSettings';
import { classifyPrayersForDate, computePrayerTimes, formatPrayerTime, type PrayerClassification } from '../../lib/prayerTimes';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing } from '../../theme/tokens';
import BottomSheetModal from '../../components/BottomSheetModal';
import PressableScale from '../../components/PressableScale';
import Toggle from '../../components/Toggle';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'PrayerDetail'>;

const LOG_MODES = ['Missed', 'On time', "In jama’ah"];

// This sheet has no date param (route only carries `prayerName`) — it always
// reads/writes today's log, same as AppState's old single "today" snapshot.
const today = PrayerService.todayISODate();
const todayDate = new Date();

export default function PrayerDetailScreen({ route }: Props) {
  const { prayerName } = route.params;
  const { state, setLogMode } = useAppState();
  const { user } = useAuth();
  const name = prayerName as PrayerName;

  const [isLogged, setIsLogged] = useState(false);
  const [adhanOn, setAdhanOn] = useState(true);
  const [marking, setMarking] = useState(false);
  const [adhanBusy, setAdhanBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // Which prayer's data has actually loaded — lets "loading" be derived at
  // render time (`loadedName !== name`) instead of a separate setState called
  // synchronously inside the fetch effect below.
  const [loadedName, setLoadedName] = useState<PrayerName | null>(null);
  const loading = loadedName !== name;

  // Reads the location/calc-method settings PrayerScreen already bootstrapped
  // (a user only ever reaches this sheet by tapping a row there, so a
  // settings row should already exist). If it somehow doesn't yet, this
  // sheet degrades to "time unknown, nothing loggable" rather than prompting
  // for location permission a second time.
  const [calcSettings, setCalcSettings] = useState<PrayerCalcSettings | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    PrayerSettingsService.getPrayerCalcSettings(user.id)
      .then((s) => {
        if (!cancelled) setCalcSettings(s);
      })
      .catch(() => {
        // Non-fatal here — PrayerScreen surfaces the real location error;
        // this sheet just falls back to "Upcoming" (safest — never allows
        // logging a prayer it can't confirm has started).
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const times = useMemo(
    () => (calcSettings ? computePrayerTimes(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab, todayDate) : null),
    [calcSettings]
  );
  const classification: PrayerClassification | null = useMemo(
    () =>
      calcSettings
        ? classifyPrayersForDate(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab, todayDate, new Date())[name]
        : null,
    [calcSettings, name]
  );
  // Fail safe: unknown settings/classification never allows logging — only
  // a confirmed 'current' or 'done' (missed-so-far, i.e. qada) window does.
  const upcoming = classification === null || classification === 'upcoming';

  const timeLabel = times && calcSettings ? formatPrayerTime(times[name.toLowerCase() as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'], calcSettings.timezone) : '—:—';
  const endsAtLabel = (() => {
    if (!times || !calcSettings) return '—:—';
    const order: (keyof typeof times)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const idx = order.indexOf(name.toLowerCase() as keyof typeof times);
    const nextKey = order[idx + 1];
    return nextKey ? formatPrayerTime(times[nextKey], calcSettings.timezone) : formatPrayerTime(times.fajr, calcSettings.timezone);
  })();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([PrayerService.getPrayerLog(user.id, today), PrayerService.getAdhanSettings(user.id)])
      .then(([log, adhan]) => {
        if (cancelled) return;
        setLoadedName(name);
        setIsLogged(!!log[name]);
        setAdhanOn(!!adhan[name]);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadedName(name);
        setToastMsg(e instanceof Error ? e.message : 'Could not load this prayer.');
      });
    return () => {
      cancelled = true;
    };
  }, [user, name]);

  // Status badge reflects this prayer's real time-window state, not a
  // hardcoded "Current".
  const status = isLogged
    ? { label: 'Logged', bg: colors.primaryTint, ink: colors.primaryStrong }
    : classification === 'current'
      ? { label: 'Current', bg: colors.successTint, ink: colors.successStrong }
      : classification === 'done'
        ? { label: 'Missed', bg: colors.dangerTint, ink: colors.danger }
        : { label: 'Upcoming', bg: colors.primaryTint, ink: colors.inkMuted };

  const onMark = async () => {
    if (!user || marking || (upcoming && !isLogged)) return;
    setMarking(true);
    try {
      const next = await PrayerService.togglePrayer(user.id, name, today);
      setIsLogged(next);
      nav.back();
    } catch (e) {
      setToastMsg(e instanceof Error ? e.message : 'Could not update this prayer log.');
    } finally {
      setMarking(false);
    }
  };

  const onToggleAdhan = async () => {
    if (!user || adhanBusy) return;
    const prev = adhanOn;
    setAdhanOn(!prev);
    setAdhanBusy(true);
    try {
      const next = await PrayerService.toggleAdhan(user.id, name);
      setAdhanOn(next);
    } catch (e) {
      setAdhanOn(prev);
      setToastMsg(e instanceof Error ? e.message : 'Could not update adhan notification.');
    } finally {
      setAdhanBusy(false);
    }
  };

  return (
    <BottomSheetModal visible onClose={nav.back}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: '600', color: colors.ink, letterSpacing: -0.02 }}>{name}</Text>
          <Text style={{ fontSize: 14, color: colors.inkMuted, marginTop: 8 }}>
            {timeLabel} · ends {endsAtLabel}
          </Text>
        </View>
        {loading ? (
          <SkeletonBlock width={64} height={30} radius={12} />
        ) : (
          <View style={{ backgroundColor: status.bg, paddingVertical: 8, paddingHorizontal: 11, borderRadius: radii.pill }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: status.ink }}>{status.label}</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
        {LOG_MODES.map((label, i) => {
          const on = state.logMode === i;
          return (
            <PressableScale
              key={label}
              scaleTo={1}
              onPress={() => setLogMode(i)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Log as ${label}`}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: radii.button,
                backgroundColor: on ? colors.primary : colors.card,
                borderWidth: on ? 0 : 1,
                borderColor: colors.cardBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: on ? '600' : '500', color: on ? colors.inkOnPrimary : colors.inkMuted }}>{label}</Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={{ marginTop: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, backgroundColor: colors.card, padding: spacing.standard, ...shadow.card }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary }}>Optional note</Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: colors.inkSecondary, marginTop: 10 }}>
          {isLogged ? 'Prayed at the masjid with Yusuf’s father.' : 'Add a note after you log this prayer.'}
        </Text>
      </View>

      <PressableScale
        onPress={onToggleAdhan}
        disabled={loading || adhanBusy}
        scaleTo={0.99}
        accessibilityRole="switch"
        accessibilityState={{ checked: adhanOn }}
        accessibilityLabel="Adhan notification"
        style={{
          marginTop: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: radii.card,
          backgroundColor: colors.card,
          paddingVertical: 15,
          paddingHorizontal: 16,
          opacity: loading || adhanBusy ? 0.6 : 1,
          ...shadow.card,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '500', color: colors.ink }}>Adhan notification</Text>
        <Toggle on={adhanOn} />
      </PressableScale>

      {/* THE ACTUAL BUG FIX: a prayer whose time window hasn't started yet
          (classification 'upcoming') can't be marked as prayed — a past
          'done'-window or a 'current' prayer still can, including logging a
          missed one late (legitimate qada). */}
      {upcoming && !isLogged && (
        <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 10, textAlign: 'center' }}>{name} hasn’t started yet — check back at {timeLabel}.</Text>
      )}
      <PrimaryButton label={isLogged ? 'Remove log' : 'Mark as prayed'} onPress={onMark} disabled={loading || (upcoming && !isLogged)} loading={marking} style={{ marginTop: 16 }} />
      <SecondaryButton label="Cancel" onPress={nav.back} style={{ marginTop: 2 }} />
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </BottomSheetModal>
  );
}
