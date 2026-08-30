import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import { ChevronRightIcon } from '../../theme/icons';

const ROWS: { label: string; value: string; go: () => void }[] = [
  { label: 'Goals', value: '2 active', go: nav.goals },
  { label: 'Bookmarks', value: '14', go: nav.quran },
  { label: 'History', value: 'All time', go: nav.progress },
  { label: 'Circles', value: '2', go: nav.circles },
  { label: 'Settings', value: 'MWL · Hanafi', go: nav.privacy },
  { label: 'Privacy', value: 'Private', go: nav.privacy },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: colors.bgTint, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '600', color: colors.inkStrong }}>Y</Text>
          </View>
          <View>
            <Text style={{ fontSize: 19, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.02 }}>Yusuf Rahman</Text>
            <Text style={{ fontSize: 13, color: colors.inkSecondary, marginTop: 8 }}>Private profile</Text>
          </View>
        </RiseIn>

        <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Today’s consistency</Text>
              <Text style={{ fontSize: 24, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 11 }}>7 day streak</Text>
            </View>
            <ProgressRing size={56} strokeWidth={5} progress={0.8} trackColor={colors.bgTint} color={colors.success}>
              <Text style={{ fontSize: 13, fontWeight: '600' }}>80%</Text>
            </ProgressRing>
          </View>
        </RiseIn>

        <RiseIn delay={100} style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            {ROWS.map((row, i) => (
              <PressableScale
                key={row.label}
                onPress={row.go}
                scaleTo={1}
                style={{
                  minHeight: 52,
                  borderBottomWidth: i === ROWS.length - 1 ? 0 : 1,
                  borderColor: colors.divider,
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }}>{row.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.inkSecondary }}>{row.value}</Text>
                  <ChevronRightIcon />
                </View>
              </PressableScale>
            ))}
          </View>
        </RiseIn>

        <RiseIn delay={140} style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <PressableScale
            onPress={nav.error}
            scaleTo={1}
            style={{ minHeight: 48, borderWidth: 1, borderColor: 'rgba(23,32,28,0.09)', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 15, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>See offline & error states</Text>
          </PressableScale>
        </RiseIn>
      </ScrollView>
    </View>
  );
}
