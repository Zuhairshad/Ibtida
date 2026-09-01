import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useAuth } from '../../state/AuthContext';
import { getTasbeehSession, setTasbeehCount } from '../../services/adhkar';
import { colors } from '../../theme/tokens';
import Toast from '../../components/Toast';

const ARABIC_FONT = 'NotoNaskhArabic_500Medium';

const CONFIG = {
  arabic: 'استغفر الله',
  transliteration: 'Astaghfar Allah',
  goal: 100,
  arabicGoalLabel: '١٠٠ مرة',
  englishGoalLabel: '100 times',
  roundsLabel: 'الجولات',
  resetLabel: 'إعادة الضبط',
} as const;

// ─── Visual constants ─────────────────────────────────────────────────────────
const BEAD_R = 18;
const BEAD_SPACING = 54;
const ARC_DEPTH = 38;
const N_RENDER = 9;
const CENTER_IDX = Math.floor(N_RENDER / 2); // 4
const SVG_PAD = 10;
const SVG_H = SVG_PAD + BEAD_R + ARC_DEPTH + BEAD_R + SVG_PAD; // 94
const CONTAINER_W = BEAD_R * 2 + N_RENDER * BEAD_SPACING;
const GLOW_R = 56;
const ANIM_MS = 380;
const STROKE_W = 1.5;

const GOLD = colors.gold;
const GOLD_TEXT = colors.goldInk;

function beadCY(relIdx: number): number {
  const norm = Math.min(Math.abs(relIdx) / CENTER_IDX, 1);
  return SVG_PAD + BEAD_R + ARC_DEPTH * (1 - norm * norm);
}

