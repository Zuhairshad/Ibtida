import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { useAuth } from '../../state/AuthContext';
import { updateGoalProgress, completeGoal } from '../../services/adhkar';
import { updateMyGoalProgress } from '../../services/community';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RootStackParamList } from '../../navigation/types';
import Toast from '../../components/Toast';
import { ChevronLeftIcon } from '../../theme/icons';

const ARABIC_FONT = 'ScheherazadeNew_500Medium';
const ARABIC_BOLD = 'ScheherazadeNew_700Bold';
const GOLD = colors.gold;
const GOLD_TEXT = colors.goldInk;
const HERO_BG_TOP = '#0D1B2A';
const HERO_BG_BOT = '#162238';
const PARCHMENT = '#F5EDD6';

function star8Path(cx: number, cy: number, R: number, r: number): string {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI / 8) - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    const x = (cx + rad * Math.cos(a)).toFixed(2);
    const y = (cy + rad * Math.sin(a)).toFixed(2);
    d += `${i === 0 ? 'M' : 'L'}${x},${y} `;
  }
  return d + 'Z';
}

const TITLE_TO_ARABIC: Record<string, string> = {
  'Durood Sharif':       'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
  'Durood Ibrahim':      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
  'SubhanAllah':         'سُبْحَانَ اللهِ',
  'Alhamdulillah':       'الْحَمْدُ لِلَّهِ',
  'AllahuAkbar':         'اللهُ أَكْبَرُ',
  'Astaghfirullah':      'أَسْتَغْفِرُ اللهَ',
  'Laa ilaaha illallah': 'لَا إِلَٰهَ إِلَّا اللَّهُ',
  'La ilaha illallah':   'لَا إِلَٰهَ إِلَّا اللَّهُ',
  'La hawla':            'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
};

// ─── Bead geometry ────────────────────────────────────────────────────────────

const BEAD_R = 18;
const BEAD_SPACING = 54;
const ARC_DEPTH = 38;
const N_RENDER = 9;
const CENTER_IDX = 4;
const SVG_PAD = 10;
const SVG_H = SVG_PAD + BEAD_R + ARC_DEPTH + BEAD_R + SVG_PAD;
const CONTAINER_W = BEAD_R * 2 + N_RENDER * BEAD_SPACING;
const GLOW_R = 56;
const ANIM_MS = 380;
const STROKE_W = 1.5;
const N_PARTICLES = 8;

function beadCY(relIdx: number): number {
  const norm = Math.min(Math.abs(relIdx) / CENTER_IDX, 1);
  return SVG_PAD + BEAD_R + ARC_DEPTH * (1 - norm * norm);
}

