import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';

import { useAuth } from '../../state/AuthContext';
import { getTasbeehSession, continueCounting } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors, arabicFont } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import Toast from '../../components/Toast';

const GOLD = '#C9A96E';
const IVORY = '#FAF8F3';
const RING_SIZE = 180;
const STROKE = 7;
const R = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function GoalCompleteScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getTasbeehSession(user.id)
        .then((s) => {
          setCount(s.count);
          setTarget(s.target);
        })
        .catch(() => {});
    }, [user])
  );

  const onKeepCounting = async () => {
    nav.tasbeeh();
    if (!user) return;
    try {
      await continueCounting(user.id);
    } catch {
      setToast('Could not reset your count — it will still show the completed total.');
    }
  };

  const displayCount = count ?? 0;
  const displayTarget = target ?? 100;

  return (
    <ScreenFade
      duration={500}
      style={{
        backgroundColor: IVORY,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={R}
            stroke="rgba(23,32,28,0.07)"
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={R}
            stroke={GOLD}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: RING_SIZE, height: RING_SIZE }}>
          <Text style={{ fontSize: 52, fontWeight: '600', color: colors.inkStrong, letterSpacing: -2, lineHeight: 56 }}>
            {displayCount}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkSecondary, marginTop: 4 }}>
            / {displayTarget}
          </Text>
        </View>
      </View>

      <Text style={{ fontFamily: arabicFont, fontSize: 32, lineHeight: 52, color: '#5A4520', textAlign: 'center' }}>
        اَلْحَمْدُ لِلَّهِ
      </Text>
      <Text style={{ fontSize: 26, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 8, textAlign: 'center' }}>
        Goal complete
      </Text>
      <Text style={{ fontSize: 15, lineHeight: 24, color: colors.inkSecondary, marginTop: 10, maxWidth: 270, textAlign: 'center' }}>
        May Allah accept your worship and make it heavy on your scales.
      </Text>

      <View style={{ width: '100%', marginTop: 44, gap: 8 }}>
        <PrimaryButton label="Done" onPress={nav.home} />
        <SecondaryButton label="Keep counting" onPress={onKeepCounting} />
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
