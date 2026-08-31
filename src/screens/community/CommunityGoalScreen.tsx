import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { listCommunityGoals, joinCommunityGoal, CommunityGoal } from '../../services/community';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing, type } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import PrimaryButton from '../../components/PrimaryButton';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { ChevronLeftIcon } from '../../theme/icons';
import { CommunityStackParamList } from '../../navigation/types';

function daysUntil(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

export default function CommunityGoalScreen() {
  const route = useRoute<RouteProp<CommunityStackParamList, 'CommunityGoal2'>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [goals, setGoals] = useState<CommunityGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      listCommunityGoals(user.id)
        .then((g) => active && setGoals(g))
        .catch(() => active && setToast('Could not load this goal.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [user])
  );

  const goal = goals[route.params?.id ?? 0];

  const onJoin = async () => {
    if (!user || !goal) return;
    setJoining(true);
    try {
      await joinCommunityGoal(user.id, goal.id);
      setGoals((gs) => gs.map((g) => (g.id === goal.id ? { ...g, joined: true, participantCount: g.participantCount + 1 } : g)));
    } catch {
      setToast('Could not join — try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading || !goal) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
          <SkeletonBlock width="100%" height={320} radius={30} />
          <SkeletonBlock width="100%" height={78} radius={24} style={{ marginTop: 12 }} />
        </ScrollView>
        <Toast message={toast} onDismiss={() => setToast(null)} />
      </View>
    );
  }

  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.totalProgress / goal.target) * 100)) : 0;
  const ends = daysUntil(goal.endsAt);
  const unit = goal.unit ? ` ${goal.unit}` : '';

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
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.cardLarge, padding: spacing.xl, backgroundColor: colors.card, ...shadow.card }}>
            <Text style={{ ...type.h1, color: colors.ink }}>{goal.name}</Text>
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 22, alignSelf: 'center' }}>
              <ProgressRing size={180} strokeWidth={8} progress={pct / 100} trackColor={colors.successTint} color={colors.success}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 34, fontWeight: '600', color: colors.ink, letterSpacing: -0.03 }}>{pct}%</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 8 }}>of the goal</Text>
                </View>
              </ProgressRing>
            </View>
            <View style={{ alignItems: 'center', marginTop: 18 }}>
              <Text style={{ fontSize: 17, fontWeight: '500', color: colors.ink }}>
                {goal.totalProgress.toLocaleString()} / {goal.target.toLocaleString()}
                {unit}
              </Text>
              <Text style={{ fontSize: 13, color: colors.inkMuted, marginTop: 9 }}>
                {goal.participantCount.toLocaleString()} participants{ends ? ` · ends ${ends}` : ''}
              </Text>
            </View>
          </View>
        </RiseIn>

        <RiseIn delay={110} style={{ paddingHorizontal: 24, marginTop: 12 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow.card }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Your contribution</Text>
              <Text style={{ fontSize: 24, fontWeight: '600', color: colors.ink, letterSpacing: -0.025, marginTop: 11 }}>
                {goal.joined ? goal.myProgress.toLocaleString() : '—'}
              </Text>
            </View>
            {goal.joined ? (
              <View style={{ backgroundColor: colors.successTint, paddingVertical: 8, paddingHorizontal: 11, borderRadius: radii.pill }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.successStrong }}>Joined</Text>
              </View>
            ) : (
              <PressableScale
                onPress={onJoin}
                disabled={joining}
                scaleTo={0.94}
                accessibilityRole="button"
                style={{ backgroundColor: colors.primary, paddingVertical: 9, paddingHorizontal: 14, borderRadius: radii.button, opacity: joining ? 0.6 : 1 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkOnPrimary }}>Join</Text>
              </PressableScale>
            )}
          </View>
        </RiseIn>

        <RiseIn delay={150} style={{ paddingHorizontal: 24, marginTop: 12 }}>
          <View style={{ borderRadius: radii.card, padding: 17, backgroundColor: colors.goldTint }}>
            <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.gold }}>
              A shared total is company on the way, not a claim about reward. Ibadah makes no theological promise about what a number means.
            </Text>
          </View>
        </RiseIn>

        <RiseIn delay={190} style={{ paddingHorizontal: 24, marginTop: 14 }}>
          <PrimaryButton label="Contribute dhikr" onPress={nav.tasbeeh} />
        </RiseIn>
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
