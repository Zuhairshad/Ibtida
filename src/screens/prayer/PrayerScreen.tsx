import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { useAppState, PrayerName } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import * as PrayerService from '../../services/prayers';
import * as PrayerSettingsService from '../../services/prayerSettings';
import type { PrayerCalcSettings } from '../../services/prayerSettings';
import {
  classifyPrayersForDate,
  computePrayerTimes,
  formatCoordinates,
  formatPrayerTime,
  getPrayerCountdownWindow,
  parseISODateLocal,
  qiblaBearing,
  formatBearing,
  type PrayerSlotName,
} from '../../lib/prayerTimes';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing, type } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import { RowSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import MosqueMotif from '../../components/MosqueMotif';
import { PinIcon, QiblaIcon, PrayerIcon, MoonIcon, SunIcon, ChevronRightIcon, CheckIcon, NavCompassIcon } from '../../theme/icons';

const DATES = ['Sun 24', 'Mon 25', 'Tue 26', 'Wed 27', 'Thu 28', 'Fri 29', 'Sat 30'];

const SLOT_ORDER: PrayerSlotName[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const SLOT_TINT: Record<PrayerSlotName, { ink: string; tint: string }> = {
  Fajr: colors.fajr,
  Sunrise: colors.sunrise,
  Dhuhr: colors.dhuhr,
  Asr: colors.asr,
  Maghrib: colors.maghrib,
  Isha: colors.isha,
};

export default function PrayerScreen() {
  const { state, toggleQibla, pickDate, setSecs } = useAppState();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // DATES is a fixed 7-pill display strip (cosmetic, unchanged); the real
  // ISO date each pill reads/writes is derived from the device's current
  // date so prayer_logs gets a real `log_date` regardless of what the
  // static labels say. Index 6 (rightmost pill) is always "today".
  const dateStrings = useMemo(() => {
    const today = new Date();
    return DATES.map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (DATES.length - 1 - i));
      return PrayerService.toISODate(d);
    });
  }, []);
  const selectedDate = dateStrings[state.dateIdx] ?? PrayerService.todayISODate();
  const selectedDateObj = useMemo(() => parseISODateLocal(selectedDate), [selectedDate]);

  const [logged, setLogged] = useState<Record<PrayerName, boolean> | null>(null);
  // Which date's data `logged` actually reflects — lets "loading" be derived
  // at render time (`loadedDate !== selectedDate`) instead of a separate
  // setState called synchronously inside the fetch effect below.
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const loadingLog = loadedDate !== selectedDate;
  const [busy, setBusy] = useState<Set<PrayerName>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Real location + calculation settings — fetched once per user; if none
  // exist yet, requests foreground location permission and saves the
  // device's current coordinates (see prayerSettings.ts / AGENTS.md scope:
  // foreground/when-in-use only, no background location).
  const [calcSettings, setCalcSettings] = useState<PrayerCalcSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Fetches the saved settings row, or — on first run with none yet —
  // requests foreground location permission, reads the device's current
  // coordinates, and saves them (AGENTS.md scope: foreground/when-in-use
  // only, no background location). Shared by the mount effect below and the
  // error banner's "Enable location" retry button.
  const bootstrapLocation = useCallback(
    async (isCancelled: () => boolean) => {
      if (!user) return;
      setSettingsLoading(true);
      setSettingsError(null);
      try {
        let settings = await PrayerSettingsService.getPrayerCalcSettings(user.id);
        if (!settings) {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (!perm.granted) {
            if (!isCancelled()) {
              setSettingsError('Enable location access so Ibtida can calculate accurate prayer times.');
              setSettingsLoading(false);
            }
            return;
          }
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await PrayerSettingsService.setLocation(user.id, position.coords.latitude, position.coords.longitude, timezone);
          settings = await PrayerSettingsService.getPrayerCalcSettings(user.id);
        }
        if (!isCancelled()) {
          setCalcSettings(settings);
          setSettingsLoading(false);
        }
      } catch (e) {
        if (!isCancelled()) {
          setSettingsError(e instanceof Error ? e.message : 'Could not determine your location.');
          setSettingsLoading(false);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await bootstrapLocation(() => cancelled);
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrapLocation]);

  // Real prayer times + time-window classification for the selected date
  // pill — 'upcoming' means the window hasn't started yet (distinct from
  // `logged`, which is whether the user tapped it as prayed).
  const times = useMemo(
    () => (calcSettings ? computePrayerTimes(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab, selectedDateObj) : null),
    [calcSettings, selectedDateObj]
  );
  const classification = useMemo(
    () =>
      calcSettings
        ? classifyPrayersForDate(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab, selectedDateObj, new Date())
        : null,
    [calcSettings, selectedDateObj]
  );

  // "Next Prayer" card always reflects the real current moment (independent
  // of the selected date pill) — recomputed on every countdown tick.
  const countdown = useMemo(
    () => (calcSettings ? getPrayerCountdownWindow(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcSettings, state.secs]
  );

  // Seed/resync AppState's countdown ticker with the real seconds-until-
  // next-prayer: once when settings first resolve, and again every time the
  // ticker reaches 0 (a prayer boundary just passed).
  useEffect(() => {
    if (!calcSettings) return;
    if (state.secs !== 0) return;
    const window = getPrayerCountdownWindow(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab);
    setSecs(window.secondsRemaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcSettings, state.secs]);
  useEffect(() => {
    if (!calcSettings) return;
    const window = getPrayerCountdownWindow(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab);
    setSecs(window.secondsRemaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcSettings]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    PrayerService.getPrayerLog(user.id, selectedDate)
      .then((result) => {
        if (cancelled) return;
        setLoadedDate(selectedDate);
        setLogged(result);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadedDate(selectedDate);
        setLogged((l) => l ?? PrayerService.emptyPrayerRecord(false));
        setToastMsg(e instanceof Error ? e.message : 'Could not load your prayer log.');
      });
    return () => {
      cancelled = true;
    };
  }, [user, selectedDate]);

  const handleToggle = useCallback(
    async (name: PrayerName) => {
      if (!user || busy.has(name)) return;
      // THE ACTUAL BUG FIX: a prayer whose time window hasn't started yet
      // can never be logged (in either direction) — only 'current' and
      // 'done' (missed-so-far, i.e. legitimate qada) windows are toggleable.
      if (classification?.[name] === 'upcoming') return;
      const prevVal = logged?.[name] ?? false;
      setLogged((l) => (l ? { ...l, [name]: !prevVal } : l));
      setBusy((b) => new Set(b).add(name));
      try {
        const next = await PrayerService.togglePrayer(user.id, name, selectedDate);
        setLogged((l) => (l ? { ...l, [name]: next } : l));
      } catch (e) {
        setLogged((l) => (l ? { ...l, [name]: prevVal } : l));
        setToastMsg(e instanceof Error ? e.message : 'Could not update this prayer log.');
      } finally {
        setBusy((b) => {
          const n = new Set(b);
          n.delete(name);
          return n;
        });
      }
    },
    [user, busy, logged, selectedDate, classification]
  );

  const locationLabel = calcSettings ? formatCoordinates(calcSettings.latitude, calcSettings.longitude) : settingsLoading ? 'Locating…' : 'Location unavailable';
  const bearing = calcSettings ? qiblaBearing(calcSettings.latitude, calcSettings.longitude) : null;
  const nextRingProgress = countdown ? 1 - countdown.secondsRemaining / countdown.totalSeconds : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.standard, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn
          style={{
            marginHorizontal: spacing.lg,
            borderRadius: radii.cardLarge,
            backgroundColor: colors.primaryTint,
            ...shadow.card,
          }}
        >
          <View style={{ padding: spacing.lg, borderRadius: radii.cardLarge, backgroundColor: colors.primaryTint, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
            <View style={{ position: 'absolute', right: -34, bottom: -26 }}>
              <MosqueMotif width={190} height={122} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ ...type.h1, color: colors.ink }}>Prayers</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
                <PinIcon />
                <Text style={{ ...type.caption, color: colors.inkSecondary }}>{locationLabel}</Text>
              </View>
            </View>
            <PressableScale
              onPress={toggleQibla}
              style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.pill, backgroundColor: colors.card, minHeight: 44, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <QiblaIcon />
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.primary }}>Qibla</Text>
            </PressableScale>
          </View>
        </RiseIn>

        <RiseIn delay={50} style={{ marginTop: spacing.standard }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            {DATES.map((d, i) => {
              const [dow, num] = d.split(' ');
              const on = state.dateIdx === i;
              return (
                <PressableScale
                  key={d}
                  onPress={() => pickDate(i)}
                  style={{ width: 50, borderWidth: 1, borderColor: on ? colors.primary : colors.cardBorder, borderRadius: radii.button, paddingVertical: spacing.sm, backgroundColor: on ? colors.primary : colors.card, alignItems: 'center', gap: spacing.xs }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '500', color: on ? colors.inkOnPrimary : colors.inkSecondary }}>{dow}</Text>
                  <Text style={{ ...type.h3, fontWeight: '700', color: on ? colors.inkOnPrimary : colors.ink }}>{num}</Text>
                  {i === 3 && <View style={{ width: 4, height: 4, borderRadius: radii.pill, backgroundColor: on ? colors.inkOnPrimary : colors.primary }} />}
                </PressableScale>
              );
            })}
          </ScrollView>
        </RiseIn>

        {state.qiblaOpen && (
          <RiseIn style={{ paddingHorizontal: spacing.lg, marginTop: spacing.standard }}>
            <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, ...shadow.card }}>
              <View style={{ width: 104, height: 104, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', width: 104, height: 104, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.primaryTint }} />
                <NavCompassIcon size={104} angleDeg={bearing ?? -34} />
                <Text style={{ position: 'absolute', top: 3, fontSize: 10, fontWeight: '700', color: colors.inkSecondary }}>N</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.bodyStrong, color: colors.ink }}>Qibla direction</Text>
                <Text style={{ fontSize: 26, fontWeight: '700', color: colors.primary, marginTop: 10 }}>{bearing != null ? formatBearing(bearing) : '—'}</Text>
                <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: spacing.sm, lineHeight: 17 }}>From {locationLabel}. Hold the phone flat and turn until the needle points north.</Text>
                <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 8, lineHeight: 15 }}>Compass unavailable in preview — bearing shown from your saved location.</Text>
              </View>
            </View>
          </RiseIn>
        )}

        <RiseIn delay={100} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.standard }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.cardLarge, padding: spacing.lg, backgroundColor: colors.primaryTint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, ...shadow.card }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.card, borderRadius: radii.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, alignSelf: 'flex-start' }}>
                <View style={{ width: 6, height: 6, borderRadius: radii.pill, backgroundColor: colors.primary }} />
                <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.08, textTransform: 'uppercase', color: colors.primary }}>Next Prayer</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 14 }}>
                <Text style={{ ...type.display, color: colors.ink }}>{countdown?.name ?? '—'}</Text>
                <Text style={{ fontSize: 17, fontWeight: '500', color: colors.inkSecondary }}>{countdown && calcSettings ? formatPrayerTime(countdown.end, calcSettings.timezone) : '—'}</Text>
              </View>
              <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 10 }}>
                {Math.floor(state.secs / 60)}m {String(state.secs % 60).padStart(2, '0')}s remaining
              </Text>
              <View style={{ height: 5, borderRadius: radii.pill, backgroundColor: colors.card, marginTop: spacing.md, width: 148, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.round(Math.max(0, Math.min(1, nextRingProgress)) * 100)}%`, borderRadius: radii.pill, backgroundColor: colors.primary }} />
              </View>
            </View>
            <ProgressRing size={80} strokeWidth={6} progress={nextRingProgress} trackColor={colors.card} color={colors.primary}>
              <Text style={{ ...type.bodyStrong, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>
                {String(Math.floor(state.secs / 60)).padStart(2, '0')}:{String(state.secs % 60).padStart(2, '0')}
                {'\n'}
                <Text style={{ fontSize: 9.5, fontWeight: '500', color: colors.inkSecondary }}>Remaining</Text>
              </Text>
            </ProgressRing>
          </View>
        </RiseIn>

        <RiseIn delay={150} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.standard }}>
          {loadingLog || !logged || settingsLoading ? (
            <RowSkeleton rows={6} />
          ) : settingsError && !calcSettings ? (
            <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, gap: spacing.md, ...shadow.card }}>
              <Text style={{ fontSize: 14, color: colors.inkSecondary, lineHeight: 20 }}>{settingsError}</Text>
              <PressableScale onPress={() => bootstrapLocation(() => false)} style={{ minHeight: 44, borderRadius: radii.button, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ ...type.captionStrong, color: colors.inkOnPrimary }}>Enable location</Text>
              </PressableScale>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {SLOT_ORDER.map((slotName) => {
                const sunrise = slotName === 'Sunrise';
                const state_ = classification?.[slotName] ?? 'upcoming';
                const current = state_ === 'current';
                const upcoming = state_ === 'upcoming';
                const done = !sunrise && !!logged[slotName as PrayerName];
                const isBusy = !sunrise && busy.has(slotName as PrayerName);
                const timeLabel = times && calcSettings ? formatPrayerTime(times[slotName.toLowerCase() as keyof typeof times], calcSettings.timezone) : '—:—';
                const note = sunrise
                  ? 'Not a prayer time'
                  : done
                    ? 'Logged'
                    : current
                      ? 'Current · in progress'
                      : state_ === 'done'
                        ? 'Missed · not logged'
                        : 'Upcoming · adhan on';
                const noteInk = current ? colors.successStrong : !sunrise && !done && state_ === 'done' ? colors.danger : colors.inkSecondary;
                const Icon = sunrise ? SunIcon : slotName === 'Isha' || slotName === 'Maghrib' ? MoonIcon : PrayerIcon;
                const tint = SLOT_TINT[slotName];
                return (
                  <PressableScale
                    key={slotName}
                    onPress={sunrise ? undefined : () => nav.prayerDetail(slotName)}
                    disabled={sunrise}
                    scaleTo={0.985}
                    style={{
                      borderWidth: 1,
                      borderColor: current ? colors.success : colors.cardBorder,
                      borderRadius: radii.card,
                      paddingVertical: spacing.standard,
                      paddingHorizontal: spacing.standard,
                      backgroundColor: current ? colors.successTint : colors.card,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      minHeight: 48,
                      opacity: isBusy ? 0.6 : 1,
                      ...shadow.card,
                    }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: radii.button, backgroundColor: current ? colors.successTint : tint.tint, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={19} color={current ? colors.success : tint.ink} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ ...type.h3, color: colors.ink }}>{slotName}</Text>
                      <Text style={{ fontSize: 12.5, color: noteInk, marginTop: 4 }}>{note}</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: colors.ink }}>{timeLabel}</Text>
                    {!sunrise &&
                      (done ? (
                        <PressableScale
                          onPress={() => handleToggle(slotName as PrayerName)}
                          disabled={isBusy}
                          style={{ width: 44, height: 44, borderRadius: radii.button, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <CheckIcon size={16} />
                        </PressableScale>
                      ) : upcoming ? (
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: radii.button,
                            borderWidth: 1.5,
                            borderColor: colors.inkMuted,
                            borderStyle: 'dashed',
                            backgroundColor: colors.card,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.55,
                          }}
                        >
                          <Text style={{ ...type.h3, color: colors.inkMuted }}>–</Text>
                        </View>
                      ) : (
                        <PressableScale
                          onPress={() => handleToggle(slotName as PrayerName)}
                          disabled={isBusy}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: radii.button,
                            borderWidth: 1.5,
                            borderColor: colors.inkMuted,
                            borderStyle: 'dashed',
                            backgroundColor: colors.card,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 1,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkSecondary }}>Log</Text>
                        </PressableScale>
                      ))}
                  </PressableScale>
                );
              })}
            </View>
          )}
        </RiseIn>

        <RiseIn delay={200} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.standard }}>
          <PressableScale
            onPress={nav.progress}
            scaleTo={0.985}
            style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.standard, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, ...shadow.card }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>Qada & missed prayers</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={{ backgroundColor: colors.dangerTint, borderRadius: radii.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }}>
                <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.danger }}>4 outstanding</Text>
              </View>
              <ChevronRightIcon />
            </View>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={250} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <View style={{ borderRadius: radii.card, padding: spacing.standard, backgroundColor: colors.primaryTint }}>
            <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkSecondary }}>
              Times are calculated on device ({calcSettings?.calculationMethod ?? 'Muslim World League'} · {calcSettings?.madhab ?? 'Shafi'}). Missed prayers move to Qada after midnight rather than
              disappearing.
            </Text>
          </View>
        </RiseIn>
      </ScrollView>
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </View>
  );
}
