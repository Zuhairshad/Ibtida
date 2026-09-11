/**
 * TasbeehScreen — Redesigned with 10 advanced features:
 *  1. Immersive cosmic dark background with animated twinkling stars
 *  2. Large central progress ring (replaces top-right count)
 *  3. Per-dhikr accent color system (ring, glow, particles all match dhikr)
 *  4. Pearl bead strand with SVG thread + 3-D highlight on active bead
 *  5. Live session timer (mm:ss) in header
 *  6. Niyyah / benefit strip — rotating hadith text for current dhikr
 *  7. Long-press anywhere to undo last count (−1 for mis-taps)
 *  8. Milestone haptic feedback — distinct pattern at ×10, ⅓ goal, round complete
 *  9. Vibration toggle button (header right)
 * 10. Premium frosted-glass dhikr selector cards with Scheherazade Arabic
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../state/AuthContext';
import { getTasbeehSession, setTasbeehCount, listGoals } from '../../services/adhkar';
import { colors } from '../../theme/tokens';
import ProgressRing from '../../components/ProgressRing';
import Toast from '../../components/Toast';

// ─── Fonts ───────────────────────────────────────────────────────────────────
const ARABIC  = 'ScheherazadeNew_400Regular';
const ARABIC_B = 'ScheherazadeNew_700Bold';

// ─── Feature 3: per-dhikr accent palette ─────────────────────────────────────
const ACCENT: Record<string, { ring: string; glow: string; particle: string; bg: string }> = {
  subhanallah:    { ring: '#38C6A8', glow: '#1DA88C', particle: '#7DDDCC', bg: '#0A1E1B' },
  alhamdulillah:  { ring: '#D4A853', glow: '#A07830', particle: '#EDD48A', bg: '#1A130A' },
  allahuakbar:    { ring: '#9B7CF7', glow: '#6344D0', particle: '#C4B0FC', bg: '#110C1F' },
  astaghfirullah: { ring: '#5B9FE4', glow: '#2660A0', particle: '#93C5FD', bg: '#09142A' },
  lailaha:        { ring: '#E07878', glow: '#B05050', particle: '#F0A8A8', bg: '#1E0A0A' },
  durood:         { ring: '#F5B942', glow: '#B45309', particle: '#FCD34D', bg: '#1A1000' },
  hauqala:        { ring: '#7B8AF0', glow: '#4338CA', particle: '#A5B4FC', bg: '#0C0E1E' },
};
const ACCENT_DEFAULT = ACCENT.alhamdulillah;

// ─── Feature 6: Niyyah text per dhikr ────────────────────────────────────────
const NIYYAH: Record<string, string> = {
  subhanallah:    'A tree is planted in Jannah for every recitation — Tirmidhi 3464',
  alhamdulillah:  'Alhamdulillah fills the entire Scale of deeds — Sahih Muslim 223',
  allahuakbar:    'Heaviest on the Scale, lightest on the tongue — Sahih Bukhari 6682',
  astaghfirullah: 'The Prophet ﷺ sought forgiveness 100 times every day — Muslim 2702',
  lailaha:        'The best dhikr is La ilaha illallah — Tirmidhi 3383',
  durood:         'Allah sends 10 blessings upon you for each — Sahih Muslim 408',
  hauqala:        'A treasure from the treasures of Jannah — Sahih Bukhari',
};

// ─── Dhikr data ──────────────────────────────────────────────────────────────
type DhikrItem = {
  key: string;
  arabic: string;
  transliteration: string;
  goal: number;
  source: 'builtin' | 'goal';
};

const BUILTIN_DHIKR: DhikrItem[] = [
  { key: 'subhanallah',    arabic: 'سُبْحَانَ اللهِ',                          transliteration: 'SubhanAllah',           goal: 33,  source: 'builtin' },
  { key: 'alhamdulillah',  arabic: 'الْحَمْدُ لِلَّهِ',                         transliteration: 'Alhamdulillah',         goal: 33,  source: 'builtin' },
  { key: 'allahuakbar',    arabic: 'اللهُ أَكْبَرُ',                            transliteration: 'AllahuAkbar',           goal: 33,  source: 'builtin' },
  { key: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ اللهَ',                        transliteration: 'Astaghfirullah',        goal: 100, source: 'builtin' },
  { key: 'lailaha',        arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',                transliteration: 'La ilaha illallah',     goal: 100, source: 'builtin' },
  { key: 'durood',         arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',           transliteration: 'Durood Ibrahim',        goal: 100, source: 'builtin' },
  { key: 'hauqala',        arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',  transliteration: 'La hawla wala quwwata', goal: 100, source: 'builtin' },
];

const TITLE_TO_ARABIC: Record<string, string> = {
  'SubhanAllah': 'سُبْحَانَ اللهِ', 'Alhamdulillah': 'الْحَمْدُ لِلَّهِ',
  'AllahuAkbar': 'اللهُ أَكْبَرُ', 'Astaghfirullah': 'أَسْتَغْفِرُ اللهَ',
  'La ilaha illallah': 'لَا إِلَٰهَ إِلَّا اللَّهُ', 'Laa ilaaha illallah': 'لَا إِلَٰهَ إِلَّا اللَّهُ',
  'Durood Sharif': 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', 'Durood Ibrahim': 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
};

// ─── Feature 1: Star field data ───────────────────────────────────────────────
const STARS = Array.from({ length: 36 }, (_, i) => ({
  lx: Math.random(), ly: Math.random() * 0.72,
  r: 0.5 + Math.random() * 1.3,
  group: i % 3 as 0 | 1 | 2,
}));

// ─── Feature 4: Bead geometry ─────────────────────────────────────────────────
const BEAD_R = 21;
const BEAD_SPACING = 54;
const ARC_DEPTH = 46;
const N_RENDER = 9;
const CENTER_IDX = 4;
const SVG_PAD = 8;
const SVG_H = SVG_PAD + BEAD_R + ARC_DEPTH + BEAD_R + SVG_PAD;
const CONTAINER_W = BEAD_R * 2 + N_RENDER * BEAD_SPACING;
const GLOW_R = 64;
const ANIM_MS = 380;
const STROKE_W = 1.5;
const N_PARTICLES = 14;

function beadCY(relIdx: number): number {
  const n = Math.min(Math.abs(relIdx) / CENTER_IDX, 1);
  return SVG_PAD + BEAD_R + ARC_DEPTH * (1 - n * n);
}

// Thread path through all bead centers
function threadPath(): string {
  return Array.from({ length: N_RENDER }, (_, i) => {
    const cx = BEAD_R + i * BEAD_SPACING;
    const cy = beadCY(i - CENTER_IDX);
    return `${i === 0 ? 'M' : 'L'}${cx.toFixed(1)},${cy.toFixed(1)}`;
  }).join(' ');
}

const particles = Array.from({ length: N_PARTICLES }, (_, i) => {
  const a = (i / N_PARTICLES) * 2 * Math.PI;
  const d = 40 + Math.random() * 12;
  return { dx: Math.cos(a) * d, dy: Math.sin(a) * d };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TasbeehScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: SW, height: SH } = useWindowDimensions();

  // ── State ────────────────────────────────────────────────────────────────────
  const [activeDhikr,     setActiveDhikr]     = useState<DhikrItem>(BUILTIN_DHIKR[0]);
  const [goalDhikr,       setGoalDhikr]       = useState<DhikrItem[]>([]);
  const [count,           setCount]           = useState(0);
  const [rounds,          setRounds]          = useState(0);
  const [toast,           setToast]           = useState<string | null>(null);
  const [elapsed,         setElapsed]         = useState(0);          // Feature 5
  const [vibrationOn,     setVibrationOn]     = useState(true);       // Feature 9

  const activeDhikrRef  = useRef<DhikrItem>(BUILTIN_DHIKR[0]);
  const countRef        = useRef(0);
  const roundsRef       = useRef(0);
  const isAnimating     = useRef(false);
  const dhikrCounts     = useRef<Record<string, { count: number; rounds: number }>>({});
  const sessionStart    = useRef(Date.now());
  const selectorRef     = useRef<ScrollView>(null);

  // ── Animations ───────────────────────────────────────────────────────────────
  const slideAnim       = useRef(new Animated.Value(0)).current;
  const [slideVal,      setSlideVal]     = useState(0);

  const glowScale       = useRef(new Animated.Value(0.6)).current;
  const glowOpacity     = useRef(new Animated.Value(0)).current;
  const plusOneY        = useRef(new Animated.Value(0)).current;
  const plusOneOpacity  = useRef(new Animated.Value(0)).current;
  const ringScale       = useRef(new Animated.Value(1)).current;
  const ringOpacity     = useRef(new Animated.Value(0)).current;
  const beadBounce      = useRef(new Animated.Value(1)).current;
  const roundFlash      = useRef(new Animated.Value(0)).current;
  const textOpacity     = useRef(new Animated.Value(1)).current;
  const niyyahOpacity   = useRef(new Animated.Value(1)).current;
  const idleGlowScale   = useRef(new Animated.Value(1)).current;
  const idleGlowOpacity = useRef(new Animated.Value(0)).current;
  // Feature 1: 3-group star twinkle
  const starAnims       = useRef([
    new Animated.Value(0.8),
    new Animated.Value(0.35),
    new Animated.Value(0.6),
  ]).current;

  const particleX  = useRef(particles.map(() => new Animated.Value(0))).current;
  const particleY  = useRef(particles.map(() => new Animated.Value(0))).current;
  const particleOp = useRef(particles.map(() => new Animated.Value(0))).current;
  const particleSc = useRef(particles.map(() => new Animated.Value(1))).current;

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleLoop  = useRef<Animated.CompositeAnimation | null>(null);

  // ── Feature 3: accent color from active dhikr ────────────────────────────────
  const ac = ACCENT[activeDhikr.key] ?? ACCENT_DEFAULT;

  // ── Slide → color ────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = slideAnim.addListener(({ value }) => setSlideVal(value));
    return () => slideAnim.removeListener(id);
  }, [slideAnim]);

  // ── Feature 1: Twinkling stars ───────────────────────────────────────────────
  useEffect(() => {
    const SPEEDS = [1400, 2100, 1800];
    starAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1,   duration: SPEEDS[i], easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.08,duration: SPEEDS[i], easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  // ── Feature 5: Session timer ─────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      sessionStart.current = Date.now();
      setElapsed(0);
      const timer = setInterval(() => {
        setElapsed(Math.floor((Date.now() - sessionStart.current) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }, [])
  );

  // ── Load session + goals ─────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      getTasbeehSession(user.id)
        .then((s) => {
          if (!active) return;
          const goal = activeDhikrRef.current.goal;
          const c = s.count % goal;
          const r = Math.floor(s.count / goal);
          setCount(c); setRounds(r);
          countRef.current = c; roundsRef.current = r;
        })
        .catch(() => active && setToast('Could not load your session.'));
      listGoals(user.id)
        .then((goals) => {
          if (!active) return;
          setGoalDhikr(goals.map((g) => ({
            key: `goal_${g.id}`,
            arabic: TITLE_TO_ARABIC[g.title] ?? g.title,
            transliteration: g.title,
            goal: g.target,
            source: 'goal' as const,
          })));
        })
        .catch(() => {});
      return () => { active = false; };
    }, [user])
  );

  // Auto-scroll selector to active card
  useEffect(() => {
    const allItems = [...BUILTIN_DHIKR, ...goalDhikr];
    const idx = allItems.findIndex((d) => d.key === activeDhikr.key);
    if (idx >= 0) {
      setTimeout(() => {
        selectorRef.current?.scrollTo({ x: idx * (CARD_W + 12) - 16, animated: true });
      }, 80);
    }
  }, [activeDhikr.key, goalDhikr]);

  // ── Idle breath ──────────────────────────────────────────────────────────────
  function startIdleBreath() {
    stopIdleBreath();
    Animated.timing(idleGlowOpacity, { toValue: 0.5, duration: 400, useNativeDriver: true }).start();
    idleLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(idleGlowScale, { toValue: 1.14, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(idleGlowScale, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    idleLoop.current.start();
  }
  function stopIdleBreath() {
    idleLoop.current?.stop();
    idleLoop.current = null;
    idleGlowScale.setValue(1);
    Animated.timing(idleGlowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }
  function scheduleIdleBreath() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(startIdleBreath, 1600);
  }
  useEffect(() => {
    scheduleIdleBreath();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); stopIdleBreath(); };
  }, []);

  // ── Feature 8: Milestone haptics ─────────────────────────────────────────────
  function fireMilestoneHaptic(nextCount: number, goal: number) {
    if (!vibrationOn) return;
    const third = Math.floor(goal / 3);
    if (nextCount === goal) {
      // Round complete
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      [80, 160, 240].forEach((d) => setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), d));
    } else if (third > 0 && (nextCount === third || nextCount === 2 * third)) {
      // ⅓ milestone
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 80);
    } else if (nextCount > 0 && nextCount % 10 === 0) {
      // Every ×10
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }

  // ── Visual burst ─────────────────────────────────────────────────────────────
  function fireVisuals() {
    glowScale.setValue(0.6); glowOpacity.setValue(0.92);
    Animated.parallel([
      Animated.timing(glowScale,   { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start();

    plusOneY.setValue(0); plusOneOpacity.setValue(1);
    Animated.sequence([
      Animated.timing(plusOneY,       { toValue: -26, duration: 400, useNativeDriver: true }),
      Animated.timing(plusOneOpacity, { toValue: 0,   duration: 140, useNativeDriver: true }),
    ]).start();

    ringScale.setValue(1); ringOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(ringScale,   { toValue: 3.0, duration: 520, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 0,   duration: 520, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    beadBounce.setValue(1);
    Animated.sequence([
      Animated.timing(beadBounce, { toValue: 1.5, duration: 130, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(beadBounce, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
    ]).start();

    particles.forEach((_, i) => {
      particleX[i].setValue(0); particleY[i].setValue(0);
      particleOp[i].setValue(1); particleSc[i].setValue(1);
      Animated.parallel([
        Animated.timing(particleX[i],  { toValue: particles[i].dx, duration: 680, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(particleY[i],  { toValue: particles[i].dy, duration: 680, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(particleOp[i], { toValue: 0, duration: 680, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(particleSc[i], { toValue: 0.3, duration: 680, useNativeDriver: true }),
      ]).start();
    });
  }

  // ── Tap handler ──────────────────────────────────────────────────────────────
  const onTap = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    stopIdleBreath();
    scheduleIdleBreath();
    if (vibrationOn) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fireVisuals();

    Animated.timing(slideAnim, {
      toValue: -BEAD_SPACING,
      duration: ANIM_MS,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: false,
    }).start(() => {
      slideAnim.setValue(0);
      const goal = activeDhikrRef.current.goal;
      const nextCount = countRef.current + 1;

      fireMilestoneHaptic(nextCount, goal);

      if (nextCount >= goal) {
        const nextRounds = roundsRef.current + 1;
        countRef.current = 0; roundsRef.current = nextRounds;
        setCount(0); setRounds(nextRounds);
        dhikrCounts.current[activeDhikrRef.current.key] = { count: 0, rounds: nextRounds };
        if (user) setTasbeehCount(user.id, nextRounds * goal).catch(() => {});
        roundFlash.setValue(0.28);
        Animated.timing(roundFlash, { toValue: 0, duration: 800, useNativeDriver: true }).start();
      } else {
        countRef.current = nextCount;
        setCount(nextCount);
        dhikrCounts.current[activeDhikrRef.current.key] = { count: nextCount, rounds: roundsRef.current };
        if (user) setTasbeehCount(user.id, roundsRef.current * goal + nextCount).catch(() => {});
      }
      isAnimating.current = false;
    });
  };

  // ── Feature 7: Long-press undo ───────────────────────────────────────────────
  const onUndo = () => {
    if (countRef.current <= 0 && roundsRef.current <= 0) return;
    if (vibrationOn) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const goal = activeDhikrRef.current.goal;
    let newCount = countRef.current - 1;
    let newRounds = roundsRef.current;
    if (newCount < 0) { newRounds = Math.max(0, roundsRef.current - 1); newCount = goal - 1; }
    countRef.current = newCount; roundsRef.current = newRounds;
    setCount(newCount); setRounds(newRounds);
    dhikrCounts.current[activeDhikrRef.current.key] = { count: newCount, rounds: newRounds };
    if (user) setTasbeehCount(user.id, newRounds * goal + newCount).catch(() => {});
    setToast('−1  ·  Long-press removes last count');
  };

  const onReset = () => {
    setCount(0); setRounds(0);
    countRef.current = 0; roundsRef.current = 0;
    dhikrCounts.current[activeDhikrRef.current.key] = { count: 0, rounds: 0 };
    if (user) setTasbeehCount(user.id, 0).catch(() => setToast('Could not save.'));
  };

  const switchDhikr = (item: DhikrItem) => {
    dhikrCounts.current[activeDhikrRef.current.key] = { count: countRef.current, rounds: roundsRef.current };

    // Fade out text + niyyah
    Animated.parallel([
      Animated.timing(textOpacity,   { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(niyyahOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      activeDhikrRef.current = item;
      setActiveDhikr(item);
      const cached = dhikrCounts.current[item.key];
      countRef.current  = cached?.count  ?? 0;
      roundsRef.current = cached?.rounds ?? 0;
      setCount(countRef.current);
      setRounds(roundsRef.current);

      Animated.parallel([
        Animated.timing(textOpacity,   { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(niyyahOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  // ─── Layout ───────────────────────────────────────────────────────────────────
  const RING_SIZE  = Math.min(Math.floor(SH * 0.20), 180);
  const RING_SW    = Math.max(9, Math.floor(RING_SIZE * 0.062));
  const HEADER_H   = insets.top + 54;
  const RING_TOP   = HEADER_H + 8;
  const STRAND_Y   = RING_TOP + RING_SIZE + 14;
  const CALLIGRAPHY_TOP = STRAND_Y + SVG_H + 10;
  const containerLeft  = SW / 2 - (BEAD_R + CENTER_IDX * BEAD_SPACING);
  const activeScreenY  = STRAND_Y + beadCY(0);
  const centerX = SW / 2;
  const centerY = activeScreenY;

  const slideProgress  = Math.min(Math.abs(slideVal) / BEAD_SPACING, 1);
  const activeAlpha    = 1 - (1 - 0.14) * slideProgress;
  const incomingAlpha  = 0.14 + (1 - 0.14) * slideProgress;
  const pct            = activeDhikr.goal > 0 ? count / activeDhikr.goal : 0;

  // ─── Dynamic Arabic font size — Scheherazade tashkeel marks need generous lineHeight
  const arabicLen      = activeDhikr.arabic.length;
  const arabicFontSize = arabicLen > 35 ? 26 : arabicLen > 25 ? 32 : arabicLen > 18 ? 38 : 44;
  const arabicLineH    = Math.ceil(arabicFontSize * 1.85); // 1.85× to prevent tashkeel clipping

  const CARD_W = 158;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>

      {/* ── Feature 1: Cosmic background ──────────────────────────── */}
      <LinearGradient
        colors={[ac.bg, '#050C1C', '#030810']}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Star field */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {STARS.map((s, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: s.lx * SW, top: s.ly * SH,
              width: s.r * 2, height: s.r * 2, borderRadius: s.r,
              backgroundColor: '#FFFFFF',
              opacity: starAnims[s.group],
            }}
          />
        ))}
      </View>

      {/* Ambient accent orbs */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -60, right: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: ac.ring, opacity: 0.08 }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 140, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: ac.ring, opacity: 0.06 }} />

      {/* ── Full-screen tap + long-press undo ──────────────────────── */}
      <Pressable
        onPress={onTap}
        onLongPress={onUndo}
        delayLongPress={500}
        accessibilityRole="button"
        accessibilityLabel="Count dhikr. Long-press to undo."
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
      />

      {/* Round complete flash */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: ac.ring, opacity: roundFlash, zIndex: 20 }}
      />

      {/* ── Feature 9: Header — timer | Bismillah | vibration toggle ── */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 15,
          paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        {/* Feature 5: Session timer */}
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20,
          paddingHorizontal: 12, paddingVertical: 6,
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5, fontVariant: ['tabular-nums'] }}>
            {fmtTime(elapsed)}
          </Text>
        </View>

        {/* Bismillah */}
        <Text style={{ fontFamily: ARABIC, fontSize: 15, color: ac.ring, opacity: 0.9 }}>
          بِسْمِ اللَّهِ
        </Text>

        {/* Feature 9: Vibration toggle */}
        <Pressable
          onPress={() => setVibrationOn((v) => !v)}
          style={({ pressed }) => ({
            backgroundColor: vibrationOn ? `${ac.ring}28` : 'rgba(255,255,255,0.06)',
            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
            borderWidth: 1, borderColor: vibrationOn ? `${ac.ring}50` : 'rgba(255,255,255,0.1)',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: vibrationOn ? ac.ring : 'rgba(255,255,255,0.35)' }}>
            {vibrationOn ? '⟁ vibrate' : '○ silent'}
          </Text>
        </Pressable>
      </View>

      {/* Gold separator line below header */}
      <LinearGradient
        colors={['transparent', `${ac.ring}40`, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', top: HEADER_H - 1, left: 40, right: 40, height: 1, zIndex: 14 }}
      />

      {/* ── Feature 2: Large central progress ring ─────────────────── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: RING_TOP,
          left: SW / 2 - RING_SIZE / 2,
          width: RING_SIZE,
          height: RING_SIZE,
          zIndex: 2,
        }}
      >
        {/* Subtle glow halo behind ring */}
        <View style={{
          position: 'absolute',
          top: -16, left: -16, right: -16, bottom: -16,
          borderRadius: RING_SIZE / 2 + 16,
          backgroundColor: ac.ring,
          opacity: 0.07,
        }} />
        <Animated.View
          style={{ opacity: textOpacity, flex: 1 }}
        >
          <ProgressRing
            size={RING_SIZE}
            strokeWidth={RING_SW}
            progress={pct}
            color={ac.ring}
            trackColor="rgba(255,255,255,0.07)"
            animate
          >
            {/* Count */}
            <Text style={{ fontSize: RING_SIZE * 0.3, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2, lineHeight: RING_SIZE * 0.32 }}>
              {count}
            </Text>
            <Text style={{ fontSize: RING_SIZE * 0.1, color: 'rgba(255,255,255,0.35)', marginTop: -2 }}>
              of {activeDhikr.goal}
            </Text>
            {rounds > 0 && (
              <Text style={{ fontSize: RING_SIZE * 0.085, color: ac.ring, fontWeight: '700', marginTop: 3 }}>
                Round {rounds + 1}
              </Text>
            )}
          </ProgressRing>
        </Animated.View>
      </View>


      {/* ── Feature 1: Idle breath glow ─────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', left: centerX - GLOW_R, top: centerY - GLOW_R,
          width: GLOW_R * 2, height: GLOW_R * 2,
          zIndex: 1, transform: [{ scale: idleGlowScale }], opacity: idleGlowOpacity,
        }}
      >
        <Svg width={GLOW_R * 2} height={GLOW_R * 2}>
          <Defs>
            <RadialGradient id="idle" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={ac.ring} stopOpacity={0.5} />
              <Stop offset="50%"  stopColor={ac.ring} stopOpacity={0.14} />
              <Stop offset="100%" stopColor={ac.ring} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_R} cy={GLOW_R} r={GLOW_R} fill="url(#idle)" />
        </Svg>
      </Animated.View>

      {/* Tap arrival glow */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', left: centerX - GLOW_R, top: centerY - GLOW_R,
          width: GLOW_R * 2, height: GLOW_R * 2,
          zIndex: 1, transform: [{ scale: glowScale }], opacity: glowOpacity,
        }}
      >
        <Svg width={GLOW_R * 2} height={GLOW_R * 2}>
          <Defs>
            <RadialGradient id="tap" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={ac.particle} stopOpacity={0.7} />
              <Stop offset="45%"  stopColor={ac.ring}     stopOpacity={0.22} />
              <Stop offset="100%" stopColor={ac.ring}     stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_R} cy={GLOW_R} r={GLOW_R} fill="url(#tap)" />
        </Svg>
      </Animated.View>

      {/* ── Feature 4: Pearl bead strand with thread ────────────────── */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: STRAND_Y, left: 0, width: SW, height: SVG_H, overflow: 'hidden', zIndex: 2 }}
      >
        <Animated.View
          style={{
            position: 'absolute', left: containerLeft, top: 0,
            width: CONTAINER_W, height: SVG_H,
            transform: [{ translateX: slideAnim }],
          }}
        >
          <Svg width={CONTAINER_W} height={SVG_H}>
            {/* Thread connecting beads */}
            <Path
              d={threadPath()}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Beads — warm pearl fill, accent stroke on active */}
            {Array.from({ length: N_RENDER }, (_, i) => {
              const relIdx = i - CENTER_IDX;
              const cx = BEAD_R + i * BEAD_SPACING;
              const cy = beadCY(relIdx);
              const isActive = relIdx === 0 && slideProgress < 0.5;
              let fa: number;
              if (relIdx === 0)      fa = activeAlpha;
              else if (relIdx === 1) fa = incomingAlpha;
              else                   fa = 0.14;
              return (
                <React.Fragment key={i}>
                  <Circle
                    cx={cx} cy={cy}
                    r={BEAD_R - STROKE_W / 2}
                    fill={`rgba(220,196,148,${fa.toFixed(3)})`}
                    stroke={isActive ? ac.ring : 'rgba(220,196,148,0.3)'}
                    strokeWidth={STROKE_W}
                  />
                  {/* Pearl highlight — all visible beads get a small inner glint */}
                  {fa > 0.25 && (
                    <Circle
                      cx={cx - BEAD_R * 0.28}
                      cy={cy - BEAD_R * 0.28}
                      r={BEAD_R * 0.22}
                      fill={`rgba(255,255,255,${(fa * 0.32).toFixed(2)})`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        </Animated.View>
      </View>

      {/* Ring pulse at center bead */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: centerX - BEAD_R, top: centerY - BEAD_R,
          width: BEAD_R * 2, height: BEAD_R * 2, borderRadius: BEAD_R,
          borderWidth: 2, borderColor: ac.ring,
          zIndex: 3, opacity: ringOpacity, transform: [{ scale: ringScale }],
        }}
      />

      {/* Bead bounce overlay with pearl sheen */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: centerX - BEAD_R, top: centerY - BEAD_R,
          width: BEAD_R * 2, height: BEAD_R * 2,
          zIndex: 4, transform: [{ scale: beadBounce }],
        }}
      >
        <Svg width={BEAD_R * 2} height={BEAD_R * 2}>
          <Defs>
            <RadialGradient id="pearl" cx="40%" cy="35%" r="65%">
              <Stop offset="0%"   stopColor="#FFFDF8" stopOpacity={0.9} />
              <Stop offset="40%"  stopColor="#DCC494" stopOpacity={0.75} />
              <Stop offset="100%" stopColor="#A8853A" stopOpacity={0.6} />
            </RadialGradient>
          </Defs>
          <Circle cx={BEAD_R} cy={BEAD_R} r={BEAD_R - STROKE_W / 2}
            fill="url(#pearl)" stroke={ac.ring} strokeWidth={STROKE_W} />
          <Circle cx={BEAD_R - 6} cy={BEAD_R - 6} r={3.5} fill="rgba(255,255,255,0.55)" />
        </Svg>
      </Animated.View>

      {/* Particle burst — Feature 3: colored to match accent */}
      {particles.map((_, i) => (
        <Animated.View
          key={`p${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: centerX - 3.5, top: centerY - 3.5,
            width: 7, height: 7, borderRadius: 3.5,
            backgroundColor: i % 2 === 0 ? ac.ring : ac.particle,
            zIndex: 3,
            opacity: particleOp[i],
            transform: [{ translateX: particleX[i] }, { translateY: particleY[i] }, { scale: particleSc[i] }],
          }}
        />
      ))}

      {/* +1 float */}
      <Animated.Text
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: centerX - 12, top: centerY - BEAD_R - 28,
          fontSize: 15, fontWeight: '800', color: ac.ring,
          zIndex: 5, opacity: plusOneOpacity, transform: [{ translateY: plusOneY }],
        }}
      >
        +1
      </Animated.Text>

      {/* ── Arabic calligraphy + Feature 6: niyyah strip ─────────────── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: CALLIGRAPHY_TOP,
          left: 0, right: 0,
          alignItems: 'center', zIndex: 1,
          opacity: textOpacity,
        }}
      >
        {/* Ornamental rule */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '70%', marginBottom: 6 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: `${ac.ring}50` }} />
          <Text style={{ color: ac.ring, fontSize: 9, opacity: 0.8 }}>✦</Text>
          <Text style={{ color: ac.ring, fontSize: 7, opacity: 0.5 }}>☽</Text>
          <Text style={{ color: ac.ring, fontSize: 9, opacity: 0.8 }}>✦</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: `${ac.ring}50` }} />
        </View>

        <Text style={{
          fontFamily: ARABIC_B,
          fontSize: arabicFontSize,
          lineHeight: arabicLineH,
          color: '#FFFFFF',
          textAlign: 'center',
          writingDirection: 'rtl',
          paddingHorizontal: 24,
          includeFontPadding: true,
        }}>
          {activeDhikr.arabic}
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, letterSpacing: 0.5 }}>
          {activeDhikr.transliteration}
        </Text>

        {/* Ornamental rule */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '70%', marginTop: 6, marginBottom: 6 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: `${ac.ring}30` }} />
          <Text style={{ color: ac.ring, fontSize: 8, opacity: 0.5 }}>✦</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: `${ac.ring}30` }} />
        </View>

        {/* Feature 6: Niyyah text */}
        <Animated.Text
          style={{
            fontSize: 10.5, color: ac.ring, opacity: niyyahOpacity,
            textAlign: 'center', paddingHorizontal: 28, lineHeight: 16,
            fontStyle: 'italic',
          }}
        >
          {NIYYAH[activeDhikr.key] ?? ''}
        </Animated.Text>
      </Animated.View>

      {/* ── Feature 10: Premium frosted-glass dhikr selector ─────────── */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: insets.bottom + 82,
          left: 0, right: 0, zIndex: 10,
        }}
      >
        <ScrollView
          ref={selectorRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 12 }}
          style={{ flexGrow: 0 }}
        >
          {[...BUILTIN_DHIKR, ...goalDhikr].map((item, idx) => {
            const isSelected = activeDhikr.key === item.key;
            const cardAc = ACCENT[item.key] ?? ACCENT_DEFAULT;
            const isSectionSep = idx === BUILTIN_DHIKR.length && goalDhikr.length > 0;
            return (
              <React.Fragment key={item.key}>
                {isSectionSep && (
                  <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 14 }} />
                )}
                <Pressable
                  onPress={() => switchDhikr(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.transliteration}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <View style={{
                    width: CARD_W, height: 90, borderRadius: 22,
                    overflow: 'hidden',
                    borderWidth: isSelected ? 1.5 : 1,
                    borderColor: isSelected ? cardAc.ring : 'rgba(255,255,255,0.1)',
                  }}>
                    {Platform.OS === 'ios'
                      ? <BlurView intensity={16} tint="dark" style={{ ...require('react-native').StyleSheet.absoluteFillObject }} />
                      : <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,14,28,0.82)' }} />}
                    {isSelected && (
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: cardAc.ring, opacity: 0.1 }} />
                    )}
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 10 }}>
                      <Text style={{
                        fontFamily: ARABIC_B, fontSize: 19,
                        color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                        textAlign: 'center', writingDirection: 'rtl', lineHeight: 26,
                      }}>
                        {item.arabic}
                      </Text>
                      <Text style={{ fontSize: 9, color: isSelected ? cardAc.ring : 'rgba(255,255,255,0.3)', fontWeight: '600', letterSpacing: 0.3 }}>
                        {item.transliteration}
                      </Text>
                      <View style={{
                        backgroundColor: isSelected ? `${cardAc.ring}25` : 'rgba(255,255,255,0.06)',
                        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
                        borderWidth: 1, borderColor: isSelected ? `${cardAc.ring}40` : 'transparent',
                      }}>
                        <Text style={{ fontSize: 9, color: isSelected ? cardAc.ring : 'rgba(255,255,255,0.3)', fontWeight: '700' }}>
                          ✦ {item.goal}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </React.Fragment>
            );
          })}
        </ScrollView>
      </View>

      {/* Reset button */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 26, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Reset count"
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 8,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
            borderRadius: 999, paddingVertical: 10, paddingHorizontal: 28,
            backgroundColor: 'rgba(255,255,255,0.05)',
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700' }}>
            Reset
          </Text>
          <Text style={{ fontFamily: ARABIC, fontSize: 13, color: 'rgba(255,255,255,0.3)', writingDirection: 'rtl' }}>
            إعادة
          </Text>
        </Pressable>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
