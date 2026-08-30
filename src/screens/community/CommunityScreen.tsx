import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAppState } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import { listCommunityGoals, joinCommunityGoal, listMyCircles, CommunityGoal } from '../../services/community';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SegmentedControl from '../../components/SegmentedControl';
import BarChart from '../../components/BarChart';
import { RowSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import { TrendUpIcon, ChevronRightIcon, CommunityIcon } from '../../theme/icons';
import { FEED, LIVE_NOW } from '../../state/communityData';

const TABS = ['Overview', 'Goals', 'Circles', 'Feed'];

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
    <View style={{ gap: 10 }}>
      {goals.map((g, i) => {
        const pct = goalPct(g);
        return (
          <PressableScale
            key={g.id}
            onPress={() => nav.communityGoal(i)}
            accessibilityRole="button"
            accessibilityLabel={`${g.name}, ${pct}% complete`}
            style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16.5, fontWeight: '600', color: colors.inkStrong }}>{g.name}</Text>
                <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 6 }}>
                  {g.participantCount.toLocaleString()} participants
                </Text>
              </View>
              {g.joined ? (
                <View style={{ backgroundColor: colors.bgTint, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkStrong }}>Joined</Text>
                </View>
              ) : (
                <PressableScale
                  onPress={() => onJoin(g.id)}
                  disabled={joiningId === g.id}
                  scaleTo={0.92}
                  accessibilityRole="button"
                  accessibilityLabel={`Join ${g.name}`}
                  style={{ backgroundColor: colors.primary, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, opacity: joiningId === g.id ? 0.6 : 1 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Join</Text>
                </PressableScale>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 16 }}>
              <View style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: colors.bgTint, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 3, backgroundColor: '#3D73C9', width: `${pct}%` }} />
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
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Community</Text>
          <SegmentedControl options={TABS} selected={state.commTab} onChange={onTabChange} style={{ marginTop: 16 }} />
        </RiseIn>

        {/* OVERVIEW — hero total, live-now tiles, goals, circles link */}
        {state.commTab === 0 && (
          <>
            <RiseIn delay={70} style={{ paddingHorizontal: 24, marginTop: 18 }}>
              <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 30, padding: 26, backgroundColor: '#FBF8F1', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Today’s community dhikr</Text>
                <Text style={{ fontSize: 42, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.035, marginTop: 16 }}>2,847,391</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.bgTint }}>
                  <TrendUpIcon />
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkStrong }}>+18,421 today</Text>
                </View>
                <View style={{ marginTop: 18 }}>
                  <BarChart values={[34, 48, 58, 70, 84, 100]} height={40} color={colors.successStrong} />
                </View>
                <Text style={{ fontSize: 14, lineHeight: 22, color: colors.inkMuted, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderColor: colors.divider, textAlign: 'center' }}>
                  Your contribution is counted, never named.
                </Text>
              </View>
            </RiseIn>

            <RiseIn delay={100} style={{ paddingHorizontal: 24, marginTop: 18 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Live right now</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {LIVE_NOW.map((t) => (
                  <View key={t.label} style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, padding: 16, backgroundColor: '#FFFFFF' }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.inkStrong, letterSpacing: -0.02 }}>{t.value}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 6, lineHeight: 16 }}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </RiseIn>

            <RiseIn delay={130} style={{ paddingHorizontal: 24, marginTop: 22 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Community goals</Text>
              {goalsList}
            </RiseIn>

            <RiseIn delay={170} style={{ paddingHorizontal: 24, marginTop: 12 }}>
              <PressableScale
                onPress={nav.circles}
                accessibilityRole="button"
                style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, padding: 18, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}
              >
                <View>
                  <Text style={{ fontSize: 15.5, fontWeight: '600', color: colors.inkStrong }}>Your circles</Text>
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
          <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 18 }}>
            <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginBottom: 12 }}>
              {goals.filter((g) => g.joined).length} of {goals.length} joined
            </Text>
            {goalsList}
            <View style={{ marginTop: 12, borderRadius: 22, padding: 17, backgroundColor: colors.goldTint }}>
              <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.goldInkDeep }}>
                A shared total is company on the way, not a claim about reward.
              </Text>
            </View>
          </RiseIn>
        )}

        {/* FEED — recent activity, framed as contribution not competition */}
        {state.commTab === 3 && (
          <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 18 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Recent activity</Text>
            <View style={{ gap: 8 }}>
              {FEED.map((f) => (
                <View key={f.name + f.when} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, padding: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'flex-start', gap: 13 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: f.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.inkStrong }}>{f.initial}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14.5, lineHeight: 21, color: colors.inkStrong }}>
                      <Text style={{ fontWeight: '600' }}>{f.name}</Text> {f.action}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 6 }}>
                      {f.when} · {f.likes} encouragements
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 12, borderRadius: 22, padding: 17, backgroundColor: colors.bgTint }}>
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
