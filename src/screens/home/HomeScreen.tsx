import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { useAppState, PrayerName } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import * as PrayerService from '../../services/prayers';
import * as PrayerSettingsService from '../../services/prayerSettings';
import type { PrayerCalcSettings } from '../../services/prayerSettings';
import { classifyPrayersForDate, computePrayerTimes, formatCoordinates, formatPrayerTime, getPrayerCountdownWindow } from '../../lib/prayerTimes';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing, type } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import { HomeSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import StreakDotRow from '../../components/StreakDotRow';
import BarChart from '../../components/BarChart';
import MosqueMotif from '../../components/MosqueMotif';
import { BellIcon, PinIcon, ArrowRightIcon, SunriseIcon, SunIcon, DuskIcon, SundownIcon, MoonIcon, CheckIcon, SearchIcon, BookIcon, TimerIcon } from '../../theme/icons';

const TILE_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Fajr: SunriseIcon,
  Dhuhr: SunIcon,
  Asr: DuskIcon,
  Maghrib: SundownIcon,
  Isha: MoonIcon,
};

const STREAK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const TODAY = PrayerService.todayISODate();
const TODAY_DATE = new Date();

export default function HomeScreen() {
  const { state, setSecs } = useAppState();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [logged, setLogged] = useState<Record<PrayerName, boolean> | null>(null);
  const [busy, setBusy] = useState<Set<PrayerName>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Real location + calculation settings — same get-or-request-permission
  // bootstrap as PrayerScreen (both are independent entry points into the
  // app, so both fetch/create the settings row rather than assuming the
  // other has already run).
  const [calcSettings, setCalcSettings] = useState<PrayerCalcSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setSettingsLoading(true);
      try {
        let settings = await PrayerSettingsService.getPrayerCalcSettings(user.id);
        if (!settings) {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (!perm.granted) {
            if (!cancelled) setSettingsLoading(false);
            return;
          }
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await PrayerSettingsService.setLocation(user.id, position.coords.latitude, position.coords.longitude, timezone);
          settings = await PrayerSettingsService.getPrayerCalcSettings(user.id);
        }
        if (!cancelled) {
          setCalcSettings(settings);
          setSettingsLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setSettingsLoading(false);
          setToastMsg(e instanceof Error ? e.message : 'Could not determine your location.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const times = useMemo(
    () => (calcSettings ? computePrayerTimes(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab, TODAY_DATE) : null),
    [calcSettings]
  );
  const classification = useMemo(
    () =>
      calcSettings
        ? classifyPrayersForDate(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab, TODAY_DATE, new Date())
        : null,
    [calcSettings]
  );
  const countdown = useMemo(
    () => (calcSettings ? getPrayerCountdownWindow(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcSettings, state.secs]
  );

  // Seed/resync AppState's countdown ticker with the real seconds-until-
  // next-prayer, same as PrayerScreen — harmless if both screens are mounted
  // at once (bottom-tabs keeps inactive tabs alive), since both compute the
  // same real value from the same saved settings.
  useEffect(() => {
    if (!calcSettings) return;
    const window = getPrayerCountdownWindow(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab);
    setSecs(window.secondsRemaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcSettings]);
  useEffect(() => {
    if (!calcSettings || state.secs !== 0) return;
    const window = getPrayerCountdownWindow(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab);
    setSecs(window.secondsRemaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcSettings, state.secs]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    PrayerService.getPrayerLog(user.id, TODAY)
      .then((result) => {
        if (!cancelled) setLogged(result);
      })
      .catch((e) => {
        if (cancelled) return;
        setLogged((l) => l ?? PrayerService.emptyPrayerRecord(false));
        setToastMsg(e instanceof Error ? e.message : 'Could not load today’s prayers.');
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleTilePress = useCallback(
    async (name: PrayerName) => {
      if (!user || busy.has(name)) return;
      // THE ACTUAL BUG FIX: a prayer whose time window hasn't started yet
      // can't be tapped done from the Home tiles either — only Sunrise used
      // to be excluded here, which let e.g. Maghrib be marked "done" hours
      // before it starts.
      if (classification?.[name] === 'upcoming') return;
      const prevVal = logged?.[name] ?? false;
      setLogged((l) => (l ? { ...l, [name]: !prevVal } : l));
      setBusy((b) => new Set(b).add(name));
      try {
        const next = await PrayerService.togglePrayer(user.id, name, TODAY);
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
    [user, busy, logged, classification]
  );

  const dailyPrayers = PrayerService.PRAYER_NAMES;
  const doneCount = logged ? dailyPrayers.filter((p) => logged[p]).length : 0;
  const dayPct = Math.round((doneCount / 5) * 100);
  const impactText = state.impact.toLocaleString('en-US');
  const locationLabel = calcSettings ? formatCoordinates(calcSettings.latitude, calcSettings.longitude) : settingsLoading ? 'Locating…' : 'Location unavailable';
  const nextRingProgress = countdown ? Math.max(0, Math.min(1, 1 - countdown.secondsRemaining / countdown.totalSeconds)) : 0;

  if (state.booting || !logged) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <HomeSkeleton />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.standard, paddingBottom: spacing.xxl }} showsVerticalScrollIndicator={false}>
        {/* Greeting header */}
        <RiseIn style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 }}>
            <PressableScale onPress={nav.profile} style={{ width: 46, height: 46, borderRadius: radii.pill, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...type.captionStrong, color: colors.primaryStrong }}>UA</Text>
            </PressableScale>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ ...type.h3, color: colors.ink }} numberOfLines={1}>
                Assalam-o-Alaikum {'\u{1F44B}'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
                <PinIcon />
                <Text style={{ fontSize: 12.5, color: colors.inkSecondary }}>{locationLabel}</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <PressableScale
              onPress={nav.search}
              accessibilityRole="button"
              accessibilityLabel="Search"
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
            >
              <SearchIcon size={19} color={colors.inkSecondary} />
            </PressableScale>
            <PressableScale
              onPress={nav.notifications}
              accessibilityRole="button"
              accessibilityLabel="Notifications, unread"
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
            >
              <BellIcon />
              <View style={{ position: 'absolute', top: 2, right: 3, width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.card }} />
            </PressableScale>
          </View>
        </RiseIn>

        {/* Hadith quote card */}
        <RiseIn delay={50} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <View style={{ borderRadius: radii.cardLarge, backgroundColor: colors.primaryTint, ...shadow.card }}>
            <View style={{ borderRadius: radii.cardLarge, overflow: 'hidden', backgroundColor: colors.primaryTint }}>
              <View style={{ position: 'absolute', right: -22, bottom: -8 }}>
                <MosqueMotif width={220} height={142} />
              </View>
              <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
              <Svg width={22} height={18} viewBox="0 0 22 18">
                <Path
                  d="M8.4 1.5C4.6 3 2 6 2 9.8c0 3.4 2 5.7 4.8 5.7 2.4 0 4.2-1.7 4.2-4 0-2.2-1.5-3.8-3.6-3.8-.4 0-.8 0-1 .1.5-2 2-3.6 4-4.6zM20.4 1.5C16.6 3 14 6 14 9.8c0 3.4 2 5.7 4.8 5.7 2.4 0 4.2-1.7 4.2-4 0-2.2-1.5-3.8-3.6-3.8-.4 0-.8 0-1 .1.5-2 2-3.6 4-4.6z"
                  fill={colors.primary}
                  opacity={0.3}
                />
              </Svg>
              <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', fontSize: 19, lineHeight: 38, color: colors.primaryStrong, textAlign: 'center', marginTop: spacing.md, writingDirection: 'rtl' }}>
                مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 22, color: colors.ink, textAlign: 'center', marginTop: spacing.standard }}>
                The Prophet <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', color: colors.primaryStrong }}>{'ﷺ'}</Text> said: “Whoever guides someone to goodness will have a reward similar to
                the one who acts upon it.”
              </Text>
              <Text style={{ ...type.caption, color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.md }}>(Sahih Muslim, Book of Leadership, Hadith 1893)</Text>
              </View>
              <View style={{ height: 40 }} />
            </View>
          </View>
        </RiseIn>

        {/* Invite banner */}
        <RiseIn delay={100} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <PressableScale
            onPress={nav.community}
            scaleTo={0.985}
            style={{
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: radii.card,
              padding: spacing.standard,
              backgroundColor: colors.purpleTint,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              ...shadow.card,
            }}
          >
            <View style={{ width: 42, height: 42, borderRadius: radii.button, backgroundColor: colors.purpleTint, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
                <Circle cx={9} cy={8.6} r={3.1} fill={colors.purple} />
                <Path d="M3.6 19c0-3 2.4-5 5.4-5s5.4 2 5.4 5z" fill={colors.purple} />
                <Circle cx={16.6} cy={9.4} r={2.5} fill={colors.purple} opacity={0.72} />
                <Path d="M13.6 19c0-2.6 1.6-4.3 3.6-4.3s3.4 1.7 3.4 4.3z" fill={colors.purple} opacity={0.72} />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...type.bodyStrong, color: colors.ink }}>One Million Musallis</Text>
              <Text style={{ ...type.caption, color: colors.inkSecondary, marginTop: spacing.xs, lineHeight: 17 }}>Invite your loved ones and earn endless rewards.</Text>
            </View>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightIcon />
            </View>
          </PressableScale>
        </RiseIn>

        {/* Today's progress header */}
        <RiseIn delay={150} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ ...type.h2, color: colors.ink }}>Today’s Progress</Text>
          <PressableScale onPress={nav.progress} style={{ backgroundColor: colors.primaryTint, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
            <Text style={{ ...type.captionStrong, color: colors.primary }}>View All</Text>
          </PressableScale>
        </RiseIn>

        {/* Progress ring card */}
        <RiseIn delay={200} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, ...shadow.card }}>
            <ProgressRing size={104} strokeWidth={11} progress={dayPct / 100} color={colors.primary}>
              <Text style={{ ...type.display, color: colors.ink }}>{dayPct}%</Text>
            </ProgressRing>
            <View style={{ flex: 1 }}>
              <Text style={{ ...type.bodyStrong, fontWeight: '700', color: colors.ink }}>Today’s Prayers</Text>
              <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 7 }}>{doneCount} of 5 Completed</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 }}>
                <Text style={{ ...type.captionStrong, color: colors.ink }}>
                  {countdown && calcSettings ? `${countdown.name} ${formatPrayerTime(countdown.end, calcSettings.timezone)}` : '—'}
                </Text>
                <View style={{ flex: 1, height: 6, borderRadius: radii.pill, backgroundColor: colors.primaryTint, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.round(nextRingProgress * 100)}%`, borderRadius: radii.pill, backgroundColor: colors.primary }} />
                </View>
              </View>
              <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 9 }}>
                {Math.floor(state.secs / 60)}m {String(state.secs % 60).padStart(2, '0')}s remaining
              </Text>
            </View>
          </View>
        </RiseIn>

        {/* Prayer tiles */}
        <RiseIn delay={250} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
          {dailyPrayers.map((name) => {
            const done = !!logged[name];
            const current = classification?.[name] === 'current';
            const upcoming = classification?.[name] === 'upcoming';
            const Icon = TILE_ICON[name] ?? SunIcon;
            return (
              <PressableScale
                key={name}
                onPress={() => handleTilePress(name)}
                disabled={busy.has(name) || (upcoming && !done)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderWidth: 1,
                  borderColor: current ? colors.success : colors.cardBorder,
                  borderRadius: radii.button,
                  paddingVertical: 11,
                  paddingHorizontal: 2,
                  backgroundColor: current ? colors.successTint : colors.card,
                  alignItems: 'center',
                  gap: 6,
                  opacity: busy.has(name) ? 0.6 : upcoming && !done ? 0.55 : 1,
                }}
              >
                <Icon size={20} color={current ? colors.success : colors.inkMuted} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.ink }}>{name}</Text>
                <Text style={{ fontSize: 12, color: colors.inkSecondary }}>
                  {times && calcSettings ? formatPrayerTime(times[name.toLowerCase() as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'], calcSettings.timezone) : '—:—'}
                </Text>
                {done ? (
                  <View style={{ width: 16, height: 16, borderRadius: radii.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon size={9} />
                  </View>
                ) : (
                  <View style={{ width: 16, height: 16, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.inkMuted, alignItems: 'center', justifyContent: 'center' }}>
                    {upcoming && <Text style={{ fontSize: 10, lineHeight: 10, color: colors.inkMuted }}>–</Text>}
                  </View>
                )}
              </PressableScale>
            );
          })}
        </RiseIn>

        {/* Quick actions — §7 requires Quran to be prominent from Home, and
            this is the entry point into the Ibadah Focus flow. */}
        <RiseIn delay={275} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
          {[
            { title: 'Quran', sub: 'Al-Baqarah · 72%', Icon: BookIcon, tint: colors.primaryTint, ink: colors.primaryStrong, go: nav.quran },
            { title: 'Ibadah Focus', sub: 'Finish your goal', Icon: TimerIcon, tint: colors.goldTint, ink: colors.gold, go: nav.focusSetup },
          ].map((q) => (
            <PressableScale
              key={q.title}
              onPress={q.go}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={`${q.title}. ${q.sub}`}
              style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.standard, backgroundColor: colors.card, gap: spacing.sm, ...shadow.card }}
            >
              <View style={{ width: 38, height: 38, borderRadius: radii.control, backgroundColor: q.tint, alignItems: 'center', justifyContent: 'center' }}>
                <q.Icon size={20} color={q.ink} />
              </View>
              <View>
                <Text style={{ ...type.bodyStrong, color: colors.ink }}>{q.title}</Text>
                <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 4 }}>{q.sub}</Text>
              </View>
            </PressableScale>
          ))}
        </RiseIn>

        {/* Daily Dhikr Streak */}
        <RiseIn delay={300} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <PressableScale onPress={nav.tasbeeh} scaleTo={0.985} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, ...shadow.card }}>
            <Text style={{ ...type.bodyStrong, color: colors.ink }}>Daily Dhikr Streak</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.standard, marginTop: spacing.md }}>
              <View>
                <Text style={{ ...type.display, color: colors.ink }}>7</Text>
                <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 6 }}>Days</Text>
              </View>
              <StreakDotRow days={STREAK_LABELS.map((label, i) => ({ label, hit: i < 5 }))} />
            </View>
          </PressableScale>
        </RiseIn>

        {/* Community Impact */}
        <RiseIn delay={350} style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <PressableScale
            onPress={nav.community}
            scaleTo={0.985}
            style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.standard, ...shadow.card }}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={{ ...type.bodyStrong, color: colors.ink }}>Community Impact</Text>
              <Text style={{ ...type.display, color: colors.ink, marginTop: spacing.md }}>{impactText}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
                <Text style={{ fontSize: 11.5, color: colors.inkSecondary }}>Dhikr counted today</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.successStrong }}>+18,421 today</Text>
              </View>
            </View>
            <BarChart values={[34, 48, 58, 70, 84, 100]} />
          </PressableScale>
        </RiseIn>
      </ScrollView>
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </View>
  );
}
