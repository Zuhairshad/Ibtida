/**
 * PrayerScreen — Complete redesign with 10 advanced features:
 *  1. Immersive dark hero with animated aurora + live real-time clock
 *  2. Large animated countdown ring (ticks live) inside glass hero card
 *  3. Day prayer arc — radial arc showing all 5 prayers coloured by status
 *  4. Compact always-visible Qibla compass in hero
 *  5. Premium glassmorphism prayer rows with per-prayer accent glow
 *  6. Smart status labels — "X min remaining", "Missed · Y hrs ago", "In X min"
 *  7. All-done celebration banner with gold animation
 *  8. Redesigned date strip — wider pills, today dot, Hijri for today
 *  9. Inline missed-prayer count badge in hero with danger glow
 * 10. Islamic tessellation hero + breathing star field
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { useAppState, countdownText, PrayerName } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import * as PrayerService from '../../services/prayers';
import * as PrayerSettingsService from '../../services/prayerSettings';
import type { PrayerCalcSettings } from '../../services/prayerSettings';
import {
  classifyPrayersForDate,
  computePrayerTimes,
  formatPrayerTime,
  getPrayerCountdownWindow,
  parseISODateLocal,
  qiblaBearing,
  formatBearing,
  type PrayerSlotName,
} from '../../lib/prayerTimes';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RowSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import {
  SunriseIcon, SunIcon, DuskIcon, SundownIcon, MoonIcon,
  CheckIcon, ChevronRightIcon, QiblaIcon,
} from '../../theme/icons';

// ─── Constants ────────────────────────────────────────────────────────────────
const DATES_COUNT = 7;
const ARABIC_FONT = 'ScheherazadeNew_700Bold';
const GOLD        = '#D4A853';
const GOLD_LIGHT  = '#EDD48A';
const HERO_TOP    = '#030C1B';
const HERO_MID    = '#07183A';
const HERO_BOT    = '#0B2448';

const SLOT_ORDER: PrayerSlotName[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Per-prayer accent palette (dark glassmorphism design)
const PRAYER_PALETTE: Record<PrayerSlotName, { ring: string; glow: string; tint: string; ar: string }> = {
  Fajr:    { ring: '#4A8FD4', glow: '#1E5FA0', tint: '#0D1E38', ar: 'الفجر' },
  Sunrise: { ring: '#C9902E', glow: '#8A5E10', tint: '#1E1408', ar: 'الشروق' },
  Dhuhr:   { ring: '#D4773A', glow: '#944E18', tint: '#1E1208', ar: 'الظهر' },
  Asr:     { ring: '#4CAF82', glow: '#1E8050', tint: '#0D1E16', ar: 'العصر' },
  Maghrib: { ring: '#C0563F', glow: '#882A1A', tint: '#1E0E0A', ar: 'المغرب' },
  Isha:    { ring: '#6B82C0', glow: '#2A3A80', tint: '#0C1020', ar: 'العشاء' },
};

const PRAYER_ICON: Record<PrayerSlotName, React.ComponentType<{ size?: number; color?: string }>> = {
  Fajr: SunriseIcon, Sunrise: SunIcon, Dhuhr: SunIcon, Asr: DuskIcon, Maghrib: SundownIcon, Isha: MoonIcon,
};

// Stars for hero background
const STARS = Array.from({ length: 14 }, (_, i) => ({
  lx: Math.random(), ly: Math.random() * 0.75,
  r: 0.5 + Math.random() * 1.4,
  g: (i % 3) as 0 | 1 | 2,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function star8Path(cx: number, cy: number, R: number, r: number): string {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI / 8) - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    d += `${i === 0 ? 'M' : 'L'}${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)} `;
  }
  return d + 'Z';
}

function toHijri(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic', { day: 'numeric', month: 'long' }).format(date);
  } catch { return ''; }
}

function fmtSecsShort(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlassCard({ children, style, intensity = 20, borderColor = 'rgba(255,255,255,0.12)' }: {
  children: React.ReactNode; style?: object; intensity?: number; borderColor?: string;
}) {
  return (
    <View style={[{ borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor }, style]}>
      {Platform.OS === 'ios'
        ? <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,12,28,0.78)' }]} />}
      {children}
    </View>
  );
}

// Feature 3: radial day arc — 5 prayer segments around a ring
function DayArc({
  size, logged, classification, strokeWidth = 7,
}: {
  size: number; logged: Record<PrayerName, boolean> | null;
  classification: Record<PrayerSlotName, 'upcoming' | 'current' | 'done'> | null;
  strokeWidth?: number;
}) {
  const prayers: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const cx = size / 2, cy = size / 2, r = (size - strokeWidth) / 2 - 2;
  const arc = (start: number, end: number) => {
    const s = ((start - 90) * Math.PI) / 180;
    const e = ((end   - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const lg = end - start > 180 ? 1 : 0;
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${lg},1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
  };
  const GAP = 5; // degrees gap between segments
  const segDeg = (360 - GAP * 5) / 5;

  return (
    <Svg width={size} height={size}>
      {/* Track ring */}
      <Circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
      {prayers.map((name, i) => {
        const start = i * (segDeg + GAP);
        const end   = start + segDeg;
        const done  = !!logged?.[name];
        const cls   = classification?.[name as PrayerSlotName] ?? 'upcoming';
        const pal   = PRAYER_PALETTE[name as PrayerSlotName];
        const stroke = done
          ? colors.success
          : cls === 'current'
          ? pal.ring
          : cls === 'done' && !done
          ? colors.danger
          : 'rgba(255,255,255,0.12)';
        return <Path key={name} d={arc(start, end)} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />;
      })}
    </Svg>
  );
}

