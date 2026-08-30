import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';

import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import PrimaryButton from '../../components/PrimaryButton';
import { ChevronLeftIcon } from '../../theme/icons';
import { COMMUNITY_GOALS } from '../../state/communityData';
import { CommunityStackParamList } from '../../navigation/types';

export default function CommunityGoalScreen() {
  const route = useRoute<RouteProp<CommunityStackParamList, 'CommunityGoal2'>>();
  const goal = COMMUNITY_GOALS.find((g) => g.id === route.params?.id) ?? COMMUNITY_GOALS[0];
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24 }}>
          <PressableScale onPress={nav.community} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
            <ChevronLeftIcon color={colors.inkMuted} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Community</Text>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 12 }}>
          <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 30, padding: 26, backgroundColor: '#FBF8F1' }}>
            <Text style={{ fontSize: 26, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>{goal.name}</Text>
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 22, alignSelf: 'center' }}>
              <ProgressRing size={180} strokeWidth={8} progress={goal.pct / 100} trackColor={colors.bgTint} color="#3D73C9">
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 34, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.03 }}>{goal.pctText}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 8 }}>of the goal</Text>
                </View>
              </ProgressRing>
            </View>
            <View style={{ alignItems: 'center', marginTop: 18 }}>
              <Text style={{ fontSize: 17, fontWeight: '500', color: colors.inkStrong }}>
                {goal.done} / {goal.total}
              </Text>
              <Text style={{ fontSize: 13, color: colors.inkMuted, marginTop: 9 }}>{goal.people} participants</Text>
            </View>
          </View>
        </RiseIn>

        <RiseIn delay={110} style={{ paddingHorizontal: 24, marginTop: 12 }}>
          <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Your contribution</Text>
              <Text style={{ fontSize: 24, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 11 }}>1,240</Text>
            </View>
            <View style={{ backgroundColor: colors.bgTint, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.inkStrong }}>Milestone reached</Text>
            </View>
          </View>
        </RiseIn>

        <RiseIn delay={150} style={{ paddingHorizontal: 24, marginTop: 12 }}>
          <View style={{ borderRadius: 22, padding: 17, backgroundColor: colors.goldTint }}>
            <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.goldInkDeep }}>
              A shared total is company on the way, not a claim about reward. Ibadah makes no theological promise about what a number means.
            </Text>
          </View>
        </RiseIn>

        <RiseIn delay={190} style={{ paddingHorizontal: 24, marginTop: 14 }}>
          <PrimaryButton label="Contribute dhikr" onPress={nav.tasbeeh} />
        </RiseIn>
      </ScrollView>
    </View>
  );
}
