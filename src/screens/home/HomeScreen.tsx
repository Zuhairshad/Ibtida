import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';

import { useAppState, countdownText, PrayerName } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import * as PrayerService from '../../services/prayers';
import * as PrayerSettingsService from '../../services/prayerSettings';
import { listCommunityGoals } from '../../services/community';
import { supabase } from '../../lib/supabase';
import type { PrayerCalcSettings } from '../../services/prayerSettings';
import { classifyPrayersForDate, computePrayerTimes, formatCoordinates, formatPrayerTime, getPrayerCountdownWindow } from '../../lib/prayerTimes';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import { HomeSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import StreakDotRow from '../../components/StreakDotRow';
import BarChart from '../../components/BarChart';
import { BellIcon, PinIcon, ArrowRightIcon, SunriseIcon, SunIcon, DuskIcon, SundownIcon, MoonIcon, CheckIcon, SearchIcon, BookIcon, TimerIcon, CommunityIcon, BeadsIcon } from '../../theme/icons';

// ─── Design tokens for purple theme ──────────────────────────────────────────
const PURPLE   = '#5B5BD6';
const PURPLE_DK = '#1C1C3A';
const PURPLE_LT = '#EEEEFF';
const PURPLE_MID = '#7B7BD8';
const CARD_BG  = '#FFFFFF';

const TILE_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Fajr: SunriseIcon, Dhuhr: SunIcon, Asr: DuskIcon, Maghrib: SundownIcon, Isha: MoonIcon,
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
  const [streak, setStreak] = useState<number | null>(null);
  const [communityTotal, setCommunityTotal] = useState<number | null>(null);
  const [streakDays, setStreakDays] = useState<{ label: string; hit: boolean }[]>(
    STREAK_LABELS.map((label) => ({ label, hit: false }))
  );
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
          if (!perm.granted) { if (!cancelled) setSettingsLoading(false); return; }
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await PrayerSettingsService.setLocation(user.id, position.coords.latitude, position.coords.longitude, timezone);
          settings = await PrayerSettingsService.getPrayerCalcSettings(user.id);
        }
        if (!cancelled) { setCalcSettings(settings); setSettingsLoading(false); }
      } catch (e) {
        if (!cancelled) { setSettingsLoading(false); setToastMsg(e instanceof Error ? e.message : 'Could not determine your location.'); }
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const times = useMemo(
    () => calcSettings ? computePrayerTimes(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab, TODAY_DATE) : null,
    [calcSettings]
  );
  const classification = useMemo(
    () => calcSettings ? classifyPrayersForDate(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab, TODAY_DATE, new Date()) : null,
    [calcSettings]
  );
  const countdown = useMemo(
    () => calcSettings ? getPrayerCountdownWindow(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcSettings, state.secs]
  );

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
      .then((result) => { if (!cancelled) setLogged(result); })
      .catch((e) => {
        if (cancelled) return;
        setLogged((l) => l ?? PrayerService.emptyPrayerRecord(false));
        setToastMsg(e instanceof Error ? e.message : "Could not load today's prayers.");
      });
    return () => { cancelled = true; };
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const fromDate = sevenDaysAgo.toISOString().slice(0, 10);
      supabase
        .from('prayer_logs').select('log_date').eq('user_id', user.id).eq('done', true).gte('log_date', fromDate)
        .then(({ data, error }) => {
          if (!active) return;
          if (error || !data) { setStreak(null); return; }
          const hitDates = new Set(data.map((r: { log_date: string }) => r.log_date));
          setStreak(hitDates.size);
          const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
          setStreakDays(Array.from({ length: 7 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (6 - i));
            return { label: DAY_LETTERS[d.getDay()], hit: hitDates.has(d.toISOString().slice(0, 10)) };
          }));
        });
      listCommunityGoals(user.id)
        .then((goals) => { if (active) setCommunityTotal(goals.reduce((sum, g) => sum + g.totalProgress, 0)); })
        .catch(() => {});
      return () => { active = false; };
    }, [user])
  );

  const handleTilePress = useCallback(
    async (name: PrayerName) => {
      if (!user || busy.has(name)) return;
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
        setBusy((b) => { const n = new Set(b); n.delete(name); return n; });
      }
    },
    [user, busy, logged, classification]
  );

  const dailyPrayers = PrayerService.PRAYER_NAMES;
  const doneCount = logged ? dailyPrayers.filter((p) => logged[p]).length : 0;
  const dayPct = Math.round((doneCount / 5) * 100);
  const locationLabel = calcSettings
    ? formatCoordinates(calcSettings.latitude, calcSettings.longitude)
    : settingsLoading ? 'Locating…' : 'Location unavailable';
  const nextRingProgress = countdown ? Math.max(0, Math.min(1, 1 - countdown.secondsRemaining / countdown.totalSeconds)) : 0;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (state.booting || !logged) {
    return <View style={{ flex: 1, backgroundColor: PURPLE_LT }}><HomeSkeleton /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: PURPLE_LT }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <RiseIn style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
            <PressableScale onPress={nav.profile} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: PURPLE_LT, borderWidth: 1.5, borderColor: `${PURPLE}33`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: PURPLE }}>
                {user?.email ? user.email.charAt(0).toUpperCase() : '?'}
              </Text>
            </PressableScale>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: PURPLE_DK, letterSpacing: -0.01 }} numberOfLines={1}>
                Assalam-o-Alaikum 👋
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <PinIcon />
                <Text style={{ fontSize: 12, color: colors.inkSecondary }}>{locationLabel}</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <PressableScale onPress={nav.search} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
              <SearchIcon size={19} color="#5B6472" />
            </PressableScale>
            <PressableScale onPress={nav.notifications} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
              <BellIcon />
              <View style={{ position: 'absolute', top: 2, right: 3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5484D', borderWidth: 1.5, borderColor: PURPLE_LT }} />
            </PressableScale>
          </View>
        </RiseIn>

        {/* ── Hadith card ───────────────────────────────────────────────── */}
        <RiseIn delay={50} style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: CARD_BG, borderWidth: 1, borderColor: `${PURPLE}18` }}>
            <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 0 }}>
              {/* quote mark */}
              <Text style={{ fontSize: 36, fontWeight: '900', color: PURPLE, lineHeight: 36, marginBottom: 4 }}>"</Text>
              <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', fontSize: 22, lineHeight: 44, color: PURPLE_DK, textAlign: 'center', writingDirection: 'rtl' }}>
                مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 22, color: '#3B4653', textAlign: 'center', marginTop: 14, paddingHorizontal: 4 }}>
                {'The Prophet ﷺ said: "Whoever guides someone to goodness will have a reward similar to the one who acts upon it."'}
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.inkSecondary, textAlign: 'center', marginTop: 10 }}>
                (Sahih Muslim, Book of Leadership, Hadith 1893)
              </Text>
            </View>
            {/* Mosque silhouette gradient footer */}
            <LinearGradient
              colors={['transparent', 'rgba(200,190,255,0.35)', 'rgba(230,180,200,0.55)']}
              style={{ height: 72, marginTop: 12 }}
            >
              {/* stylised mosque outline */}
              <Svg width="100%" height={72} viewBox="0 0 375 72" preserveAspectRatio="xMidYMax meet">
                <Path
                  d="M0 72 L0 45 Q30 30 45 45 L45 40 Q55 20 65 40 L65 35 Q75 10 85 35 L85 40 Q95 20 105 40 L105 45 Q120 30 135 45 L135 72 Z"
                  fill="rgba(120,100,200,0.18)"
                />
                <Path
                  d="M180 72 L180 38 Q195 18 210 38 L210 33 Q220 10 230 33 L230 38 Q245 18 260 38 L260 72 Z"
                  fill="rgba(120,100,200,0.22)"
                />
                <Path
                  d="M290 72 L290 48 Q310 28 330 48 L330 44 Q340 22 350 44 L350 48 Q362 32 375 48 L375 72 Z"
                  fill="rgba(120,100,200,0.15)"
                />
              </Svg>
            </LinearGradient>
            {/* pagination dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, paddingBottom: 14 }}>
              {[0,1,2,3].map((i) => (
                <View key={i} style={{ width: i === 0 ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === 0 ? PURPLE : `${PURPLE}40` }} />
              ))}
            </View>
          </View>
        </RiseIn>

        {/* ── Community invite banner ────────────────────────────────────── */}
        <RiseIn delay={100} style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <PressableScale
            onPress={nav.community}
            scaleTo={0.985}
            style={{ borderRadius: 22, padding: 18, backgroundColor: PURPLE, flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx={8.5} cy={8} r={3.2} fill="white" />
                <Path d="M3 19c0-3.1 2.5-5.2 5.5-5.2s5.5 2.1 5.5 5.2z" fill="white" />
                <Circle cx={17} cy={9} r={2.6} fill="rgba(255,255,255,0.7)" />
                <Path d="M13.8 19c0-2.7 1.7-4.4 3.7-4.4s3.5 1.7 3.5 4.4z" fill="rgba(255,255,255,0.7)" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>One Million Muslims</Text>
              <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 17 }}>Invite your loved ones and earn endless rewards.</Text>
            </View>
            {/* avatar stack */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row' }}>
                {['#A78BFA', '#818CF8', '#6EE7B7'].map((bg, i) => (
                  <View key={i} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: bg, borderWidth: 2, borderColor: PURPLE, marginLeft: i > 0 ? -8 : 0 }} />
                ))}
              </View>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>+12K</Text>
            </View>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightIcon size={15} color="#FFFFFF" />
            </View>
          </PressableScale>
        </RiseIn>

        {/* ── Today's Progress header ────────────────────────────────────── */}
        <RiseIn delay={150} style={{ paddingHorizontal: 20, marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: PURPLE_DK, letterSpacing: -0.015 }}>Today's Progress</Text>
          <PressableScale onPress={nav.progress} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: PURPLE }}>View All</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: PURPLE }}>›</Text>
          </PressableScale>
        </RiseIn>

        {/* ── Prayer progress card ───────────────────────────────────────── */}
        <RiseIn delay={180} style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <View style={{ borderRadius: 22, padding: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: `${PURPLE}12`, flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <ProgressRing size={104} strokeWidth={10} progress={dayPct / 100} color={PURPLE} trackColor={`${PURPLE}18`}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: PURPLE_DK, letterSpacing: -0.02 }}>{dayPct}%</Text>
                <Text style={{ fontSize: 9.5, color: colors.inkSecondary, marginTop: 1 }}>Completed</Text>
              </View>
            </ProgressRing>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: PURPLE_DK }}>Today's Prayers</Text>
                <PressableScale onPress={nav.prayer} style={{ padding: 4 }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={colors.inkMuted} strokeWidth={1.6} />
                    <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={colors.inkMuted} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </PressableScale>
              </View>
              <Text style={{ fontSize: 13, color: colors.inkSecondary, marginTop: 6 }}>{doneCount} of 5 Completed</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: PURPLE_DK }}>
                  {countdown && calcSettings ? `${countdown.name} ${formatPrayerTime(countdown.end, tz)}` : '—'}
                </Text>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: `${PURPLE}18`, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.round(nextRingProgress * 100)}%`, borderRadius: 3, backgroundColor: PURPLE }} />
                </View>
              </View>
              <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 8 }}>{countdownText(state.secs)}</Text>
            </View>
          </View>
        </RiseIn>

        {/* ── Prayer tiles ───────────────────────────────────────────────── */}
        <RiseIn delay={220} style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <View style={{ borderRadius: 22, padding: 16, backgroundColor: CARD_BG, borderWidth: 1, borderColor: `${PURPLE}12` }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
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
                      borderRadius: 14,
                      paddingVertical: 10,
                      paddingHorizontal: 2,
                      backgroundColor: PURPLE_LT,
                      alignItems: 'center',
                      gap: 5,
                      opacity: busy.has(name) ? 0.6 : upcoming && !done ? 0.6 : 1,
                    }}
                  >
                    <Icon size={18} color={done ? PURPLE : current ? PURPLE_MID : '#8A93A0'} />
                    <Text style={{ fontSize: 10.5, fontWeight: '600', color: PURPLE_DK }}>{name}</Text>
                    <Text style={{ fontSize: 10.5, color: colors.inkSecondary }}>
                      {times && calcSettings ? formatPrayerTime(times[name.toLowerCase() as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'], tz) : '—:—'}
                    </Text>
                    {done ? (
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.successStrong, alignItems: 'center', justifyContent: 'center' }}>
                        <CheckIcon size={9} />
                      </View>
                    ) : current ? (
                      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: PURPLE }} />
                    ) : (
                      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#D3D8DE' }} />
                    )}
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </RiseIn>

        {/* ── Quick actions ──────────────────────────────────────────────── */}
        <RiseIn delay={255} style={{ paddingHorizontal: 20, marginTop: 12, flexDirection: 'row', gap: 10 }}>
          {[
            { title: 'Quran', sub: 'Al-Baqarah · 72%', Icon: BookIcon, tint: '#E6F5EE', ink: '#2A7A4B', go: nav.quran },
            { title: 'Ibadah Focus', sub: 'Finish your goal', Icon: TimerIcon, tint: '#FFF4E0', ink: '#B45309', go: nav.focusSetup },
          ].map((q) => (
            <PressableScale
              key={q.title}
              onPress={q.go}
              scaleTo={0.97}
              style={{ flex: 1, borderWidth: 1, borderColor: `${PURPLE}12`, borderRadius: 20, padding: 16, backgroundColor: CARD_BG, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: q.tint, alignItems: 'center', justifyContent: 'center' }}>
                <q.Icon size={20} color={q.ink} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: PURPLE_DK }}>{q.title}</Text>
                <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 3 }} numberOfLines={1}>{q.sub}</Text>
              </View>
              <Text style={{ fontSize: 16, color: colors.inkMuted }}>›</Text>
            </PressableScale>
          ))}
        </RiseIn>

        {/* ── Streak + Community Impact ──────────────────────────────────── */}
        <RiseIn delay={290} style={{ paddingHorizontal: 20, marginTop: 12, flexDirection: 'row', gap: 10 }}>
          {/* Daily Dhikr Streak */}
          <PressableScale
            onPress={nav.tasbeeh}
            scaleTo={0.97}
            style={{ flex: 1, borderWidth: 1, borderColor: `${PURPLE}12`, borderRadius: 20, padding: 16, backgroundColor: CARD_BG }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Text style={{ fontSize: 16 }}>🔥</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: PURPLE_DK }}>Daily Dhikr Streak</Text>
            </View>
            <Text style={{ fontSize: 30, fontWeight: '700', color: PURPLE_DK, letterSpacing: -0.025 }}>
              {streak === null ? '—' : streak}
            </Text>
            <Text style={{ fontSize: 11, color: colors.inkSecondary, marginTop: 2, marginBottom: 10 }}>Days</Text>
            <StreakDotRow days={streakDays} />
          </PressableScale>

          {/* Community Impact */}
          <PressableScale
            onPress={nav.community}
            scaleTo={0.97}
            style={{ flex: 1, borderWidth: 1, borderColor: `${PURPLE}12`, borderRadius: 20, padding: 16, backgroundColor: CARD_BG }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <CommunityIcon size={16} color={PURPLE} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: PURPLE_DK }}>Community Impact</Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.inkSecondary }}>Total recitations</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: PURPLE_DK, letterSpacing: -0.025, marginTop: 4 }}>
              {communityTotal === null ? '—' : communityTotal.toLocaleString('en-US')}
            </Text>
            <View style={{ marginTop: 10 }}>
              <BarChart values={[34, 48, 58, 70, 84, 100]} />
            </View>
          </PressableScale>
        </RiseIn>

      </ScrollView>
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </View>
  );
}
