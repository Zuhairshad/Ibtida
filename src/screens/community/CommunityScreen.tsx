import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAppState } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import { listCommunityGoals, joinCommunityGoal, listMyCircles, CommunityGoal } from '../../services/community';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing, type } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SegmentedControl from '../../components/SegmentedControl';
import BarChart from '../../components/BarChart';
import { RowSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import { TrendUpIcon, ChevronRightIcon, CommunityIcon, AdhkarIcon, BookIcon, TimerIcon } from '../../theme/icons';
import { FEED, LIVE_NOW } from '../../state/communityData';

const TABS = ['Overview', 'Goals', 'Circles', 'Feed'];
const LIVE_META = [
  { Icon: AdhkarIcon, tint: colors.successTint, ink: colors.successStrong },
  { Icon: BookIcon, tint: colors.primaryTint, ink: colors.primaryStrong },
  { Icon: TimerIcon, tint: colors.goldTint, ink: colors.gold },
];

function goalPct(g: CommunityGoal) {
  return g.target > 0 ? Math.min(100, Math.round((g.totalProgress / g.target) * 100)) : 0;
}

export default function CommunityScreen() {
  const { state, setCommTab } = useAppState();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [goals, setGoals] = useState<CommunityGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [circleCount, setCircleCount] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setGoalsLoading(true);
      Promise.all([listCommunityGoals(user.id), listMyCircles(user.id)])
        .then(([g, circles]) => {
          if (!active) return;
          setGoals(g);
          setCircleCount(circles.length);
        })
        .catch(() => active && setToast('Could not load community data.'))
        .finally(() => active && setGoalsLoading(false));
      return () => {
        active = false;
      };
    }, [user])
  );

  const onTabChange = (i: number) => {
    if (i === 2) nav.circles();
    else setCommTab(i);
  };

  const onJoin = async (goalId: string) => {
    if (!user) return;
    setJoiningId(goalId);
    try {
      await joinCommunityGoal(user.id, goalId);
      setGoals((gs) => gs.map((g) => (g.id === goalId ? { ...g, joined: true, participantCount: g.participantCount + 1 } : g)));
    } catch {
      setToast('Could not join that goal — try again.');
    } finally {
      setJoiningId(null);
    }
  };

  const goalsList = goalsLoading ? (
    <RowSkeleton rows={2} />
  ) : goals.length === 0 ? (
    <EmptyState
      icon={<CommunityIcon />}
      title="No community goals yet"
      subtitle="Shared goals will appear here once they're created."
    />
  ) : (
    <View style={{ gap: spacing.sm }}>
      {goals.map((g, i) => {
        const pct = goalPct(g);
        return (
          <PressableScale
            key={g.id}
            onPress={() => nav.communityGoal(i)}
            accessibilityRole="button"
            accessibilityLabel={`${g.name}, ${pct}% complete`}
            style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.cardLarge, padding: spacing.lg, backgroundColor: colors.card, ...shadow.card }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16.5, fontWeight: '600', color: colors.ink }}>{g.name}</Text>
                <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 6 }}>
                  {g.participantCount.toLocaleString()} participants
                </Text>
              </View>
              {g.joined ? (
                <View style={{ backgroundColor: colors.successTint, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.pill }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.successStrong }}>Joined</Text>
                </View>
              ) : (
                <PressableScale
                  onPress={() => onJoin(g.id)}
                  disabled={joiningId === g.id}
                  scaleTo={0.92}
                  accessibilityRole="button"
                  accessibilityLabel={`Join ${g.name}`}
                  style={{ backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.button, opacity: joiningId === g.id ? 0.6 : 1 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkOnPrimary }}>Join</Text>
                </PressableScale>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 16 }}>
              <View style={{ height: 6, flex: 1, borderRadius: radii.pill, backgroundColor: colors.successTint, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: radii.pill, backgroundColor: colors.success, width: `${pct}%` }} />
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}>{pct}%</Text>
            </View>
            <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 10 }}>
              {g.totalProgress.toLocaleString()} / {g.target.toLocaleString()}
              {g.unit ? ` ${g.unit}` : ''}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.standard, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: spacing.xl }}>
          <Text style={{ ...type.h1, color: colors.ink }}>Community</Text>
          <SegmentedControl options={TABS} selected={state.commTab} onChange={onTabChange} style={{ marginTop: spacing.standard }} />
        </RiseIn>

        {/* OVERVIEW — hero total, live-now tiles, goals, circles link */}
        {state.commTab === 0 && (
          <>
            <RiseIn delay={70} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
              <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.cardLarge, padding: spacing.xl, backgroundColor: colors.card, alignItems: 'center', ...shadow.card }}>
                <Text style={{ ...type.h2, color: colors.ink, textAlign: 'center' }}>Today’s Community Dhikr</Text>
                <Text style={{ ...type.display, color: colors.ink, marginTop: spacing.standard }}>2,847,391</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.successTint }}>
                  <TrendUpIcon color={colors.successStrong} />
                  <Text style={{ ...type.captionStrong, color: colors.successStrong }}>+18,421 today</Text>
                </View>
                <View style={{ marginTop: 18 }}>
                  <BarChart values={[34, 48, 58, 70, 84, 100]} height={40} color={colors.successStrong} />
                </View>
                <Text style={{ fontSize: 14, lineHeight: 22, color: colors.inkMuted, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderColor: colors.divider, textAlign: 'center' }}>
                  Your contribution is counted, never named.
                </Text>
              </View>
            </RiseIn>

            <RiseIn delay={100} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
              <Text style={{ ...type.captionStrong, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: spacing.md }}>Live right now</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {LIVE_NOW.map((t, index) => {
                  const { Icon, tint, ink } = LIVE_META[index] ?? LIVE_META[0];
                  return (
                    <View key={t.label} style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.standard, backgroundColor: colors.card, ...shadow.card }}>
                      <View style={{ width: 28, height: 28, borderRadius: radii.control, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
                        <Icon size={15} color={ink} />
                      </View>
                      <Text style={{ ...type.numeral, color: colors.ink }}>{t.value}</Text>
                      <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 6, lineHeight: 16 }}>{t.label}</Text>
                    </View>
                  );
                })}
              </View>
            </RiseIn>

            <RiseIn delay={130} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Community goals</Text>
              {goalsList}
            </RiseIn>

            <RiseIn delay={170} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md }}>
              <PressableScale
                onPress={nav.circles}
                accessibilityRole="button"
                style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, ...shadow.card }}
              >
                <View>
                  <Text style={{ fontSize: 15.5, fontWeight: '600', color: colors.ink }}>Your circles</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 6 }}>
                    {circleCount === null ? '—' : `${circleCount} ${circleCount === 1 ? 'circle' : 'circles'}`}
                  </Text>
                </View>
                <ChevronRightIcon />
              </PressableScale>
            </RiseIn>
          </>
        )}

        {/* GOALS — the full goal list on its own */}
        {state.commTab === 1 && (
          <RiseIn delay={60} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
            <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginBottom: 12 }}>
              {goals.filter((g) => g.joined).length} of {goals.length} joined
            </Text>
            {goalsList}
            <View style={{ marginTop: 12, borderRadius: radii.card, padding: 17, backgroundColor: colors.goldTint }}>
              <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.gold }}>
                A shared total is company on the way, not a claim about reward.
              </Text>
            </View>
          </RiseIn>
        )}

        {/* FEED — recent activity, framed as contribution not competition */}
        {state.commTab === 3 && (
          <RiseIn delay={60} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Recent activity</Text>
            <View style={{ gap: 8 }}>
              {FEED.map((f) => (
                <View key={f.name + f.when} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.standard, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, ...shadow.card }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: f.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{f.initial}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14.5, lineHeight: 21, color: colors.ink }}>
                      <Text style={{ fontWeight: '600' }}>{f.name}</Text> {f.action}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 6 }}>
                      {f.when} · {f.likes} encouragements
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 12, borderRadius: radii.card, padding: 17, backgroundColor: colors.primaryTint }}>
              <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkMuted }}>
                Activity is shown to encourage, never to rank. Nothing here compares one person’s worship to another’s.
              </Text>
            </View>
          </RiseIn>
        )}
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