const PARTICLE_DIST = 38;
const particleAngles = Array.from({ length: N_PARTICLES }, (_, i) => ({
  dx: Math.cos((i / N_PARTICLES) * 2 * Math.PI) * PARTICLE_DIST,
  dy: Math.sin((i / N_PARTICLES) * 2 * Math.PI) * PARTICLE_DIST,
}));

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoalTasbeehScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: SW, height: SH } = useWindowDimensions();
  const route = useRoute<RouteProp<RootStackParamList, 'GoalTasbeeh'>>();
  const { goalId, title, target, progress: initialProgress, communityGoalId } = route.params;

  const arabic = TITLE_TO_ARABIC[title] ?? title;
  const [count, setCount] = useState(initialProgress);
  const [done, setDone] = useState(initialProgress >= target);
  const [toast, setToast] = useState<string | null>(null);

  const countRef = useRef(initialProgress);
  const isAnimating = useRef(false);
  const completedRef = useRef(initialProgress >= target);

  // JS driver for bead slide
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [slideVal, setSlideVal] = useState(0);

  // Native-driver animations
  const glowScale   = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const plusOneY       = useRef(new Animated.Value(0)).current;
  const plusOneOpacity = useRef(new Animated.Value(0)).current;
  const ringScale   = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const beadBounce  = useRef(new Animated.Value(1)).current;
  const roundFlash  = useRef(new Animated.Value(0)).current;
  const idleGlowScale   = useRef(new Animated.Value(1)).current;
  const idleGlowOpacity = useRef(new Animated.Value(0)).current;

  const particleX  = useRef(particleAngles.map(() => new Animated.Value(0))).current;
  const particleY  = useRef(particleAngles.map(() => new Animated.Value(0))).current;
  const particleOp = useRef(particleAngles.map(() => new Animated.Value(0))).current;
  const particleSc = useRef(particleAngles.map(() => new Animated.Value(1))).current;

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleLoop  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const id = slideAnim.addListener(({ value }) => setSlideVal(value));
    return () => slideAnim.removeListener(id);
  }, [slideAnim]);

  // ─── Idle breath ─────────────────────────────────────────────────────────────

  function startIdleBreath() {
    stopIdleBreath();
    Animated.timing(idleGlowOpacity, { toValue: 0.55, duration: 400, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idleGlowScale, { toValue: 1.12, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(idleGlowScale, { toValue: 1,    duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    idleLoop.current = loop;
    loop.start();
  }

  function stopIdleBreath() {
    idleLoop.current?.stop();
    idleLoop.current = null;
    idleGlowScale.setValue(1);
    Animated.timing(idleGlowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }

  function scheduleIdleBreath() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(startIdleBreath, 1500);
  }

  useEffect(() => {
    scheduleIdleBreath();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      stopIdleBreath();
    };
  }, []);

  // ─── Animations ──────────────────────────────────────────────────────────────

  function fireVisualAnimations() {
    glowScale.setValue(0.6); glowOpacity.setValue(0.9);
    Animated.parallel([
      Animated.timing(glowScale,   { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    plusOneY.setValue(0); plusOneOpacity.setValue(1);
    Animated.sequence([
      Animated.timing(plusOneY,       { toValue: -22, duration: 380, useNativeDriver: true }),
      Animated.timing(plusOneOpacity, { toValue: 0,   duration: 120, useNativeDriver: true }),
    ]).start();

    ringScale.setValue(1); ringOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(ringScale,   { toValue: 2.8, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 0,   duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    beadBounce.setValue(1);
    Animated.sequence([
      Animated.timing(beadBounce, { toValue: 1.45, duration: 120, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(beadBounce, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
    ]).start();

    particleAngles.forEach((_, i) => {
      particleX[i].setValue(0); particleY[i].setValue(0);
      particleOp[i].setValue(1); particleSc[i].setValue(1);
      Animated.parallel([
        Animated.timing(particleX[i],  { toValue: particleAngles[i].dx, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(particleY[i],  { toValue: particleAngles[i].dy, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(particleOp[i], { toValue: 0, duration: 650, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(particleSc[i], { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]).start();
    });
  }

  function celebrateGoal() {
    roundFlash.setValue(0.35);
    Animated.timing(roundFlash, { toValue: 0, duration: 900, useNativeDriver: true }).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 120);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 240);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 360);
  }

  // ─── Tap handler ─────────────────────────────────────────────────────────────

  const onTap = () => {
    if (isAnimating.current || completedRef.current) return;
    isAnimating.current = true;

    stopIdleBreath();
    scheduleIdleBreath();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fireVisualAnimations();

    Animated.timing(slideAnim, {
      toValue: -BEAD_SPACING,
      duration: ANIM_MS,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: false,
    }).start(() => {
      slideAnim.setValue(0);
      const next = countRef.current + 1;
      countRef.current = next;
      setCount(next);

      if (user) {
        if (goalId) {
          updateGoalProgress(goalId, next, { userId: user.id, communityGoalId }).catch(() =>
            setToast('Could not save progress.')
          );
        } else if (communityGoalId) {
          updateMyGoalProgress(user.id, communityGoalId, next).catch(() =>
            setToast('Could not save progress.')
          );
        }
      }

      if (next >= target && !completedRef.current) {
        completedRef.current = true;
        if (user && goalId) completeGoal(goalId).catch(() => {});
        celebrateGoal();
        setTimeout(() => setDone(true), 900);
      }

      isAnimating.current = false;
    });
  };

  // ─── Layout ──────────────────────────────────────────────────────────────────

  const STRAND_Y = SH * 0.38;
  const containerLeft = SW / 2 - (BEAD_R + CENTER_IDX * BEAD_SPACING);
  const activeScreenY = STRAND_Y + beadCY(0);

  const slideProgress = Math.min(Math.abs(slideVal) / BEAD_SPACING, 1);
  const activeAlpha   = 1 - (1 - 0.13) * slideProgress;
  const incomingAlpha = 0.13 + (1 - 0.13) * slideProgress;
  const pct = target > 0 ? Math.min(count / target, 1) : 0;

  const centerBeadX = SW / 2;
  const centerBeadY = activeScreenY;

  // ─── Done overlay ────────────────────────────────────────────────────────────

  if (done) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient colors={[HERO_BG_TOP, '#1A3050', HERO_BG_BOT]} style={StyleSheet.absoluteFill} />
        {/* Subtle star pattern */}
        <Svg style={StyleSheet.absoluteFill} opacity={0.06}>
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 6 }, (_, c) => (
              <Path key={`s${r}${c}`} d={star8Path(c * 70 + (r % 2 === 0 ? 0 : 35), r * 70 - 20, 12, 5)}
                fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" />
            ))
          )}
        </Svg>

        {/* Header */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={nav.back} style={{ padding: 8, marginLeft: -8 }}>
            <ChevronLeftIcon color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 20 }}>
          {/* Gold ring */}
          <View style={{
            width: 140, height: 140, borderRadius: 70,
            borderWidth: 3, borderColor: `${GOLD}80`,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: `${GOLD}10`,
          }}>
            <View style={{
              width: 110, height: 110, borderRadius: 55,
              borderWidth: 1.5, borderColor: `${GOLD}40`,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: `${GOLD}08`,
            }}>
              <Text style={{ fontSize: 44 }}>✓</Text>
            </View>
          </View>

          {/* Arabic Alhamdulillah */}
          <Text style={{
            fontFamily: ARABIC_BOLD,
            fontSize: 56,
            color: GOLD,
            textAlign: 'center',
            writingDirection: 'rtl',
            lineHeight: 70,
          }}>
            الْحَمْدُ لِلَّهِ
          </Text>

          {/* Ornamental divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '70%' }}>
            <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}40` }} />
            <Text style={{ color: GOLD, fontSize: 12, opacity: 0.8 }}>✦</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}40` }} />
          </View>

          {/* Details card */}
          <View style={{
            borderRadius: 22, overflow: 'hidden',
            borderWidth: 1, borderColor: `${GOLD}30`,
            width: '100%',
          }}>
            {Platform.OS === 'ios'
              ? <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
              : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />}
            <View style={{ padding: 22, alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' }}>
                Goal Complete
              </Text>
              <Text style={{ fontFamily: ARABIC_FONT, fontSize: 20, color: GOLD, writingDirection: 'rtl', textAlign: 'center' }}>
                {arabic}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' }}>{title}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                {target} recitations completed
              </Text>
              {communityGoalId && (
                <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: colors.success }}>Community goal updated ✓</Text>
                </View>
              )}
            </View>
          </View>

          <Pressable
            onPress={nav.back}
            style={({ pressed }) => ({
              minHeight: 56, width: '100%', borderRadius: 18,
              backgroundColor: GOLD,
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1000' }}>
              بَارَكَ اللَّهُ فِيكَ
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(26,16,0,0.65)', marginTop: 2 }}>May Allah bless you · Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Main counter ─────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>

      {/* Tap target */}
      <Pressable
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={`Count ${title}`}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
      />

      {/* Goal complete flash */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: GOLD, opacity: roundFlash, zIndex: 20,
        }}
      />

      {/* Header */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Pressable onPress={nav.back} hitSlop={12} style={{ padding: 8, marginLeft: -8 }}>
          <ChevronLeftIcon color={colors.inkMuted} />
        </Pressable>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.inkMuted }}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Count + progress bar — top right */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: insets.top + 56, right: 22, alignItems: 'flex-end', zIndex: 1 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
          <Text style={{ fontSize: 52, fontWeight: '700', color: colors.ink, letterSpacing: -2, lineHeight: 56 }}>
            {count}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '300', color: colors.inkMuted, lineHeight: 56 }}>
            /{target}
          </Text>
        </View>
        <View style={{ width: 80, height: 3, borderRadius: 2, backgroundColor: colors.goldTint, marginTop: 4, overflow: 'hidden' }}>
          <View style={{ height: '100%', borderRadius: 2, backgroundColor: GOLD, width: `${pct * 100}%` }} />
        </View>
        {communityGoalId && (
          <Text style={{ fontSize: 11, color: colors.inkMuted, marginTop: 5, textAlign: 'right' }}>
            Community goal linked
          </Text>
        )}
      </View>

      {/* Idle breath glow */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: SW / 2 - GLOW_R, top: activeScreenY - GLOW_R,
          width: GLOW_R * 2, height: GLOW_R * 2,
          zIndex: 1, transform: [{ scale: idleGlowScale }], opacity: idleGlowOpacity,
        }}
      >
        <Svg width={GLOW_R * 2} height={GLOW_R * 2}>
          <Defs>
            <RadialGradient id="idleGlow2" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={GOLD} stopOpacity={0.4} />
              <Stop offset="50%"  stopColor={GOLD} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_R} cy={GLOW_R} r={GLOW_R} fill="url(#idleGlow2)" />
        </Svg>
      </Animated.View>

      {/* Tap-arrival glow */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: SW / 2 - GLOW_R, top: activeScreenY - GLOW_R,
          width: GLOW_R * 2, height: GLOW_R * 2,
          zIndex: 1, transform: [{ scale: glowScale }], opacity: glowOpacity,
        }}
      >
        <Svg width={GLOW_R * 2} height={GLOW_R * 2}>
          <Defs>
            <RadialGradient id="tapGlow2" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={GOLD} stopOpacity={0.5} />
              <Stop offset="45%"  stopColor={GOLD} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_R} cy={GLOW_R} r={GLOW_R} fill="url(#tapGlow2)" />
        </Svg>
      </Animated.View>

      {/* Bead strand */}
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
            {Array.from({ length: N_RENDER }, (_, i) => {
              const relIdx = i - CENTER_IDX;
              const cx = BEAD_R + i * BEAD_SPACING;
              const cy = beadCY(relIdx);
              let fillAlpha: number;
              if (relIdx === 0)      fillAlpha = activeAlpha;
              else if (relIdx === 1) fillAlpha = incomingAlpha;
              else                   fillAlpha = 0.13;
              const isActive = relIdx === 0 && slideProgress < 0.5;
              return (
                <Circle
                  key={i}
                  cx={cx} cy={cy} r={BEAD_R - STROKE_W / 2}
                  fill={`rgba(217,190,134,${fillAlpha.toFixed(3)})`}
                  stroke={isActive ? GOLD : 'rgba(217,190,134,0.45)'}
                  strokeWidth={STROKE_W}
                />
              );
            })}
          </Svg>
        </Animated.View>
      </View>

      {/* Ring pulse */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: centerBeadX - BEAD_R, top: centerBeadY - BEAD_R,
          width: BEAD_R * 2, height: BEAD_R * 2,
          borderRadius: BEAD_R, borderWidth: 2, borderColor: GOLD,
          zIndex: 3, opacity: ringOpacity, transform: [{ scale: ringScale }],
        }}
      />

      {/* Bead bounce overlay */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: centerBeadX - BEAD_R, top: centerBeadY - BEAD_R,
          width: BEAD_R * 2, height: BEAD_R * 2,
          zIndex: 4, transform: [{ scale: beadBounce }],
        }}
      >
        <Svg width={BEAD_R * 2} height={BEAD_R * 2}>
          <Circle cx={BEAD_R} cy={BEAD_R} r={BEAD_R - STROKE_W / 2}
            fill="rgba(217,190,134,0.55)" stroke={GOLD} strokeWidth={STROKE_W} />
          <Circle cx={BEAD_R - 5} cy={BEAD_R - 5} r={3} fill="rgba(255,255,255,0.45)" />
        </Svg>
      </Animated.View>

      {/* Particle burst */}
      {particleAngles.map((_, i) => (
        <Animated.View
          key={`p${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: centerBeadX - 3, top: centerBeadY - 3,
            width: 6, height: 6, borderRadius: 3,
            backgroundColor: GOLD, zIndex: 3,
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
          left: SW / 2 - 10, top: activeScreenY - BEAD_R - 26,
          fontSize: 14, fontWeight: '700', color: GOLD_TEXT,
          zIndex: 5, opacity: plusOneOpacity, transform: [{ translateY: plusOneY }],
        }}
      >
        +1
      </Animated.Text>

      {/* Arabic calligraphy + ornamental frame */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: STRAND_Y + SVG_H + 32,
          left: 20, right: 20,
          alignItems: 'center', zIndex: 1,
        }}
      >
        {/* Ornamental top rule */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, width: '80%' }}>
          <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}70` }} />
          <Text style={{ color: GOLD_TEXT, fontSize: 11 }}>✦</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}70` }} />
        </View>

        <Text style={{ fontFamily: ARABIC_BOLD, fontSize: 48, color: colors.inkStrong, textAlign: 'center', writingDirection: 'rtl', lineHeight: 64 }}>
          {arabic}
        </Text>
        <Text style={{ fontSize: 14, color: colors.inkSecondary, marginTop: 4, letterSpacing: 0.5, fontWeight: '500' }}>
          {title}
        </Text>

        {/* Ornamental bottom rule */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, width: '80%' }}>
          <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}70` }} />
          <Text style={{ color: GOLD_TEXT, fontSize: 11 }}>✦</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}70` }} />
        </View>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
