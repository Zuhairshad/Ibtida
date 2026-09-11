/**
 * HomeScreen v4 — SME-enhanced living world
 * Fixes: hero height, distinct scene palettes, outer glow halo, expanded star field,
 * card shadows matched to tokens, section label contrast, prayer name clamping,
 * timeline height, bottom safe-area, hadith slider height.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';

import { useAppState, countdownText, PrayerName } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import * as PrayerService from '../../services/prayers';
import * as PrayerSettingsService from '../../services/prayerSettings';
import { listCommunityGoals } from '../../services/community';
import { listGoals } from '../../services/adhkar';
import { supabase } from '../../lib/supabase';
import type { PrayerCalcSettings } from '../../services/prayerSettings';
import {
  classifyPrayersForDate,
  computePrayerTimes,
  formatPrayerTime,
  getPrayerCountdownWindow,
  qiblaBearing,
} from '../../lib/prayerTimes';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { HomeSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import StreakDotRow from '../../components/StreakDotRow';
import DailyInsightSheet from '../../components/DailyInsightSheet';
import {
  BellIcon, ArrowRightIcon, SunriseIcon, SunIcon, DuskIcon, SundownIcon, MoonIcon,
  CheckIcon, SearchIcon, BookIcon, BeadsIcon, TimerIcon, QiblaIcon, CommunityIcon,
} from '../../theme/icons';

// ─── Assets ───────────────────────────────────────────────────────────────────
const HADITH_IMAGES = [
  require('../../../assets/hadith-01.png'),
  require('../../../assets/hadith-02.png'),
  require('../../../assets/hadith-03.png'),
  require('../../../assets/hadith-04.png'),
  require('../../../assets/hadith-05.png'),
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const ARABIC_FONT = 'ScheherazadeNew_700Bold';
const PRIMARY     = colors.primary;
const GOLD        = '#D4A86A';
const GOLD_LIGHT  = '#E4C080';
const GOLD_FAINT  = 'rgba(212,168,106,0.14)';

const PRAYER_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Fajr: SunriseIcon, Dhuhr: SunIcon, Asr: DuskIcon, Maghrib: SundownIcon, Isha: MoonIcon,
};

const PRAYER_ARABIC: Record<string, string> = {
  Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء',
};

// ─── Star field — spread across 60% of hero height for immersive depth ────────
const NIGHT_PARTICLES = [
  { lx: 0.08, ly: 0.05, r: 1.1 }, { lx: 0.78, ly: 0.04, r: 1.6 },
  { lx: 0.46, ly: 0.03, r: 0.8 }, { lx: 0.91, ly: 0.16, r: 1.3 },
  { lx: 0.22, ly: 0.26, r: 0.9 }, { lx: 0.63, ly: 0.13, r: 1.8 },
  { lx: 0.35, ly: 0.38, r: 0.7 }, { lx: 0.55, ly: 0.30, r: 1.0 },
  { lx: 0.72, ly: 0.52, r: 0.8 }, { lx: 0.16, ly: 0.46, r: 1.2 },
  { lx: 0.44, ly: 0.58, r: 0.6 }, { lx: 0.86, ly: 0.40, r: 0.9 },
];

// ─── Scene system — 5-stop gradient, full screen ──────────────────────────────
type Scene = {
  gradTop:   string;
  gradMid:   string;
  gradBot:   string;
  gradTrans: string;  // ~73% screen — transition zone
  contentBg: string;  // 100% — warm tinted ivory
  orb1:      string;  // primary glow colour
  orb2:      string;  // ambient fill
  orb1OpMin: number;
  orb1OpMax: number;
  accent:    string;  // countdown, progress, timeline indicator
  isNight:   boolean;
};

const SCENES: Record<string, Scene> = {
  // Cold indigo pre-dawn — stars, stillness
  Fajr: {
    gradTop: '#020810', gradMid: '#060E24', gradBot: '#0C1A3C',
    gradTrans: '#3C5876', contentBg: '#E8EEF6',
    orb1: '#1C3470', orb2: '#06081E',
    orb1OpMin: 0.22, orb1OpMax: 0.38,
    accent: '#7AAEE2', isNight: true,
  },
  // Rich royal blue — midday confidence
  Dhuhr: {
    gradTop: '#0C1C3E', gradMid: '#123060', gradBot: '#1A3C7A',
    gradTrans: '#4868A0', contentBg: '#EAF0FA',
    orb1: '#2A5CB0', orb2: '#122E58',
    orb1OpMin: 0.26, orb1OpMax: 0.42,
    accent: '#7AB8F2', isNight: false,
  },
  // Steel teal — late-afternoon coolness
  Asr: {
    gradTop: '#0C1930', gradMid: '#14283C', gradBot: '#1C3050',
    gradTrans: '#3C5E78', contentBg: '#EBF1F6',
    orb1: '#204468', orb2: '#0E1E30',
    orb1OpMin: 0.20, orb1OpMax: 0.36,
    accent: '#7CB4CE', isNight: false,
  },
  // Dramatic crimson-amber sunset
  Maghrib: {
    gradTop: '#0A0608', gradMid: '#281006', gradBot: '#501C08',
    gradTrans: '#884830', contentBg: '#F4EAE0',
    orb1: '#CC4C18', orb2: '#70280A',
    orb1OpMin: 0.28, orb1OpMax: 0.46,
    accent: '#F09860', isNight: false,
  },
  // Purest midnight — darker than Fajr, deeper stars
  Isha: {
    gradTop: '#010306', gradMid: '#03061A', gradBot: '#060920',
    gradTrans: '#282E4A', contentBg: '#E8EAF2',
    orb1: '#0E1A4E', orb2: '#04061A',
    orb1OpMin: 0.16, orb1OpMax: 0.28,
    accent: '#6878B8', isNight: true,
  },
};

const DEFAULT_SCENE: Scene = SCENES.Isha;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toHijriDateStr(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(date);
  } catch { return ''; }
}

function timeGreeting(isFriday: boolean): string {
  const h = new Date().getHours();
  if (isFriday && h >= 10 && h < 16) return "Jumu'ah Mubarak";
  if (h < 5)  return 'Good Night';
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 20) return 'Good Evening';
  return 'Good Night';
}

function adhkarContext(): string {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return 'Morning Adhkar';
  if (h >= 14 && h < 20) return 'Evening Adhkar';
  return 'Daily Adhkar';
}

const TODAY = PrayerService.todayISODate();

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { state, setSecs } = useAppState();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: SW, height: SH } = useWindowDimensions();

  // SME fix: 46% max 440px — leaves sufficient space for content without scrolling
  const HERO_H   = Math.min(Math.floor(SH * 0.46), 440);
  const SLIDER_W = SW - 40;
  const isFriday = new Date().getDay() === 5;

  // ── State ─────────────────────────────────────────────────────────────────
  const [displayName,    setDisplayName]    = useState('');
  const [memberCount,    setMemberCount]    = useState<number | null>(null);
  const [logged,         setLogged]         = useState<Record<PrayerName, boolean> | null>(null);
  const [toastMsg,       setToastMsg]       = useState<string | null>(null);
  const [streak,         setStreak]         = useState<number | null>(null);
  const [streakDays,     setStreakDays]     = useState(
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label) => ({ label, hit: false }))
  );
  const [calcSettings,    setCalcSettings]    = useState<PrayerCalcSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [goalsDoneToday,  setGoalsDoneToday]  = useState(0);
  const [goalsTotal,      setGoalsTotal]      = useState(0);
  const [hadithIndex,     setHadithIndex]     = useState(0);
  const [communityTotal,  setCommunityTotal]  = useState<number | null>(null);

  const hadithScrollRef = useRef<ScrollView>(null);
  const autoScrollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const hadithPausedRef = useRef(false);

  // ── Scene cross-fade ───────────────────────────────────────────────────────
  const currSceneNameRef  = useRef<string>('Isha');
  const [prevSceneName,   setPrevSceneName]   = useState<string>('Isha');
  const [activeSceneName, setActiveSceneName] = useState<string>('Isha');
  const transitionAnim    = useRef(new Animated.Value(1)).current;

  // ── Animations ────────────────────────────────────────────────────────────
  const scrollY        = useRef(new Animated.Value(0)).current;
  const heroOpacity    = useRef(new Animated.Value(0)).current;
  const heroSlide      = useRef(new Animated.Value(24)).current;
  const prayerEntrance = useRef(new Animated.Value(0)).current;
  const orb1Pulse      = useRef(new Animated.Value(0)).current;
  const orb2Drift      = useRef(new Animated.Value(0)).current;
  const timelinePulse  = useRef(new Animated.Value(0)).current;
  const sect1Fade      = useRef(new Animated.Value(0)).current;
  const sect1Slide     = useRef(new Animated.Value(12)).current;
  const sect2Fade      = useRef(new Animated.Value(0)).current;
  const sect2Slide     = useRef(new Animated.Value(12)).current;
  const sect3Fade      = useRef(new Animated.Value(0)).current;
  const sect3Slide     = useRef(new Animated.Value(12)).current;
  const particleAnims  = useRef(NIGHT_PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 860, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(heroSlide,   { toValue: 0, duration: 860, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.timing(prayerEntrance, { toValue: 1, duration: 860, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, 440);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(sect1Fade,  { toValue: 1, duration: 520, easing: Easing.out(Easing.ease),  useNativeDriver: true }),
        Animated.timing(sect1Slide, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 380);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(sect2Fade,  { toValue: 1, duration: 520, easing: Easing.out(Easing.ease),  useNativeDriver: true }),
        Animated.timing(sect2Slide, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 520);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(sect3Fade,  { toValue: 1, duration: 520, easing: Easing.out(Easing.ease),  useNativeDriver: true }),
        Animated.timing(sect3Slide, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 660);

    // Meditative orb breathe — 9s
    const orb1Loop = Animated.loop(Animated.sequence([
      Animated.timing(orb1Pulse, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(orb1Pulse, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    orb1Loop.start();

    // Secondary orb independent drift — 14s
    const orb2Loop = Animated.loop(Animated.sequence([
      Animated.timing(orb2Drift, { toValue: 1, duration: 14000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(orb2Drift, { toValue: 0, duration: 14000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    orb2Loop.start();

    // Current prayer pulse on timeline — 1.4s
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(timelinePulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(timelinePulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    pulseLoop.start();

    // Stars — staggered twinkle across expanded field
    const particleComposites = particleAnims.map((anim, i) => {
      const dur = 1600 + i * 260;
      return Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: 1,    duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.04, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
    });
    particleComposites.forEach((anim, i) => setTimeout(() => anim.start(), i * 160));

    return () => {
      orb1Loop.stop();
      orb2Loop.stop();
      pulseLoop.stop();
      particleComposites.forEach(a => a.stop());
    };
  }, []);

  // ── Prayer settings ───────────────────────────────────────────────────────
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
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          try {
            const [geo] = await Location.reverseGeocodeAsync(pos.coords);
            if (geo?.timezone) tz = geo.timezone;
          } catch {}
          await PrayerSettingsService.setLocation(user.id, pos.coords.latitude, pos.coords.longitude, tz);
          settings = await PrayerSettingsService.getPrayerCalcSettings(user.id);
        }
        if (!cancelled) { setCalcSettings(settings); setSettingsLoading(false); }
      } catch (e) {
        if (!cancelled) {
          setSettingsLoading(false);
          setToastMsg(e instanceof Error ? e.message : 'Location unavailable.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const times = useMemo(
    () => calcSettings
      ? computePrayerTimes(
          calcSettings.latitude, calcSettings.longitude,
          calcSettings.calculationMethod, calcSettings.madhab, new Date()
        )
      : null,
    [calcSettings]
  );

  const countdown = useMemo(
    () => calcSettings
      ? getPrayerCountdownWindow(
          calcSettings.latitude, calcSettings.longitude,
          calcSettings.calculationMethod, calcSettings.madhab
        )
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcSettings, state.secs]
  );

  const classification = useMemo(
    () => calcSettings
      ? classifyPrayersForDate(
          calcSettings.latitude, calcSettings.longitude,
          calcSettings.calculationMethod, calcSettings.madhab,
          new Date(), new Date()
        )
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcSettings, state.secs]
  );

  const qibla = useMemo(
    () => calcSettings ? qiblaBearing(calcSettings.latitude, calcSettings.longitude) : null,
    [calcSettings]
  );

  useEffect(() => {
    if (!calcSettings) return;
    const w = getPrayerCountdownWindow(
      calcSettings.latitude, calcSettings.longitude,
      calcSettings.calculationMethod, calcSettings.madhab
    );
    setSecs(w.secondsRemaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcSettings]);

  useEffect(() => {
    if (!calcSettings || state.secs !== 0) return;
    const w = getPrayerCountdownWindow(
      calcSettings.latitude, calcSettings.longitude,
      calcSettings.calculationMethod, calcSettings.madhab
    );
    setSecs(w.secondsRemaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcSettings, state.secs]);

  // ── Scene cross-fade trigger ───────────────────────────────────────────────
  useEffect(() => {
    const newName = countdown?.name;
    if (!newName || newName === currSceneNameRef.current) return;
    setPrevSceneName(currSceneNameRef.current);
    currSceneNameRef.current = newName;
    setActiveSceneName(newName);
    transitionAnim.setValue(0);
    Animated.timing(transitionAnim, {
      toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
    }).start();
  }, [countdown?.name]);

  // ── Profile + community ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles').select('display_name').eq('id', user.id).single();
        setDisplayName(data?.display_name || user.email?.split('@')[0] || '');
      } catch {
        setDisplayName(user.email?.split('@')[0] || '');
      }
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const { count } = await supabase
          .from('community_goal_members').select('*', { count: 'exact', head: true });
        if (count !== null) setMemberCount(count);
      } catch {}
    })();
  }, []);

  // ── Hadith auto-rotate ────────────────────────────────────────────────────
  const startAutoScroll = useCallback(() => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    autoScrollRef.current = setInterval(() => {
      if (hadithPausedRef.current) return;
      setHadithIndex((prev) => {
        const next = (prev + 1) % HADITH_IMAGES.length;
        hadithScrollRef.current?.scrollTo({ x: next * SLIDER_W, animated: true });
        return next;
      });
    }, 7000);
  }, [SLIDER_W]);

  useEffect(() => {
    startAutoScroll();
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [startAutoScroll]);

  // ── Focus refresh ─────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;

      PrayerService.getPrayerLog(user.id, TODAY)
        .then((r) => { if (active) setLogged(r); })
        .catch(() => { if (active) setLogged((l) => l ?? PrayerService.emptyPrayerRecord(false)); });

      const sevenAgo = new Date();
      sevenAgo.setDate(sevenAgo.getDate() - 6);
      supabase
        .from('prayer_logs').select('log_date')
        .eq('user_id', user.id).eq('done', true)
        .gte('log_date', sevenAgo.toISOString().slice(0, 10))
        .then(({ data }) => {
          if (!active || !data) return;
          const hitDates = new Set(data.map((r: { log_date: string }) => r.log_date));
          setStreak(hitDates.size);
          const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
          setStreakDays(Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return { label: DAY_LETTERS[d.getDay()], hit: hitDates.has(d.toISOString().slice(0, 10)) };
          }));
        });

      listCommunityGoals(user.id)
        .then((gs) => { if (active) setCommunityTotal(gs.reduce((s, g) => s + g.totalProgress, 0)); })
        .catch(() => {});

      listGoals(user.id)
        .then((gs) => {
          if (!active) return;
          setGoalsTotal(gs.length);
          setGoalsDoneToday(gs.filter((g) => g.progress >= g.target).length);
        })
        .catch(() => {});

      return () => { active = false; };
    }, [user])
  );

  // ── Derived values ────────────────────────────────────────────────────────
  const dailyPrayers = PrayerService.PRAYER_NAMES;
  const doneCount    = logged ? dailyPrayers.filter((p) => logged[p]).length : 0;
  const ringProgress = countdown
    ? Math.max(0, Math.min(1, 1 - countdown.secondsRemaining / countdown.totalSeconds))
    : 0;
  const tz = calcSettings
    ? (() => {
        const off = Math.round(calcSettings.longitude / 15);
        return off === 0 ? 'UTC' : off < 0 ? `Etc/GMT+${-off}` : `Etc/GMT-${off}`;
      })()
    : Intl.DateTimeFormat().resolvedOptions().timeZone;

  const hijriDate   = useMemo(() => toHijriDateStr(new Date()), []);
  const scene       = SCENES[activeSceneName] ?? DEFAULT_SCENE;
  const prevScene   = SCENES[prevSceneName]   ?? DEFAULT_SCENE;
  const adhkarLabel = useMemo(() => adhkarContext(), []);

  const currentPrayerIdx = countdown?.name ? dailyPrayers.indexOf(countdown.name as PrayerName) : -1;
  const progressFrac = currentPrayerIdx >= 0
    ? (currentPrayerIdx + ringProgress) / dailyPrayers.length
    : doneCount / dailyPrayers.length;

  // ── Animated interpolations ───────────────────────────────────────────────
  const orb1Scale    = orb1Pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.20] });
  const orb1Op       = orb1Pulse.interpolate({ inputRange: [0, 1], outputRange: [scene.orb1OpMin, scene.orb1OpMax] });
  // SME: outer glow halo for atmospheric bloom
  const haloOp       = orb1Pulse.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.11] });
  const orb2Y        = orb2Drift.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const orb2Op       = orb2Drift.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });
  const prayerY      = prayerEntrance.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const prayerOp     = prayerEntrance;
  const pulseScale   = timelinePulse.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.30] });
  const pulseOp      = timelinePulse.interpolate({ inputRange: [0, 1], outputRange: [0.70, 1.0] });
  const heroParallax = scrollY.interpolate({
    inputRange: [0, HERO_H], outputRange: [0, HERO_H * 0.14], extrapolate: 'clamp',
  });
  const prevGradOp   = transitionAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  if (state.booting || !logged) {
    return <View style={{ flex: 1, backgroundColor: '#F5F1EB' }}><HomeSkeleton /></View>;
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>

      {/* ── Fixed atmospheric gradient — scene cross-fade, does not scroll ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: prevGradOp }]}>
          <LinearGradient
            colors={[prevScene.gradTop, prevScene.gradMid, prevScene.gradBot, prevScene.gradTrans, prevScene.contentBg]}
            locations={[0, 0.27, 0.50, 0.73, 1.0]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: transitionAnim }]}>
          <LinearGradient
            colors={[scene.gradTop, scene.gradMid, scene.gradBot, scene.gradTrans, scene.contentBg]}
            locations={[0, 0.27, 0.50, 0.73, 1.0]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {/* ── Scrollable content — transparent, floats over gradient ── */}
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 84 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: 'transparent' }}
      >

        {/* ════════════════════════════════════════════════════════════
            HERO — transparent window into fixed gradient.
            Overflow:hidden clips orbs; no border radius = no seam.
        ════════════════════════════════════════════════════════════ */}
        <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroSlide }] }}>
          <View style={{ height: HERO_H + insets.top, overflow: 'hidden' }}>

            {/* Outer glow halo — atmospheric bloom behind primary orb */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -SW * 0.30,
                left: SW * 0.03,
                width: SW * 0.94,
                height: SW * 0.94,
                borderRadius: SW * 0.47,
                backgroundColor: scene.orb1,
                opacity: haloOp,
                transform: [{ scale: orb1Scale }, { translateY: heroParallax }],
              }}
            />

            {/* Primary orb — meditative breathe + parallax */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -SW * 0.22, left: SW * 0.08,
                width: SW * 0.84, height: SW * 0.84,
                borderRadius: SW * 0.42,
                backgroundColor: scene.orb1,
                opacity: orb1Op,
                transform: [{ scale: orb1Scale }, { translateY: heroParallax }],
              }}
            />

            {/* Secondary ambient orb — slow independent drift */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: 90, right: -SW * 0.20,
                width: SW * 0.62, height: SW * 0.62,
                borderRadius: SW * 0.31,
                backgroundColor: scene.orb2,
                opacity: orb2Op,
                transform: [{ translateY: orb2Y }, { translateY: heroParallax }],
              }}
            />

            {/* Depth vignette — frames the composition */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.20)']}
              locations={[0, 0.62, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Star field — Fajr and Isha, spread across 60% of hero */}
            {scene.isNight && NIGHT_PARTICLES.map((p, i) => (
              <Animated.View
                key={`star${i}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: p.lx * SW,
                  top: p.ly * (HERO_H + insets.top),
                  width: p.r * 2.2, height: p.r * 2.2,
                  borderRadius: p.r * 1.1,
                  backgroundColor: '#FFFFFF',
                  opacity: particleAnims[i],
                }}
              />
            ))}

            {/* ── Header row ──────────────────────────────────────────── */}
            <View style={{
              position: 'absolute',
              top: insets.top + 12,
              left: 18, right: 18,
              flexDirection: 'row', alignItems: 'center',
            }}>
              <PressableScale
                onPress={nav.profile}
                scaleTo={0.96}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                accessibilityRole="button"
                accessibilityLabel="View profile"
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1, borderColor: `${GOLD}50`,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: GOLD }}>
                    {(displayName || user?.email || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', letterSpacing: 0.3 }}>
                    {timeGreeting(isFriday)}
                  </Text>
                  <Text
                    style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.88)', letterSpacing: -0.2 }}
                    numberOfLines={1}
                  >
                    {displayName || 'Assalamu Alaykum'}
                  </Text>
                </View>
              </PressableScale>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { onPress: nav.search,        Icon: SearchIcon, label: 'Search' },
                  { onPress: nav.notifications, Icon: BellIcon,   label: 'Notifications' },
                ].map(({ onPress, Icon, label }) => (
                  <PressableScale
                    key={label}
                    onPress={onPress}
                    scaleTo={0.90}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon size={17} color="rgba(255,255,255,0.72)" />
                  </PressableScale>
                ))}
              </View>
            </View>

            {/* ── Bismillah — sacred invocation above prayer data ───── */}
            <View style={{
              position: 'absolute',
              top: insets.top + 68,
              left: 0, right: 0,
              alignItems: 'center',
            }}>
              <Text style={{
                fontFamily: ARABIC_FONT,
                fontSize: 30,
                color: GOLD_LIGHT,
                textAlign: 'center',
                letterSpacing: 0.5,
                lineHeight: 44,
                opacity: 0.94,
              }}>
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
                <View style={{ width: 28, height: 0.8, backgroundColor: `${GOLD}40` }} />
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: 0.5 }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {isFriday ? " · Jumu'ah" : ''}
                </Text>
                {hijriDate.length > 0 && (
                  <>
                    <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: `${GOLD}44` }} />
                    <Text style={{ fontSize: 10, color: `${GOLD}88`, letterSpacing: 0.2 }}>{hijriDate}</Text>
                  </>
                )}
                <View style={{ width: 28, height: 0.8, backgroundColor: `${GOLD}40` }} />
              </View>
            </View>

            {/* ── Prayer focal point ─────────────────────────────────── */}
            <Animated.View style={{
              position: 'absolute',
              bottom: 82, left: 22, right: 22,
              opacity: prayerOp,
              transform: [{ translateY: prayerY }],
            }}>
              <Text style={{
                fontSize: 9, fontWeight: '600', letterSpacing: 2.0,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)',
                marginBottom: 4,
              }}>
                {doneCount === 5
                  ? 'All Prayers Complete'
                  : classification?.[countdown?.name as PrayerName] === 'current'
                    ? 'In Progress'
                    : 'Next Prayer'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  {/* SME fix: adjustsFontSizeToFit prevents "Maghrib" clipping on narrow screens */}
                  <Text
                    style={{
                      fontSize: 60, fontWeight: '200',
                      color: doneCount === 5 ? GOLD_LIGHT : '#FFFFFF',
                      letterSpacing: -2.5, lineHeight: 62,
                    }}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    numberOfLines={1}
                  >
                    {countdown?.name ?? '—'}
                  </Text>
                  {countdown?.name ? (
                    <Text style={{
                      fontFamily: ARABIC_FONT,
                      fontSize: 21, color: GOLD_LIGHT,
                      lineHeight: 30, marginTop: -2, opacity: 0.88,
                    }}>
                      {PRAYER_ARABIC[countdown.name] ?? ''}
                    </Text>
                  ) : null}
                </View>

                <View style={{ alignItems: 'flex-end', paddingBottom: 4 }}>
                  <Text style={{
                    fontSize: 24, fontWeight: '200',
                    color: 'rgba(255,255,255,0.84)',
                    letterSpacing: -0.5,
                    fontVariant: ['tabular-nums'],
                    lineHeight: 28,
                  }}>
                    {countdown && calcSettings ? formatPrayerTime(countdown.end, tz) : '—:—'}
                  </Text>
                  <Text style={{
                    fontSize: 13, fontWeight: '400',
                    color: 'rgba(255,255,255,0.46)',
                    fontVariant: ['tabular-nums'],
                    marginTop: 3,
                    letterSpacing: 0.2,
                  }}>
                    {countdownText(state.secs)}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)', marginTop: 8 }}>
                    {doneCount}/5 prayed today
                  </Text>
                </View>
              </View>

              {/* SME fix: taller progress bar, more opacity */}
              <View style={{
                height: 2, backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 1, marginTop: 12, overflow: 'hidden',
              }}>
                <View style={{
                  height: '100%', borderRadius: 1,
                  width: `${Math.round(ringProgress * 100)}%`,
                  backgroundColor: scene.accent,
                  opacity: 0.80,
                }} />
              </View>

              {/* Action row */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <PressableScale
                  onPress={nav.prayer}
                  scaleTo={0.93}
                  style={{ flex: 1 }}
                  accessibilityRole="button"
                  accessibilityLabel="View prayer times"
                >
                  <View style={{
                    height: 44, borderRadius: 22,
                    backgroundColor: 'rgba(255,255,255,0.10)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.76)' }}>
                      Prayer Times
                    </Text>
                    <ArrowRightIcon size={11} color="rgba(255,255,255,0.46)" />
                  </View>
                </PressableScale>
                {qibla !== null && (
                  <PressableScale
                    onPress={nav.prayer}
                    scaleTo={0.93}
                    accessibilityRole="button"
                    accessibilityLabel={`Qibla direction ${Math.round(qibla)} degrees`}
                  >
                    <View style={{
                      height: 44, paddingHorizontal: 16, borderRadius: 22,
                      backgroundColor: GOLD_FAINT,
                      borderWidth: 1, borderColor: `${GOLD}30`,
                      flexDirection: 'row', alignItems: 'center', gap: 7,
                    }}>
                      <QiblaIcon size={13} color={GOLD_LIGHT} />
                      <Text style={{ fontSize: 13, fontWeight: '500', color: GOLD_LIGHT }}>
                        {Math.round(qibla)}°
                      </Text>
                    </View>
                  </PressableScale>
                )}
              </View>
            </Animated.View>

            {/* ── Prayer timeline — 78px, floats on gradient ─────────── */}
            <View style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              height: 78,
            }}>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0, left: 20, right: 20,
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                }}
              />
              {/* Progress track */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: '11%', right: '11%', top: 25,
                  height: 1, backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: '11%',
                  width: `${progressFrac * 78}%`,
                  top: 25, height: 1,
                  backgroundColor: scene.accent,
                  opacity: 0.55,
                }}
              />

              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }}>
                {dailyPrayers.map((name, idx) => {
                  const cls     = classification?.[name];
                  const done    = !!logged[name];
                  const current = cls === 'current';
                  const missed  = cls === 'done' && !done;
                  const Icon    = PRAYER_ICON[name] ?? SunIcon;
                  const timeStr = times && calcSettings
                    ? formatPrayerTime(
                        times[name.toLowerCase() as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'],
                        tz
                      )
                    : '';

                  return (
                    <React.Fragment key={name}>
                      <PressableScale
                        onPress={() => nav.prayerDetail(name)}
                        scaleTo={0.88}
                        style={{ flex: 1, alignItems: 'center' }}
                        accessibilityRole="button"
                        accessibilityLabel={`${name} prayer, ${done ? 'completed' : current ? 'current' : 'upcoming'}`}
                      >
                        <View style={{ alignItems: 'center', gap: 3 }}>
                          {done ? (
                            <View style={{
                              width: 26, height: 26, borderRadius: 13,
                              backgroundColor: 'rgba(94,170,120,0.20)',
                              borderWidth: 1, borderColor: 'rgba(94,170,120,0.52)',
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <CheckIcon size={10} color="#5EAA78" />
                            </View>
                          ) : current ? (
                            <Animated.View style={{
                              width: 26, height: 26, borderRadius: 13,
                              backgroundColor: `${scene.accent}28`,
                              borderWidth: 1.5, borderColor: scene.accent,
                              alignItems: 'center', justifyContent: 'center',
                              opacity: pulseOp,
                              transform: [{ scale: pulseScale }],
                            }}>
                              <Icon size={12} color={scene.accent} />
                            </Animated.View>
                          ) : missed ? (
                            <View style={{
                              width: 26, height: 26, borderRadius: 13,
                              borderWidth: 1.5, borderColor: 'rgba(220,70,70,0.38)',
                              alignItems: 'center', justifyContent: 'center',
                              backgroundColor: 'rgba(220,70,70,0.08)',
                            }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(220,70,70,0.48)' }} />
                            </View>
                          ) : (
                            <View style={{
                              width: 26, height: 26, borderRadius: 13,
                              borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
                            }} />
                          )}

                          <Text style={{
                            fontSize: 8.5, fontWeight: current ? '700' : '400',
                            letterSpacing: 0.1,
                            color: current
                              ? '#FFFFFF'
                              : done
                                ? 'rgba(255,255,255,0.52)'
                                : missed
                                  ? 'rgba(220,100,100,0.68)'
                                  : 'rgba(255,255,255,0.22)',
                          }}>
                            {name}
                          </Text>

                          <Text style={{
                            fontSize: 7.5,
                            color: current ? scene.accent : 'rgba(255,255,255,0.15)',
                            letterSpacing: 0.1,
                            fontVariant: ['tabular-nums'],
                          }}>
                            {timeStr}
                          </Text>
                        </View>
                      </PressableScale>

                      {idx < dailyPrayers.length - 1 && (
                        <View style={{ width: 0.5, height: 24, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ════════════════════════════════════════════════════════════
            SECTION 1 — Daily Adhkar + Qur'an
            Adhkar first: daily obligation precedes aspirational reading
        ════════════════════════════════════════════════════════════ */}
        <Animated.View style={{
          paddingHorizontal: 20, marginTop: 24, gap: 10,
          opacity: sect1Fade, transform: [{ translateY: sect1Slide }],
        }}>
          {/* Adhkar — daily obligation, elevated position */}
          <PressableScale
            onPress={nav.adhkar}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${adhkarLabel}. ${goalsTotal === 0 ? 'No goals set' : `${goalsDoneToday} of ${goalsTotal} goals complete`}`}
          >
            <View style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: colors.successTint }]}>
                <BeadsIcon size={22} color={colors.successText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>
                  {goalsTotal === 0
                    ? adhkarLabel
                    : goalsDoneToday === goalsTotal
                      ? `${adhkarLabel} · All Complete`
                      : `${adhkarLabel} · ${goalsDoneToday}/${goalsTotal} Done`}
                </Text>
                <Text style={styles.cardTitle}>Adhkar</Text>
              </View>
              {goalsTotal > 0 && (
                <ProgressRing
                  size={36}
                  strokeWidth={2.5}
                  progress={goalsDoneToday / goalsTotal}
                  color={colors.successText}
                  trackColor={colors.successTint}
                />
              )}
              <ArrowRightIcon size={13} color="rgba(0,0,0,0.18)" />
            </View>
          </PressableScale>

          {/* Qur'an — continue reading */}
          <PressableScale
            onPress={nav.quran}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel="Continue reading Qur'an"
          >
            <View style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: colors.asr.tint }]}>
                <BookIcon size={22} color={colors.asr.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>Continue Reading</Text>
                <Text style={styles.cardTitle}>Qur'an</Text>
              </View>
              <ArrowRightIcon size={13} color="rgba(0,0,0,0.18)" />
            </View>
          </PressableScale>
        </Animated.View>

        {/* ════════════════════════════════════════════════════════════
            SECTION 2 — Today's Journey: streak · prayers · dhikr
        ════════════════════════════════════════════════════════════ */}
        <Animated.View style={{
          marginTop: 28, marginHorizontal: 20,
          opacity: sect2Fade, transform: [{ translateY: sect2Slide }],
        }}>
          <Text style={styles.sectionLabel}>Today's Journey</Text>

          <View style={styles.statBand}>
            <PressableScale
              onPress={nav.tasbeeh}
              scaleTo={0.97}
              style={{ flex: 1 }}
              accessibilityRole="button"
              accessibilityLabel={`Streak: ${streak ?? 0} days`}
            >
              <View style={styles.statCell}>
                <View style={[styles.statAccentBar, { backgroundColor: GOLD }]} />
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>{streak === null ? '—' : streak}</Text>
                  <Text style={styles.statUnit}>{streak === 1 ? 'day' : 'days'}</Text>
                  <Text style={[styles.statKey, { color: GOLD }]}>Streak</Text>
                </View>
              </View>
            </PressableScale>

            <View style={styles.statDivider} />

            <PressableScale
              onPress={nav.prayer}
              scaleTo={0.97}
              style={{ flex: 1 }}
              accessibilityRole="button"
              accessibilityLabel={`Prayers: ${doneCount} of 5 prayed today`}
            >
              <View style={styles.statCell}>
                <View style={[styles.statAccentBar, { backgroundColor: PRIMARY }]} />
                <View style={styles.statContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
                    <Text style={styles.statNumber}>{doneCount}</Text>
                    <Text style={styles.statNumberFaint}>/5</Text>
                  </View>
                  <Text style={styles.statUnit}>{doneCount === 5 ? 'complete' : 'prayed'}</Text>
                  <Text style={[styles.statKey, { color: PRIMARY }]}>Prayers</Text>
                </View>
              </View>
            </PressableScale>

            <View style={styles.statDivider} />

            <PressableScale
              onPress={nav.adhkar}
              scaleTo={0.97}
              style={{ flex: 1 }}
              accessibilityRole="button"
              accessibilityLabel={`Dhikr: ${goalsDoneToday} of ${goalsTotal} goals`}
            >
              <View style={styles.statCell}>
                <View style={[styles.statAccentBar, { backgroundColor: colors.successText }]} />
                <View style={styles.statContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
                    <Text style={styles.statNumber}>{goalsDoneToday}</Text>
                    {goalsTotal > 0 && <Text style={styles.statNumberFaint}>/{goalsTotal}</Text>}
                  </View>
                  <Text style={styles.statUnit}>
                    {goalsDoneToday > 0 && goalsDoneToday === goalsTotal ? 'all done' : 'goals'}
                  </Text>
                  <Text style={[styles.statKey, { color: colors.successText }]}>Dhikr</Text>
                </View>
              </View>
            </PressableScale>
          </View>

          <View style={{ marginTop: 14, paddingHorizontal: 4 }}>
            <StreakDotRow days={streakDays} dotSize={10} />
          </View>
        </Animated.View>

        {/* ════════════════════════════════════════════════════════════
            SECTION 3 — Reflections + Utilities
        ════════════════════════════════════════════════════════════ */}
        <Animated.View style={{ opacity: sect3Fade, transform: [{ translateY: sect3Slide }] }}>

          {/* SME fix: hadith slider taller (232px) — images deserve breathing room */}
          <View style={{ marginTop: 30, paddingHorizontal: 20 }}>
            <Text style={styles.sectionLabel}>Reflections</Text>
            <View style={{ borderRadius: 22, overflow: 'hidden' }}>
              <ScrollView
                ref={hadithScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / SLIDER_W);
                  setHadithIndex(idx);
                  startAutoScroll();
                }}
              >
                {HADITH_IMAGES.map((src, i) => (
                  <Image
                    key={i}
                    source={src}
                    style={{ width: SLIDER_W, height: 232, resizeMode: 'cover' }}
                  />
                ))}
              </ScrollView>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.46)']}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 72 }}
              />
              <View style={{ position: 'absolute', bottom: 14, left: 0, right: 0, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.40)', letterSpacing: 1.0, textTransform: 'uppercase' }}>
                  Swipe to explore
                </Text>
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {HADITH_IMAGES.map((_, i) => (
                    <View key={i} style={{
                      width: i === hadithIndex ? 18 : 4,
                      height: 4, borderRadius: 2,
                      backgroundColor: i === hadithIndex ? '#FFFFFF' : 'rgba(255,255,255,0.30)',
                    }} />
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 24, paddingHorizontal: 20, gap: 9 }}>
            <PressableScale onPress={nav.focusSetup} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Focus Mode — Ibadah lock">
              <View style={styles.utilityRow}>
                <View style={[styles.utilityIcon, { backgroundColor: '#FEF3C7' }]}>
                  <TimerIcon size={18} color="#B45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.utilityTitle}>Focus Mode</Text>
                  <Text style={styles.utilitySubtitle}>Ibadah lock · remove distractions</Text>
                </View>
                <ArrowRightIcon size={11} color="rgba(0,0,0,0.18)" />
              </View>
            </PressableScale>

            <PressableScale onPress={nav.wakeAlarmSettings} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Wake Alarm settings">
              <View style={styles.utilityRow}>
                <View style={[styles.utilityIcon, { backgroundColor: colors.primaryTint }]}>
                  <BellIcon size={18} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.utilityTitle}>Wake Alarm</Text>
                  <Text style={styles.utilitySubtitle}>Two-step prayer verification</Text>
                </View>
                <ArrowRightIcon size={11} color="rgba(0,0,0,0.18)" />
              </View>
            </PressableScale>

            <PressableScale onPress={nav.community} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Community dhikr goals">
              <View style={styles.utilityRow}>
                <View style={[styles.utilityIcon, { backgroundColor: '#EDE9FE' }]}>
                  <CommunityIcon size={18} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.utilityTitle}>Community</Text>
                  <Text style={styles.utilitySubtitle}>
                    {communityTotal !== null
                      ? `${communityTotal >= 1000 ? `${(communityTotal / 1000).toFixed(1)}K` : communityTotal.toLocaleString()} shared recitations`
                      : 'Dhikr goals together'}
                  </Text>
                </View>
                <ArrowRightIcon size={11} color="rgba(0,0,0,0.18)" />
              </View>
            </PressableScale>
          </View>
        </Animated.View>
      </Animated.ScrollView>

      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
      {user && <DailyInsightSheet userId={user.id} displayName={displayName} />}
    </View>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────
// SME fix: card shadows matched to tokens.shadow.card (opacity 0.06, radius 8)
// rather than over-elevated values that fight the gradient.
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 20,
    paddingVertical: 17,
    paddingHorizontal: 18,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#1B2430',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(0,0,0,0.36)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  // SME fix: dark semi-transparent text reads well on medium-to-light gradient
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(20,20,20,0.48)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  statBand: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 22,
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#1B2430',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statAccentBar: {
    width: '100%',
    height: 2.5,
    opacity: 0.52,
  },
  // SME fix: paddingVertical reduced from 20 → 16 for compact stat band
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 2,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '200',
    color: '#1A1A1A',
    letterSpacing: -1.6,
    lineHeight: 40,
    fontVariant: ['tabular-nums'],
  },
  statNumberFaint: {
    fontSize: 18,
    fontWeight: '200',
    color: '#C4BAB0',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  statUnit: {
    fontSize: 11,
    color: '#C4BAB0',
    fontWeight: '400',
  },
  statKey: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginVertical: 12,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#1B2430',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  utilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    letterSpacing: -0.1,
  },
  utilitySubtitle: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.38)',
    marginTop: 2,
  },
});
