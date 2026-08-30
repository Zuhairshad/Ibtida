import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SegmentedControl from '../../components/SegmentedControl';
import { TrendUpIcon, ChevronRightIcon } from '../../theme/icons';
import { COMMUNITY_GOALS } from '../../state/communityData';

const TABS = ['Overview', 'Goals', 'Circles', 'Feed'];

export default function CommunityScreen() {
  const { state, setCommTab, joinCommunityGoal } = useAppState();
  const insets = useSafeAreaInsets();

  const onTabChange = (i: number) => {
    if (i === 2) nav.circles();
    else setCommTab(i);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Community</Text>
          <SegmentedControl options={TABS} selected={state.commTab} onChange={onTabChange} style={{ marginTop: 16 }} />
        </RiseIn>

        <RiseIn delay={70} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 30, padding: 26, backgroundColor: '#FBF8F1', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Today's community dhikr</Text>
            <Text style={{ fontSize: 42, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.035, marginTop: 16 }}>2,847,391</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.bgTint }}>
              <TrendUpIcon />
              <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkStrong }}>+18,421 today</Text>
            </View>
            <Text style={{ fontSize: 14, lineHeight: 22, color: colors.inkMuted, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderColor: colors.divider, textAlign: 'center' }}>
              Your contribution is counted, never named.
            </Text>
          </View>
        </RiseIn>

        <RiseIn delay={120} style={{ paddingHorizontal: 24, marginTop: 22 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Community goals</Text>
          <View style={{ gap: 10 }}>
            {COMMUNITY_GOALS.map((c, i) => {
              const joined = state.joined[i];
              return (
                <PressableScale
                  key={c.id}
                  onPress={() => nav.communityGoal(c.id)}
                  style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16.5, fontWeight: '600', color: colors.inkStrong }}>{c.name}</Text>
                      <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 6 }}>
                        {c.people} participants · ends {c.ends}
                      </Text>
                    </View>
                    {joined ? (
                      <View style={{ backgroundColor: colors.bgTint, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkStrong }}>Joined</Text>
                      </View>
                    ) : (
                      <PressableScale onPress={() => joinCommunityGoal(i)} scaleTo={0.92} style={{ backgroundColor: colors.primary, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Join</Text>
                      </PressableScale>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 16 }}>
                    <View style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: colors.bgTint, overflow: 'hidden' }}>
                      <View style={{ height: '100%', borderRadius: 3, backgroundColor: '#3D73C9', width: `${c.pct}%` }} />
                    </View>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}>{c.pctText}</Text>
                  </View>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 10 }}>
                    {c.done} / {c.total}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </RiseIn>

        <RiseIn delay={170} style={{ paddingHorizontal: 24, marginTop: 12 }}>
          <PressableScale
            onPress={nav.circles}
            style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, padding: 18, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}
          >
            <View>
              <Text style={{ fontSize: 15.5, fontWeight: '600', color: colors.inkStrong }}>Your circles</Text>
              <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 6 }}>2 private groups</Text>
            </View>
            <ChevronRightIcon />
          </PressableScale>
        </RiseIn>
      </ScrollView>
    </View>
  );
}
