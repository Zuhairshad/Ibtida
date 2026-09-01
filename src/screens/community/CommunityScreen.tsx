import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAppState } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import { listCommunityGoals, joinCommunityGoal, listMyCircles, joinCircleByCode, CommunityGoal, MyCircle } from '../../services/community';
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

const TABS = ['Overview', 'Goals', 'Circles'];

function goalPct(g: CommunityGoal) {
  return g.target > 0 ? Math.min(100, Math.round((g.totalProgress / g.target) * 100)) : 0;
}

export default function CommunityScreen() {
  const { state, setCommTab } = useAppState();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [goals, setGoals] = useState<CommunityGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [circles, setCircles] = useState<MyCircle[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [circleCount, setCircleCount] = useState<number | null>(null);
  const [totalDhikr, setTotalDhikr] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setGoalsLoading(true);
      setCirclesLoading(true);
      Promise.all([listCommunityGoals(user.id), listMyCircles(user.id)])
        .then(([g, c]) => {
          if (!active) return;
          setGoals(g);
          setCircles(c);
          setCircleCount(c.length);
          setTotalDhikr(g.reduce((sum, goal) => sum + goal.totalProgress, 0));
        })
        .catch(() => active && setToast('Could not load community data.'))
        .finally(() => {
          if (active) {
            setGoalsLoading(false);
            setCirclesLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, [user])
  );

  const onTabChange = (i: number) => setCommTab(i);

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

  const onJoinByCode = async () => {
    if (!user || !joinCode.trim() || joining) return;
    setJoining(true);
    try {
      const { circleId, circleName } = await joinCircleByCode(user.id, joinCode.trim());
      setJoinCode('');
      setToast(`Joined "${circleName}"!`);
      const updated = await listMyCircles(user.id);
      setCircles(updated);
      setCircleCount(updated.length);
      setTimeout(() => nav.circleDetail(circleId), 800);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Invalid invite code — check and try again.');
    } finally {
      setJoining(false);
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
                <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Today's community dhikr</Text>
                <Text style={{ fontSize: 42, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.035, marginTop: 16 }}>
                  {totalDhikr === null ? '—' : totalDhikr.toLocaleString()}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.bgTint }}>
                  <TrendUpIcon />
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.inkStrong }}>—</Text>
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
              <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, padding: 16, backgroundColor: '#FFFFFF', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: colors.inkSecondary }}>Live stats coming soon</Text>
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

        {/* CIRCLES — inline circles list + join by code */}
        {state.commTab === 2 && (
          <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 18 }}>
            {/* Join by invite code */}
            <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 22, backgroundColor: '#FFFFFF', overflow: 'hidden', marginBottom: 18 }}>
              <View style={{ padding: 16, borderBottomWidth: 1, borderColor: colors.cardBorder }}>
                <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.09, color: colors.inkSecondary, marginBottom: 10 }}>
                  Join with invite link or code
                </Text>
                <TextInput
                  value={joinCode}
                  onChangeText={setJoinCode}
                  placeholder="Paste invite link or code here\u2026"
                  placeholderTextColor="#A8AEB4"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ fontSize: 15, color: colors.inkStrong, padding: 0 }}
                />
              </View>
              <PressableScale
                onPress={onJoinByCode}
                disabled={!joinCode.trim() || joining}
                scaleTo={0.985}
                style={{ padding: 16, alignItems: 'center', opacity: !joinCode.trim() || joining ? 0.5 : 1 }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>
                  {joining ? 'Joining\u2026' : 'Join circle'}
                </Text>
              </PressableScale>
            </View>

            {/* My circles */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.09, color: colors.inkSecondary }}>
                My circles
              </Text>
              <PressableScale
                onPress={nav.circleNew}
                scaleTo={0.95}
                style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.1)', backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkStrong }}>New circle</Text>
              </PressableScale>
            </View>

            {circlesLoading ? (
              <RowSkeleton rows={2} />
            ) : circles.length === 0 ? (
              <EmptyState
                icon={<CommunityIcon />}
                title="No circles yet"
                subtitle="Start a small private group — family, friends, a Ramadan or Quran group."
                actionLabel="New circle"
                onAction={nav.circleNew}
              />
            ) : (
              <View style={{ gap: 10 }}>
                {circles.map((c) => (
                  <PressableScale
                    key={c.id}
                    scaleTo={0.985}
                    onPress={() => nav.circleDetail(c.id)}
                    style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.inkStrong }}>{c.name}</Text>
                        <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 6 }}>
                          {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'} · {c.privacy}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {c.role === 'owner' && (
                          <View style={{ backgroundColor: colors.bgTint, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkStrong }}>Owner</Text>
                          </View>
                        )}
                        <ChevronRightIcon color={colors.inkMuted} />
                      </View>
                    </View>
                  </PressableScale>
                ))}
              </View>
            )}
          </RiseIn>
        )}
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