export default function TasbeehScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: SW, height: SH } = useWindowDimensions();

  const [count, setCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const countRef = useRef(0);
  const roundsRef = useRef(0);
  const isAnimating = useRef(false);

  // JS driver — feeds slideVal into per-bead color interpolation each frame
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [slideVal, setSlideVal] = useState(0);

  // Native drivers — transforms/opacity only
  const glowScale = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const plusOneY = useRef(new Animated.Value(0)).current;
  const plusOneOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = slideAnim.addListener(({ value }) => setSlideVal(value));
    return () => slideAnim.removeListener(id);
  }, [slideAnim]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      getTasbeehSession(user.id)
        .then((s) => {
          if (!active) return;
          const c = s.count % CONFIG.goal;
          const r = Math.floor(s.count / CONFIG.goal);
          setCount(c);
          setRounds(r);
          countRef.current = c;
          roundsRef.current = r;
        })
        .catch(() => active && setToast('Could not load your tasbeeh count.'));
      return () => { active = false; };
    }, [user])
  );

  const persist = (total: number) => {
    if (!user) return;
    setTasbeehCount(user.id, total).catch(() => setToast('Could not save your count.'));
  };

  function pulseGlow() {
    glowScale.setValue(0.6);
    glowOpacity.setValue(0.9);
    plusOneY.setValue(0);
    plusOneOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(glowScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(plusOneY, { toValue: -22, duration: 380, useNativeDriver: true }),
        Animated.timing(plusOneOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      ]),
    ]).start();
  }

  const onTap = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    Animated.timing(slideAnim, {
      toValue: -BEAD_SPACING,
      duration: ANIM_MS,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: false,
    }).start(() => {
      slideAnim.setValue(0);
      const nextCount = countRef.current + 1;
      if (nextCount >= CONFIG.goal) {
        const nextRounds = roundsRef.current + 1;
        countRef.current = 0;
        roundsRef.current = nextRounds;
        setCount(0);
        setRounds(nextRounds);
        persist(nextRounds * CONFIG.goal);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        countRef.current = nextCount;
        setCount(nextCount);
        persist(roundsRef.current * CONFIG.goal + nextCount);
      }
      pulseGlow();
      isAnimating.current = false;
    });
  };

  const onReset = () => {
    setCount(0);
    setRounds(0);
    countRef.current = 0;
    roundsRef.current = 0;
    persist(0);
  };

  const STRAND_Y = SH * 0.36;
  const containerLeft = SW / 2 - (BEAD_R + CENTER_IDX * BEAD_SPACING);
  const activeScreenY = STRAND_Y + beadCY(0);

  const slideProgress = Math.min(Math.abs(slideVal) / BEAD_SPACING, 1);
  const activeAlpha = 1 - (1 - 0.13) * slideProgress;
  const incomingAlpha = 0.13 + (1 - 0.13) * slideProgress;
  const pct = count / CONFIG.goal;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgWash }}>

      <Pressable
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel="Count dhikr"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
      />

      {/* Count — top right */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: insets.top + 20, right: 22, alignItems: 'flex-end', zIndex: 1 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
          <Text style={{ fontSize: 52, fontWeight: '700', color: colors.ink, letterSpacing: -2, lineHeight: 56 }}>
            {count}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '300', color: colors.inkMuted, lineHeight: 56 }}>
            /{CONFIG.goal}
          </Text>
        </View>
        <View style={{ width: 80, height: 3, borderRadius: 2, backgroundColor: colors.goldTint, marginTop: 4, overflow: 'hidden' }}>
          <View style={{ height: '100%', borderRadius: 2, backgroundColor: GOLD, width: `${pct * 100}%` }} />
        </View>
        <Text style={{ fontSize: 13, color: colors.inkSecondary, fontFamily: ARABIC_FONT, marginTop: 6, textAlign: 'right', writingDirection: 'rtl' }}>
          {CONFIG.roundsLabel}: {rounds}
        </Text>
      </View>

      {/* Gold glow behind active bead */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: SW / 2 - GLOW_R,
          top: activeScreenY - GLOW_R,
          width: GLOW_R * 2,
          height: GLOW_R * 2,
          zIndex: 1,
          transform: [{ scale: glowScale }],
          opacity: glowOpacity,
        }}
      >
        <Svg width={GLOW_R * 2} height={GLOW_R * 2}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={GOLD} stopOpacity={0.5} />
              <Stop offset="45%"  stopColor={GOLD} stopOpacity={0.18} />
              <Stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_R} cy={GLOW_R} r={GLOW_R} fill="url(#glow)" />
        </Svg>
      </Animated.View>

      {/* Bead strand */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: STRAND_Y, left: 0, width: SW, height: SVG_H, overflow: 'hidden', zIndex: 2 }}
      >
        <Animated.View
          style={{ position: 'absolute', left: containerLeft, top: 0, width: CONTAINER_W, height: SVG_H, transform: [{ translateX: slideAnim }] }}
        >
          <Svg width={CONTAINER_W} height={SVG_H}>
            {Array.from({ length: N_RENDER }, (_, i) => {
              const relIdx = i - CENTER_IDX;
              const cx = BEAD_R + i * BEAD_SPACING;
              const cy = beadCY(relIdx);
              let fillAlpha: number;
              if (relIdx === 0) fillAlpha = activeAlpha;
              else if (relIdx === 1) fillAlpha = incomingAlpha;
              else fillAlpha = 0.13;

              const isActiveState = relIdx === 0 && slideProgress < 0.5;
              return (
                <Circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={BEAD_R - STROKE_W / 2}
                  fill={`rgba(217,190,134,${fillAlpha.toFixed(3)})`}
                  stroke={isActiveState ? GOLD : 'rgba(217,190,134,0.45)'}
                  strokeWidth={STROKE_W}
                />
              );
            })}
          </Svg>
        </Animated.View>
      </View>

      {/* +1 float */}
      <Animated.Text
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: SW / 2 - 10,
          top: activeScreenY - BEAD_R - 26,
          fontSize: 14,
          fontWeight: '700',
          color: GOLD_TEXT,
          zIndex: 3,
          opacity: plusOneOpacity,
          transform: [{ translateY: plusOneY }],
        }}
      >
        +1
      </Animated.Text>

      {/* Content below strand */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: STRAND_Y + SVG_H + 52, left: 0, right: 0, alignItems: 'center', zIndex: 1 }}
      >
        <Text style={{ fontFamily: ARABIC_FONT, fontSize: 42, fontWeight: '700', color: colors.ink, textAlign: 'center', writingDirection: 'rtl' }}>
          {CONFIG.arabic}
        </Text>
        <Text style={{ fontSize: 15, color: colors.inkSecondary, marginTop: 10, letterSpacing: 0.4 }}>
          {CONFIG.transliteration}
        </Text>
        <View style={{ marginTop: 24, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: ARABIC_FONT, fontSize: 15, color: GOLD_TEXT, textAlign: 'center', writingDirection: 'rtl' }}>
            {CONFIG.arabicGoalLabel}
          </Text>
          <Text style={{ fontSize: 12, color: colors.inkMuted }}>
            {CONFIG.englishGoalLabel}
          </Text>
        </View>
      </View>

      {/* Reset pill */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 32, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel={`Reset — ${CONFIG.resetLabel}`}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: colors.cardBorderStrong,
            borderRadius: 999,
            paddingVertical: 11,
            paddingHorizontal: 36,
            backgroundColor: colors.card,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ fontFamily: ARABIC_FONT, fontSize: 15, color: colors.inkSecondary, textAlign: 'center', writingDirection: 'rtl' }}>
            {CONFIG.resetLabel}
          </Text>
        </Pressable>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
