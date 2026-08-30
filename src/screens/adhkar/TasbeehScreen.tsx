import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import { ChevronLeftIcon, ChevronDownIcon, CheckIcon } from '../../theme/icons';

export default function TasbeehScreen() {
  const { state, tasbeehTarget, tapTasbeeh, plusFive, undoTasbeeh, resetTasbeeh } = useAppState();
  const insets = useSafeAreaInsets();
  const frac = Math.min(state.count / tasbeehTarget, 1);

  const onTap = () => {
    if (tapTasbeeh()) nav.goalComplete();
  };

  const onPlusFive = () => {
    if (plusFive()) nav.goalComplete();
  };

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale onPress={nav.adhkar} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <ChevronLeftIcon color={colors.inkMuted} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Adhkar</Text>
        </PressableScale>
        <PressableScale
          onPress={nav.goalNew}
          scaleTo={1}
          style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.1)', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 13, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.inkStrong }}>SubhanAllah</Text>
          <ChevronDownIcon color={colors.inkMuted} />
        </PressableScale>
      </View>

      <PressableScale onPress={onTap} scaleTo={0.994} accessibilityRole="button" accessibilityLabel="Count one dhikr" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <ProgressRing size={272} strokeWidth={6} progress={frac} trackColor="rgba(23,32,28,0.06)" color="#3D73C9">
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', fontSize: 20, color: colors.goldInk, marginBottom: 16 }}>سُبْحَانَ اللهِ</Text>
            <Text style={{ fontSize: 76, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.04 }}>{state.count}</Text>
            <Text style={{ fontSize: 17, fontWeight: '500', color: colors.inkSecondary, marginTop: 6 }}>/ {tasbeehTarget}</Text>
            <Text style={{ fontSize: 14, color: colors.inkMuted, marginTop: 14 }}>SubhanAllah</Text>
          </View>
        </ProgressRing>
        <Text style={{ fontSize: 13, color: colors.inkFaint, marginTop: 26 }}>Tap anywhere to count</Text>
      </PressableScale>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Undo', onPress: undoTasbeeh },
            { label: '+5', onPress: onPlusFive },
            { label: 'Reset', onPress: resetTasbeeh },
          ].map((b) => (
            <PressableScale
              key={b.label}
              onPress={b.onPress}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={b.label === '+5' ? 'Add five' : b.label}
              style={{ flex: 1, minHeight: 52, borderWidth: 1, borderColor: 'rgba(23,32,28,0.09)', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>{b.label}</Text>
            </PressableScale>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14 }}>
          <CheckIcon size={12} color={colors.inkFaint} />
          <Text style={{ fontSize: 12, color: colors.inkFaint }}>Counts saved on device · haptics on</Text>
        </View>
      </View>
    </ScreenFade>
  );
}
