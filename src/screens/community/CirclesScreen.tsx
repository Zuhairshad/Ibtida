import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import AvatarStack from '../../components/AvatarStack';
import { ChevronLeftIcon } from '../../theme/icons';
import { CIRCLES } from '../../state/communityData';

export default function CirclesScreen() {
  const { state } = useAppState();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <PressableScale onPress={nav.community} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <ChevronLeftIcon color={colors.inkMuted} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Community</Text>
          </PressableScale>
          <PressableScale
            onPress={nav.circleNew}
            accessibilityRole="button"
            scaleTo={0.95}
            style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.1)', backgroundColor: '#FFFFFF', borderRadius: 12, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkStrong }}>New circle</Text>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 14 }}>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Circles</Text>
          <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 9, lineHeight: 20 }}>Private groups. Invite only unless you change it.</Text>
        </RiseIn>

        <RiseIn delay={100} style={{ paddingHorizontal: 24, marginTop: 18, gap: 10 }}>
          {/* Circles the user just created appear at the top, empty of
              activity until members join. */}
          {state.circleNames.map((name) => (
            <View key={name} style={{ borderWidth: 1, borderColor: 'rgba(61,115,201,0.25)', borderRadius: 24, padding: 20, backgroundColor: colors.primaryTint }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: colors.inkStrong }}>{name}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 6 }}>1 member · Invite only</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.8)', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>New</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12.5, lineHeight: 19, color: '#3A5A7E', marginTop: 14 }}>Invite someone to get started — progress appears once members join.</Text>
            </View>
          ))}
          {CIRCLES.map((c) => (
            <View key={c.name} style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: colors.inkStrong }}>{c.name}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 6 }}>
                    {c.members} members · {c.privacy}
                  </Text>
                </View>
                <AvatarStack avatars={c.avatars} />
              </View>
              <View style={{ marginTop: 16, padding: 14, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.inkStrong }}>{c.goal}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 12 }}>
                  <View style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: colors.bgTint, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 3, backgroundColor: colors.success, width: `${c.pct}%` }} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkMuted }}>{c.pct}%</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12.5, lineHeight: 19, color: colors.inkMuted, marginTop: 14 }}>{c.activity}</Text>
            </View>
          ))}
        </RiseIn>
      </ScrollView>
    </View>
  );
}
