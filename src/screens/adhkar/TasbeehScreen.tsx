import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';

import { useAuth } from '../../state/AuthContext';
import { getTasbeehSession, setTasbeehCount } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors, arabicFont } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { ChevronLeftIcon, ChevronDownIcon } from '../../theme/icons';

const BEAD_COUNT = 33;
const RING_DIAMETER = 260;
const BEAD_RADIUS = 9;
const GOLD = '#C9A96E';
const IVORY = '#FAF8F3';
const INACTIVE_BEAD = 'rgba(23,32,28,0.12)';
const CENTER = RING_DIAMETER / 2;
const ORBIT_RADIUS = RING_DIAMETER / 2 - BEAD_RADIUS - 2;

type Dhikr = {
  key: string;
  arabic: string;
  english: string;
};

const DHIKR_LIST: Dhikr[] = [
  { key: 'subhanallah', arabic: 'سُبْحَانَ اللهِ', english: 'SubhanAllah' },
  { key: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', english: 'Alhamdulillah' },
  { key: 'allahuakbar', arabic: 'اللهُ أَكْبَرُ', english: 'AllahuAkbar' },
];

function beadPosition(index: number): { x: number; y: number } {
  const angle = (index / BEAD_COUNT) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CENTER + ORBIT_RADIUS * Math.cos(angle),
    y: CENTER + ORBIT_RADIUS * Math.sin(angle),
  };
}

function tapBuzz() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics unavailable
  }
}

function BeadRing({ count, target }: { count: number; target: number }) {
  const filledInRing = count % BEAD_COUNT;
  const allComplete = count > 0 && count >= target;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.28, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const currentBeadIndex = allComplete ? -1 : filledInRing;

  return (
    <View style={{ width: RING_DIAMETER, height: RING_DIAMETER }}>
      <Svg width={RING_DIAMETER} height={RING_DIAMETER} style={{ position: 'absolute' }}>
        {Array.from({ length: BEAD_COUNT }).map((_, i) => {
          const { x, y } = beadPosition(i);
          const isFilled = allComplete || i < filledInRing;
          const isCurrent = i === currentBeadIndex;
          if (isCurrent) return null;
          return (
            <Circle
              key={i}
              cx={x}
              cy={y}
              r={BEAD_RADIUS}
              fill={isFilled ? GOLD : INACTIVE_BEAD}
            />
          );
        })}
      </Svg>

      {currentBeadIndex >= 0 && (() => {
        const { x, y } = beadPosition(currentBeadIndex);
        return (
          <Animated.View
            style={{
              position: 'absolute',
              left: x - BEAD_RADIUS,
              top: y - BEAD_RADIUS,
              width: BEAD_RADIUS * 2,
              height: BEAD_RADIUS * 2,
              borderRadius: BEAD_RADIUS,
              backgroundColor: INACTIVE_BEAD,
              transform: [{ scale: pulseAnim }],
            }}
          />
        );
      })()}
    </View>
  );
}

export default function TasbeehScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(99);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [dhikrIndex, setDhikrIndex] = useState(0);

  const dhikr = DHIKR_LIST[dhikrIndex];
  const reps = Math.floor(count / BEAD_COUNT);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      getTasbeehSession(user.id)
        .then((s) => {
          if (!active) return;
          setCount(s.count);
          setTarget(s.target);
        })
        .catch(() => active && setToast('Could not load your tasbeeh count.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [user])
  );

  const persist = (next: number) => {
    if (!user) return;
    setTasbeehCount(user.id, next).catch(() => setToast('Could not save your count.'));
  };

  const onTap = () => {
    tapBuzz();
    const next = count + 1;
    setCount(next);
    persist(next);
    if (next >= target) nav.goalComplete();
  };

  const onPlusFive = () => {
    tapBuzz();
    const next = Math.min(count + 5, target);
    const wasBelow = count < target;
    setCount(next);
    persist(next);
    if (next >= target && wasBelow) nav.goalComplete();
  };

  const onUndo = () => {
    tapBuzz();
    const next = Math.max(count - 1, 0);
    setCount(next);
    persist(next);
  };

  const onReset = () => {
    setCount(0);
    persist(0);
  };

  const onCycleDhikr = () => {
    setDhikrIndex((prev) => (prev + 1) % DHIKR_LIST.length);
  };

  return (
    <ScreenFade duration={280} style={{ backgroundColor: IVORY }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <PressableScale
          onPress={nav.adhkar}
          scaleTo={1}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <ChevronLeftIcon color={colors.inkMuted} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Adhkar</Text>
        </PressableScale>

        <PressableScale
          onPress={onCycleDhikr}
          scaleTo={0.96}
          style={{
            borderWidth: 1,
            borderColor: 'rgba(23,32,28,0.1)',
            backgroundColor: '#FFFFFF',
            borderRadius: 999,
            paddingVertical: 8,
            paddingHorizontal: 14,
            minHeight: 36,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.inkStrong }}>{dhikr.english}</Text>
          <ChevronDownIcon color={colors.inkMuted} />
        </PressableScale>

        <PressableScale
          onPress={nav.goalNew}
          scaleTo={0.97}
          style={{
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.inkMuted }}>Goal</Text>
        </PressableScale>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SkeletonBlock width={RING_DIAMETER} height={RING_DIAMETER} radius={RING_DIAMETER / 2} />
        </View>
      ) : (
        <Pressable
          onPress={onTap}
          accessibilityRole="button"
          accessibilityLabel="Count one dhikr"
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: RING_DIAMETER, height: RING_DIAMETER, alignItems: 'center', justifyContent: 'center' }}>
            <BeadRing count={count} target={target} />

            <View
              style={{
                position: 'absolute',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {reps > 0 && (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.5,
                    color: GOLD,
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  {reps} {reps === 1 ? 'rep' : 'reps'}
                </Text>
              )}
              <Text
                style={{
                  fontFamily: arabicFont,
                  fontSize: 19,
                  color: colors.goldInk,
                  marginBottom: 4,
                  textAlign: 'center',
                }}
              >
                {dhikr.arabic}
              </Text>
              <Text
                style={{
                  fontSize: 72,
                  fontWeight: '700',
                  color: colors.inkStrong,
                  letterSpacing: -2,
                  lineHeight: 76,
                  includeFontPadding: false,
                }}
              >
                {count}
              </Text>
              <Text style={{ fontSize: 13, color: colors.inkFaint, marginTop: 4 }}>
                / {target}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: colors.inkMuted,
                  marginTop: 10,
                  letterSpacing: 0.2,
                }}
              >
                {dhikr.english}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 12.5, color: colors.inkFaint, marginTop: 20, letterSpacing: 0.1 }}>
            Tap anywhere to count
          </Text>
        </Pressable>
      )}

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {([
            { label: 'Undo', onPress: onUndo, accessibilityLabel: 'Undo one count' },
            { label: '+5', onPress: onPlusFive, accessibilityLabel: 'Add five' },
            { label: 'Reset', onPress: onReset, accessibilityLabel: 'Reset count' },
          ] as const).map((b) => (
            <PressableScale
              key={b.label}
              onPress={b.onPress}
              disabled={loading}
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel={b.accessibilityLabel}
              style={{
                flex: 1,
                minHeight: 52,
                borderWidth: 1,
                borderColor: 'rgba(23,32,28,0.09)',
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>{b.label}</Text>
            </PressableScale>
          ))}
        </View>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
