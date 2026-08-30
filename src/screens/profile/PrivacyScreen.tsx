import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import { ChevronLeftIcon } from '../../theme/icons';

const ROWS = [
  { label: 'Profile visibility', sub: 'Who can see your name', value: 'Private', ink: colors.inkStrong, bg: colors.bgTint },
  { label: 'Activity visibility', sub: 'Prayer, dhikr and reading', value: 'Private', ink: colors.inkStrong, bg: colors.bgTint },
  { label: 'Community participation', sub: 'Anonymous contribution to totals', value: 'On', ink: '#2F6B45', bg: 'rgba(94,170,120,0.15)' },
  { label: 'Goal visibility', sub: 'Shown inside your circles only', value: 'Circles', ink: colors.inkStrong, bg: colors.bgTint },
  { label: 'Location', sub: 'For prayer times only', value: 'While in use', ink: colors.inkStrong, bg: colors.bgTint },
  { label: 'Analytics', sub: 'Crashes and feature use, never content', value: 'Off', ink: colors.inkMuted, bg: colors.bgTint },
  { label: 'Notifications', sub: 'Six categories, each separate', value: '3 on', ink: colors.inkStrong, bg: colors.bgTint },
  { label: 'Data export', sub: 'A file you keep', value: 'Ready', ink: colors.inkStrong, bg: colors.bgTint },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24 }}>
          <PressableScale onPress={nav.profile} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
            <ChevronLeftIcon color={colors.inkMuted} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Profile</Text>
          </PressableScale>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 12 }}>Privacy</Text>
          <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 9, lineHeight: 20 }}>Everything starts private. You choose what leaves the device.</Text>
        </RiseIn>

        <RiseIn delay={80} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            {ROWS.map((row, i) => (
              <View
                key={row.label}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  borderBottomWidth: i === ROWS.length - 1 ? 0 : 1,
                  borderColor: colors.divider,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  minHeight: 52,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkStrong }}>{row.label}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 5, lineHeight: 17 }}>{row.sub}</Text>
                </View>
                <View style={{ backgroundColor: row.bg, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 11 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: row.ink }}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </RiseIn>

        <RiseIn delay={120} style={{ paddingHorizontal: 24, marginTop: 12, gap: 8 }}>
          <PressableScale
            scaleTo={1}
            style={{ minHeight: 52, borderWidth: 1, borderColor: 'rgba(23,32,28,0.09)', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkStrong }}>Export my data</Text>
          </PressableScale>
          <PressableScale
            scaleTo={1}
            style={{ minHeight: 52, borderWidth: 1, borderColor: 'rgba(201,107,107,0.3)', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.dangerInk }}>Delete account</Text>
          </PressableScale>
        </RiseIn>
      </ScrollView>
    </View>
  );
}
