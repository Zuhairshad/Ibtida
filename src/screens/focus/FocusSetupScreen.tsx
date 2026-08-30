import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import SecondaryButton from '../../components/SecondaryButton';
import PrimaryButton from '../../components/PrimaryButton';

const RESTRICT_APPS = ['Instagram', 'TikTok', 'YouTube', 'Facebook'];

// Platform capability layer per §21 — never assumes identical capability on
// iOS vs Android, and calls out emergency access explicitly.
export default function FocusSetupScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScreenFade duration={300} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 34 }} showsVerticalScrollIndicator={false}>
        <SecondaryButton label="Close" onPress={nav.home} style={{ alignSelf: 'flex-start' }} />
        <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 12 }}>Ibadah Focus</Text>
        <Text style={{ fontSize: 15, lineHeight: 23, color: colors.inkMuted, marginTop: 9 }}>Choose your worship goal. Your phone stays quiet until you finish it.</Text>

        <View style={{ marginTop: 18, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }}>Worship goal</Text>
            <Text style={{ fontSize: 14, color: colors.inkMuted }}>Durood Sharif · 100</Text>
          </View>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }}>Focus duration</Text>
            <Text style={{ fontSize: 14, color: colors.inkMuted }}>Until goal completed</Text>
          </View>
          <View style={{ padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }}>Apps to restrict</Text>
              <Text style={{ fontSize: 14, color: colors.inkMuted }}>4 selected</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
              {RESTRICT_APPS.map((a) => (
                <View key={a} style={{ backgroundColor: colors.bgTint, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkStrong }}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ marginTop: 12, borderRadius: 24, padding: 20, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: 'rgba(61,115,201,0.2)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2F5CA3' }} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F3E63' }}>Platform capability</Text>
          </View>
          <View style={{ gap: 10, marginTop: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.75)', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, minWidth: 52, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#1F3E63' }}>iOS</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 20, color: '#3A5A7E' }}>Screen Time authorisation required. Apple's own limiter shields the apps you choose.</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.75)', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, minWidth: 52, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#1F3E63' }}>Android</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 20, color: '#3A5A7E' }}>Usage Access required. Fallback is a full-screen reminder when a restricted app opens.</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12.5, lineHeight: 20, color: '#3A5A7E', marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderColor: 'rgba(61,115,201,0.18)' }}>
            Calls, messages and emergency services remain available on both platforms.
          </Text>
        </View>

        <PrimaryButton label="Activate Focus" onPress={nav.focusActive} style={{ marginTop: 16 }} />
      </ScrollView>
    </ScreenFade>
  );
}