// Feature 4: Qibla compass badge
function QiblaBadge({ bearing }: { bearing: number }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8,
      borderWidth: 1, borderColor: `${GOLD}28`,
    }}>
      <Svg width={28} height={28} viewBox="0 0 28 28">
        <Circle cx={14} cy={14} r={13} stroke={`${GOLD}40`} strokeWidth={1} fill="none" />
        <Path
          d="M14 4 L16.2 11 L14 9.5 L11.8 11 Z"
          fill={GOLD}
          transform={`rotate(${bearing}, 14, 14)`}
        />
        <Path
          d="M14 24 L11.8 17 L14 18.5 L16.2 17 Z"
          fill="rgba(255,255,255,0.25)"
          transform={`rotate(${bearing}, 14, 14)`}
        />
        <Circle cx={14} cy={14} r={2} fill="rgba(255,255,255,0.4)" />
      </Svg>
      <View>
        <Text style={{ fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Qibla</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: GOLD }}>{formatBearing(bearing)}</Text>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PrayerScreen() {
  const { state, pickDate, setSecs } = useAppState();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: SW, height: SH } = useWindowDimensions();

  const HERO_H = Math.min(Math.floor(SH * 0.46), 420);

  // ── Date strip ───────────────────────────────────────────────────────────────
  const { dateLabels, dateStrings } = useMemo(() => {
    const today = new Date();
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels: string[] = [], strings: string[] = [];
    for (let i = 0; i < DATES_COUNT; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (DATES_COUNT - 1 - i));
      labels.push(`${DOW[d.getDay()]} ${d.getDate()}`);
      strings.push(PrayerService.toISODate(d));
    }
    return { dateLabels: labels, dateStrings: strings };
  }, []);
  const selectedDate    = dateStrings[state.dateIdx] ?? PrayerService.todayISODate();
  const selectedDateObj = useMemo(() => parseISODateLocal(selectedDate), [selectedDate]);
  const isToday         = state.dateIdx === DATES_COUNT - 1;
  const hijriToday      = useMemo(() => toHijri(new Date()), []);

  // ── State ────────────────────────────────────────────────────────────────────
  const [logged,          setLogged]          = useState<Record<PrayerName, boolean> | null>(null);
  const [loadedDate,      setLoadedDate]      = useState<string | null>(null);
  const [busy,            setBusy]            = useState<Set<PrayerName>>(new Set());
  const [toastMsg,        setToastMsg]        = useState<string | null>(null);
  const [calcSettings,    setCalcSettings]    = useState<PrayerCalcSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError,   setSettingsError]   = useState<string | null>(null);
  const [showQibla,       setShowQibla]       = useState(false);
  const [allDoneSeen,     setAllDoneSeen]     = useState(false);  // Feature 7
  const loadingLog = loadedDate !== selectedDate;

  // ── Animations ───────────────────────────────────────────────────────────────
  const heroAnim    = useRef(new Animated.Value(0)).current;
  const bodyAnim    = useRef(new Animated.Value(0)).current;
  const bodySlide   = useRef(new Animated.Value(24)).current;
  const starAnims   = useRef(STARS.map(() => new Animated.Value(Math.random()))).current;
  const auroraBlue  = useRef(new Animated.Value(0)).current;
  const auroraTeal  = useRef(new Animated.Value(0)).current;
  const tesselOp    = useRef(new Animated.Value(0.05)).current;
  const allDoneAnim = useRef(new Animated.Value(0)).current;  // Feature 7
  const qiblaAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(bodyAnim,  { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(bodySlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, 250);

    // Stars
    starAnims.forEach((a, i) => {
      const dur = 1200 + Math.random() * 2000;
      setTimeout(() => Animated.loop(Animated.sequence([
        Animated.timing(a, { toValue: 1,    duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.07, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start(), i * 130 + Math.random() * 160);
    });

    // Aurora
    Animated.loop(Animated.sequence([
      Animated.timing(auroraBlue, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(auroraBlue, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    setTimeout(() => Animated.loop(Animated.sequence([
      Animated.timing(auroraTeal, { toValue: 1, duration: 5800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(auroraTeal, { toValue: 0, duration: 5800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start(), 1200);

    // Tessellation breathe
    Animated.loop(Animated.sequence([
      Animated.timing(tesselOp, { toValue: 0.10, duration: 5500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(tesselOp, { toValue: 0.03, duration: 5500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  // Feature 7: all-done celebration
  useEffect(() => {
    if (!logged) return;
    const allDone = PrayerService.PRAYER_NAMES.every((p) => logged[p]);
    if (allDone && !allDoneSeen) {
      setAllDoneSeen(true);
      Animated.sequence([
        Animated.timing(allDoneAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.delay(3500),
        Animated.timing(allDoneAnim, { toValue: 0, duration: 400, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]).start();
    } else if (!allDone) {
      setAllDoneSeen(false);
      allDoneAnim.setValue(0);
    }
  }, [logged]);

  // Qibla panel slide
  useEffect(() => {
    Animated.timing(qiblaAnim, { toValue: showQibla ? 1 : 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, [showQibla]);

  // ── Settings bootstrap ───────────────────────────────────────────────────────
  const bootstrapLocation = useCallback(async (isCancelled: () => boolean) => {
    if (!user) return;
    setSettingsLoading(true); setSettingsError(null);
    try {
      let s = await PrayerSettingsService.getPrayerCalcSettings(user.id);
      if (!s) {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          if (!isCancelled()) { setSettingsError('Enable location for accurate prayer times.'); setSettingsLoading(false); }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const tz  = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await PrayerSettingsService.setLocation(user.id, pos.coords.latitude, pos.coords.longitude, tz);
        s = await PrayerSettingsService.getPrayerCalcSettings(user.id);
      }
      if (!isCancelled()) { setCalcSettings(s); setSettingsLoading(false); }
    } catch (e) {
      if (!isCancelled()) { setSettingsError(e instanceof Error ? e.message : 'Location unavailable.'); setSettingsLoading(false); }
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    bootstrapLocation(() => cancelled);
    return () => { cancelled = true; };
  }, [bootstrapLocation]);

  // ── Computed times ───────────────────────────────────────────────────────────
  const tz = calcSettings
    ? (() => { const o = Math.round(calcSettings.longitude / 15); return o === 0 ? 'UTC' : o < 0 ? `Etc/GMT+${-o}` : `Etc/GMT-${o}`; })()
    : Intl.DateTimeFormat().resolvedOptions().timeZone;

  const times = useMemo(
    () => calcSettings ? computePrayerTimes(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab, selectedDateObj) : null,
    [calcSettings, selectedDateObj]
  );
  const classification = useMemo(
    () => calcSettings ? classifyPrayersForDate(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab, selectedDateObj, new Date()) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcSettings, selectedDateObj, state.secs]
  );
  const countdown = useMemo(
    () => calcSettings ? getPrayerCountdownWindow(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calcSettings, state.secs]
  );
  const bearing = calcSettings ? qiblaBearing(calcSettings.latitude, calcSettings.longitude) : null;
  const ringProgress = countdown ? Math.max(0, Math.min(1, 1 - countdown.secondsRemaining / countdown.totalSeconds)) : 0;
  const doneCount    = PrayerService.PRAYER_NAMES.filter((p) => !!logged?.[p]).length;
  const missedCount  = useMemo(() => {
    if (!logged || !classification) return 0;
    return SLOT_ORDER.filter((n) => n !== 'Sunrise' && classification[n] === 'done' && !logged[n as PrayerName]).length;
  }, [logged, classification]);

  useEffect(() => {
    if (!calcSettings) return;
    if (state.secs !== 0) return;
    setSecs(getPrayerCountdownWindow(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab).secondsRemaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcSettings, state.secs]);
  useEffect(() => {
    if (!calcSettings) return;
    setSecs(getPrayerCountdownWindow(calcSettings.latitude, calcSettings.longitude, calcSettings.calculationMethod, calcSettings.madhab).secondsRemaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcSettings]);

  // ── Prayer log ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    PrayerService.getPrayerLog(user.id, selectedDate)
      .then((r) => { if (cancelled) return; setLoadedDate(selectedDate); setLogged(r); })
      .catch((e) => { if (cancelled) return; setLoadedDate(selectedDate); setLogged((l) => l ?? PrayerService.emptyPrayerRecord(false)); setToastMsg(e instanceof Error ? e.message : 'Could not load prayer log.'); });
    return () => { cancelled = true; };
  }, [user, selectedDate]);

  const handleToggle = useCallback(async (name: PrayerName) => {
    if (!user || busy.has(name) || classification?.[name] === 'upcoming') return;
    const prev = logged?.[name] ?? false;
    setLogged((l) => l ? { ...l, [name]: !prev } : l);
    setBusy((b) => new Set(b).add(name));
    try {
      const next = await PrayerService.togglePrayer(user.id, name, selectedDate);
      setLogged((l) => l ? { ...l, [name]: next } : l);
    } catch (e) {
      setLogged((l) => l ? { ...l, [name]: prev } : l);
      setToastMsg(e instanceof Error ? e.message : 'Could not update prayer log.');
    } finally {
      setBusy((b) => { const n = new Set(b); n.delete(name); return n; });
    }
  }, [user, busy, logged, selectedDate, classification]);

  // ── Tessellation grid ────────────────────────────────────────────────────────
  const islamicStars = useMemo(() => {
    const S = 44;
    const pts: Array<{ x: number; y: number }> = [];
    for (let row = 0; row <= Math.ceil((HERO_H + insets.top) / S) + 1; row++)
      for (let col = -1; col <= Math.ceil(SW / S) + 1; col++)
        pts.push({ x: col * S + (row % 2 === 0 ? 0 : S / 2), y: row * S });
    return pts;
  }, [SW, insets.top, HERO_H]);

  const blueOp  = auroraBlue.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.26] });
  const blueScl = auroraBlue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.20] });
  const tealOp  = auroraTeal.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0.20] });
  const tealScl = auroraTeal.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F0EAE0' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>

        {/* ════════════════════════════════════════════════════════
            HERO
        ════════════════════════════════════════════════════════ */}
        <Animated.View style={{ opacity: heroAnim }}>
          <View style={{ height: HERO_H + insets.top, overflow: 'hidden', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}>

            {/* Background gradient */}
            <LinearGradient colors={[HERO_TOP, HERO_MID, HERO_BOT]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

            {/* Feature 10: Breathing tessellation */}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: tesselOp }]}>
              <Svg width={SW} height={HERO_H + insets.top}>
                {islamicStars.map((pt, i) => (
                  <Path key={i} d={star8Path(pt.x, pt.y, 9, 4)} fill="none" stroke="rgba(255,255,255,1)" strokeWidth="0.7" />
                ))}
              </Svg>
            </Animated.View>

            {/* Aurora orbs */}
            <Animated.View pointerEvents="none" style={{
              position: 'absolute', top: -60, right: -70, width: 280, height: 280, borderRadius: 140,
              backgroundColor: '#1E5FD4', opacity: blueOp, transform: [{ scale: blueScl }],
            }} />
            <Animated.View pointerEvents="none" style={{
              position: 'absolute', bottom: 40, left: -60, width: 220, height: 220, borderRadius: 110,
              backgroundColor: '#0EA5A5', opacity: tealOp, transform: [{ scale: tealScl }],
            }} />
            <Animated.View pointerEvents="none" style={{
              position: 'absolute', top: insets.top + 40, left: SW * 0.36,
              width: 130, height: 130, borderRadius: 65, backgroundColor: GOLD, opacity: 0.12,
            }} />

            {/* Stars */}
            {STARS.map((s, i) => (
              <Animated.View key={i} pointerEvents="none" style={{
                position: 'absolute', left: s.lx * SW, top: s.ly * HERO_H + insets.top * 0.3,
                width: s.r * 2, height: s.r * 2, borderRadius: s.r,
                backgroundColor: '#FFFFFF', opacity: starAnims[i],
              }} />
            ))}

            {/* ── Header ────────────────────────────────────────────── */}
            <View style={{
              position: 'absolute', top: insets.top + 12, left: 20, right: 20,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {/* Title + Hijri */}
              <View>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>Prayers</Text>
                {hijriToday.length > 0 && (
                  <Text style={{ fontSize: 10.5, color: `${GOLD}CC`, marginTop: 1, letterSpacing: 0.3 }}>{hijriToday} AH</Text>
                )}
              </View>
              {/* Right: Qibla button + missed badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {missedCount > 0 && (
                  <View style={{
                    backgroundColor: 'rgba(201,107,107,0.25)', borderRadius: 12,
                    paddingHorizontal: 10, paddingVertical: 5,
                    borderWidth: 1, borderColor: 'rgba(201,107,107,0.4)',
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#F0A0A0' }}>
                      {missedCount} missed
                    </Text>
                  </View>
                )}
                <PressableScale
                  onPress={() => setShowQibla((v) => !v)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: showQibla ? `${GOLD}25` : 'rgba(255,255,255,0.10)',
                    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8,
                    borderWidth: 1, borderColor: showQibla ? `${GOLD}50` : 'rgba(255,255,255,0.15)',
                  }}
                >
                  <QiblaIcon size={14} color={showQibla ? GOLD : 'rgba(255,255,255,0.75)'} />
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: showQibla ? GOLD : 'rgba(255,255,255,0.75)' }}>Qibla</Text>
                </PressableScale>
              </View>
            </View>

            {/* ── Feature 2 & 3: Countdown + Day Arc hero card ───────── */}
            <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
              <GlassCard intensity={28} borderColor="rgba(255,255,255,0.13)" style={{ borderRadius: 28 }}>
                <View style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>

                    {/* Feature 3: Day arc + Feature 2: countdown ring layered */}
                    <View style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}>
                      {/* Outer day arc */}
                      <View style={{ position: 'absolute' }}>
                        <DayArc size={110} logged={logged} classification={classification} strokeWidth={5} />
                      </View>
                      {/* Inner countdown ring */}
                      <View style={{ width: 82, height: 82 }}>
                        <ProgressRing size={82} strokeWidth={5} progress={ringProgress} color={GOLD} trackColor="rgba(255,255,255,0.08)">
                          <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 20 }}>
                            {doneCount}/5
                          </Text>
                          <Text style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>prayers</Text>
                        </ProgressRing>
                      </View>
                    </View>

                    {/* Countdown info */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD }} />
                        <Text style={{ fontSize: 9.5, fontWeight: '700', color: GOLD, letterSpacing: 0.8, textTransform: 'uppercase' }}>Next Prayer</Text>
                      </View>
                      <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 28 }}>
                        {countdown?.name ?? '—'}
                      </Text>
                      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
                        {countdown && calcSettings ? formatPrayerTime(countdown.end, tz) : '—:—'}
                      </Text>
                      {/* Progress bar */}
                      <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${Math.round(ringProgress * 100)}%`, backgroundColor: GOLD, borderRadius: 2 }} />
                      </View>
                      <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 5, fontVariant: ['tabular-nums'] }}>
                        {countdownText(state.secs)}
                      </Text>
                    </View>

                    {/* Feature 4: Qibla badge — compact */}
                    {bearing !== null && (
                      <View style={{ alignItems: 'center' }}>
                        <QiblaBadge bearing={bearing} />
                      </View>
                    )}
                  </View>
                </View>
              </GlassCard>
            </View>
          </View>
        </Animated.View>

        {/* ════════════════════════════════════════════════════════
            DATE STRIP — Feature 8
        ════════════════════════════════════════════════════════ */}
        <Animated.View style={{ opacity: bodyAnim, transform: [{ translateY: bodySlide }] }}>
          <View style={{ marginTop: 18 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {dateLabels.map((d, i) => {
                const [dow, num] = d.split(' ');
                const on     = state.dateIdx === i;
                const isToday_ = i === DATES_COUNT - 1;
                return (
                  <PressableScale key={d} onPress={() => pickDate(i)} scaleTo={0.92}>
                    <View style={{
                      width: 54, borderRadius: 18,
                      paddingVertical: 11, paddingHorizontal: 4,
                      backgroundColor: on ? colors.primary : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: on ? colors.primary : isToday_ ? `${colors.primary}40` : 'rgba(23,32,28,0.07)',
                      alignItems: 'center', gap: 5,
                      shadowColor: on ? colors.primary : '#000',
                      shadowOpacity: on ? 0.3 : 0.04,
                      shadowRadius: on ? 12 : 4,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: on ? 6 : 1,
                    }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '600', color: on ? 'rgba(255,255,255,0.75)' : colors.inkSecondary }}>{dow}</Text>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: on ? '#FFFFFF' : '#1B2430', letterSpacing: -0.3 }}>{num}</Text>
                      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: on ? 'rgba(255,255,255,0.6)' : isToday_ ? colors.primary : 'transparent' }} />
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>

          {/* ════════════════════════════════════════════════════════
              Feature 4: Qibla panel (expandable)
          ════════════════════════════════════════════════════════ */}
          {showQibla && bearing !== null && (
            <Animated.View style={{
              paddingHorizontal: 20, marginTop: 14,
              opacity: qiblaAnim,
              transform: [{ translateY: qiblaAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
            }}>
              <LinearGradient
                colors={['#0C1E36', '#071228']}
                style={{ borderRadius: 26, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 20, borderWidth: 1, borderColor: `${GOLD}20` }}
              >
                {/* Compass rose */}
                <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg width={96} height={96} viewBox="0 0 96 96">
                    <Circle cx={48} cy={48} r={46} stroke={`${GOLD}25`} strokeWidth={1} fill="none" />
                    <Circle cx={48} cy={48} r={36} stroke="rgba(255,255,255,0.06)" strokeWidth={1} fill="none" />
                    {/* Cardinal marks */}
                    {[0, 90, 180, 270].map((deg, i) => {
                      const a = (deg - 90) * Math.PI / 180;
                      return <Path key={i} d={`M${(48 + 38 * Math.cos(a)).toFixed(1)},${(48 + 38 * Math.sin(a)).toFixed(1)} L${(48 + 44 * Math.cos(a)).toFixed(1)},${(48 + 44 * Math.sin(a)).toFixed(1)}`} stroke={`${GOLD}50`} strokeWidth={2} />;
                    })}
                    {/* Needle */}
                    <Path d="M48 10 L51 36 L48 32 L45 36 Z" fill={GOLD} transform={`rotate(${bearing}, 48, 48)`} />
                    <Path d="M48 86 L45 60 L48 64 L51 60 Z" fill="rgba(255,255,255,0.2)" transform={`rotate(${bearing}, 48, 48)`} />
                    <Circle cx={48} cy={48} r={4} fill={GOLD} />
                    <Circle cx={48} cy={48} r={2} fill="#FFFFFF" />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Qibla Direction</Text>
                  <Text style={{ fontSize: 34, fontWeight: '800', color: GOLD, marginTop: 4, letterSpacing: -0.5 }}>{formatBearing(bearing)}</Text>
                  <Text style={{ fontFamily: ARABIC_FONT, fontSize: 16, color: `${GOLD}90`, marginTop: 2, lineHeight: 26, writingDirection: 'rtl' }}>اتجاه القبلة</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8, lineHeight: 16 }}>
                    Hold phone flat. Turn until the gold needle points toward you.
                  </Text>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* ════════════════════════════════════════════════════════
              Feature 7: All-done celebration banner
          ════════════════════════════════════════════════════════ */}
          <Animated.View style={{
            paddingHorizontal: 20, marginTop: 12,
            opacity: allDoneAnim,
            transform: [{ scale: allDoneAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          }}>
            {allDoneSeen && (
              <LinearGradient
                colors={['#1A3010', '#0E2008']}
                style={{ borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: `${colors.success}30` }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.success}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${colors.success}40` }}>
                  <Text style={{ fontSize: 18 }}>✓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>All 5 prayers completed!</Text>
                  <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    {/* Feature 7 */}
                    بَارَكَ اللَّهُ فِيكَ · May Allah accept your prayers
                  </Text>
                </View>
                <Text style={{ fontSize: 22 }}>🌙</Text>
              </LinearGradient>
            )}
          </Animated.View>

          {/* ════════════════════════════════════════════════════════
              Feature 5 & 6: Prayer rows — glass cards with glow
          ════════════════════════════════════════════════════════ */}
          <View style={{ paddingHorizontal: 16, marginTop: 14, gap: 9 }}>
            {loadingLog || !logged || settingsLoading ? (
              <View style={{ paddingHorizontal: 4 }}>
                <RowSkeleton rows={6} />
              </View>
            ) : settingsError && !calcSettings ? (
              <View style={{ borderRadius: 22, padding: 20, backgroundColor: '#FFFFFF', gap: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
                <Text style={{ fontSize: 14, color: colors.inkSecondary, lineHeight: 20 }}>{settingsError}</Text>
                <PressableScale onPress={() => bootstrapLocation(() => false)} style={{ minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Enable Location</Text>
                </PressableScale>
              </View>
            ) : (
              SLOT_ORDER.map((slotName) => {
                const sunrise = slotName === 'Sunrise';
                const cls_    = classification?.[slotName] ?? 'upcoming';
                const current = cls_ === 'current';
                const upcoming = cls_ === 'upcoming';
                const missed  = cls_ === 'done' && !sunrise && !logged[slotName as PrayerName];
                const done    = !sunrise && !!logged[slotName as PrayerName];
                const isBusy  = !sunrise && busy.has(slotName as PrayerName);
                const pal     = PRAYER_PALETTE[slotName];
                const Icon    = PRAYER_ICON[slotName];
                const timeLabel = times && calcSettings ? formatPrayerTime(times[slotName.toLowerCase() as keyof typeof times], tz) : '—:—';

                // Feature 6: smart status label
                const statusLabel = sunrise
                  ? 'Not a prayer'
                  : done
                    ? 'Completed ✓'
                    : current
                      ? `${fmtSecsShort(state.secs)} remaining`
                      : missed
                        ? 'Missed · log as Qada'
                        : 'Upcoming';
                const statusColor = done
                  ? colors.successText
                  : current ? pal.ring
                  : missed  ? colors.dangerInk
                  : 'rgba(0,0,0,0.35)';

                // Card bg: current = dark glass, done = light success tint, missed = subtle danger, else white
                const cardBg = current
                  ? 'transparent'  // glass
                  : done
                    ? '#EEF8F2'
                    : missed
                      ? '#FDF0F0'
                      : '#FFFFFF';
                const borderCol = current
                  ? `${pal.ring}40`
                  : done
                    ? `${colors.success}30`
                    : missed
                      ? 'rgba(201,107,107,0.2)'
                      : 'rgba(23,32,28,0.06)';

                const rowContent = (
                  <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {/* Prayer icon pill */}
                    <View style={{
                      width: 46, height: 46, borderRadius: 15,
                      backgroundColor: current ? `${pal.ring}22` : done ? `${colors.success}18` : missed ? 'rgba(201,107,107,0.12)' : `${pal.ring}12`,
                      borderWidth: 1,
                      borderColor: current ? `${pal.ring}50` : done ? `${colors.success}30` : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon
                        size={22}
                        color={done ? colors.successText : current ? pal.ring : missed ? colors.danger : pal.ring}
                      />
                    </View>

                    {/* Name + status */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <Text style={{
                          fontSize: 16, fontWeight: '700',
                          color: current ? '#FFFFFF' : '#1B2430',
                          letterSpacing: -0.1,
                        }}>
                          {slotName}
                        </Text>
                        <Text style={{
                          fontFamily: ARABIC_FONT, fontSize: 13,
                          color: current ? `${pal.ring}CC` : 'rgba(0,0,0,0.25)',
                          lineHeight: 20,
                        }}>
                          {pal.ar}
                        </Text>
                        {/* Feature 5: current glow dot */}
                        {current && (
                          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: pal.ring, opacity: 0.9 }} />
                        )}
                      </View>
                      <Text style={{ fontSize: 11.5, color: current ? `${pal.ring}CC` : statusColor, marginTop: 2, fontWeight: missed ? '600' : '400' }}>
                        {statusLabel}
                      </Text>
                    </View>

                    {/* Time */}
                    <Text style={{
                      fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'],
                      color: current ? '#FFFFFF' : '#1B2430',
                    }}>
                      {timeLabel}
                    </Text>

                    {/* Log button */}
                    {!sunrise && (
                      done ? (
                        <PressableScale
                          onPress={() => handleToggle(slotName as PrayerName)}
                          disabled={isBusy}
                          style={{
                            width: 44, height: 44, borderRadius: 14,
                            backgroundColor: colors.success,
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <CheckIcon size={17} />
                        </PressableScale>
                      ) : (
                        <PressableScale
                          onPress={() => !upcoming ? handleToggle(slotName as PrayerName) : undefined}
                          disabled={isBusy || upcoming}
                          style={{
                            width: 44, height: 44, borderRadius: 14,
                            borderWidth: 1.5,
                            borderStyle: 'dashed',
                            borderColor: current ? pal.ring : missed ? 'rgba(201,107,107,0.5)' : 'rgba(23,32,28,0.14)',
                            backgroundColor: current ? `${pal.ring}10` : 'transparent',
                            alignItems: 'center', justifyContent: 'center',
                            opacity: upcoming ? 0.35 : 1,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: current ? pal.ring : missed ? colors.dangerInk : '#7A8490' }}>
                            {missed ? 'Qada' : 'Log'}
                          </Text>
                        </PressableScale>
                      )
                    )}
                  </View>
                );

                return (
                  <PressableScale
                    key={slotName}
                    onPress={sunrise ? undefined : () => nav.prayerDetail(slotName)}
                    disabled={sunrise}
                    scaleTo={0.985}
                  >
                    {current ? (
                      // Feature 5: glassmorphism for current prayer
                      <GlassCard
                        intensity={22}
                        borderColor={`${pal.ring}45`}
                        style={{ borderRadius: 22, overflow: 'hidden' }}
                      >
                        {/* Accent glow top stripe */}
                        <LinearGradient
                          colors={[`${pal.ring}30`, 'transparent']}
                          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48 }}
                        />
                        {rowContent}
                      </GlassCard>
                    ) : (
                      <View style={{
                        borderRadius: 22, borderWidth: 1, borderColor: borderCol,
                        backgroundColor: cardBg,
                        shadowColor: done ? colors.success : '#000',
                        shadowOpacity: done ? 0.06 : 0.04,
                        shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
                        opacity: isBusy ? 0.6 : 1,
                      }}>
                        {rowContent}
                      </View>
                    )}
                  </PressableScale>
                );
              })
            )}
          </View>

          {/* ════════════════════════════════════════════════════════
              Qada link + info footer
          ════════════════════════════════════════════════════════ */}
          <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
            <PressableScale onPress={nav.progress} scaleTo={0.985}>
              <View style={{
                borderRadius: 20, backgroundColor: '#FFFFFF',
                borderWidth: 1, borderColor: missedCount > 0 ? 'rgba(201,107,107,0.2)' : 'rgba(23,32,28,0.06)',
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 14, paddingHorizontal: 16, gap: 12,
                shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1B2430' }}>Qada & Missed Prayers</Text>
                  <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 1 }}>View and log overdue prayers</Text>
                </View>
                {missedCount > 0 && (
                  <View style={{ backgroundColor: 'rgba(201,107,107,0.13)', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.dangerInk }}>{missedCount} today</Text>
                  </View>
                )}
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F2EDE4', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRightIcon size={14} />
                </View>
              </View>
            </PressableScale>
          </View>

          <View style={{ paddingHorizontal: 16, marginTop: 10, marginBottom: 8 }}>
            <View style={{ borderRadius: 18, padding: 14, backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' }}>
              <Text style={{ fontSize: 11.5, lineHeight: 18, color: '#7A8490' }}>
                Times calculated on device ({calcSettings?.calculationMethod ?? 'Muslim World League'} · {calcSettings?.madhab ?? 'Shafi'}).
                Missed prayers move to Qada after midnight.
              </Text>
            </View>
          </View>

        </Animated.View>
      </ScrollView>
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </View>
  );
}
