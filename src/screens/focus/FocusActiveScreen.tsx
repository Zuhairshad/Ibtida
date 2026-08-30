import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { getActiveFocusSession, startFocusSession, tapFocusSession, endFocusSession } from '../../services/focus';
import { listGoals } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import ConfirmSheet from '../../components/ConfirmSheet';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';

// Dark, minimal, hard-to-accidentally-exit focus state — the "Ibadah Lock"
// distraction-blocking feature. Calls/messages explicitly remain available.
export default function FocusActiveScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(100);
  const [loading, setLoading] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      (async () => {
        try {
          const existing = await getActiveFocusSession(user.id);
          if (existing) {
            if (!active) return;
            setSessionId(existing.id);
            setCount(existing.count);
            setTarget(existing.target);
            return;
          }
          // No dedicated "focus goal" target exists — seed a brand-new
          // session's target from the user's most recent Adhkar goal
          // (`adhkar_goals`, via services/adhkar.listGoals), falling back to
          // 100. AppState's old `newTarget` field is dead: GoalNewScreen
          // keeps its target as local form state and never writes it back.
          const goals = await listGoals(user.id);
          const activeGoal = goals.find((g) => !g.completedAt) ?? goals[0];
          const seedTarget = activeGoal?.target ?? 100;
          const created = await startFocusSession(user.id, seedTarget);
          if (!active) return;
          setSessionId(created.id);
          setCount(0);
          setTarget(seedTarget);
        } catch {
          if (active) setToast('Could not start your focus session.');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [user])
  );

  const remaining = Math.max(target - count, 0);

  // Reaching the goal ends the session in the celebration moment rather than
  // silently capping the counter.
  const onTap = () => {
    if (!sessionId) return;
    const optimistic = Math.min(count + 1, target);
    setCount(optimistic);
    if (optimistic >= target) nav.goalComplete();
    tapFocusSession(sessionId)
      .then((s) => setCount(s.count))
      .catch(() => setToast('Could not save your progress.'));
  };

  const onEndFocus = () => {
    setConfirmEnd(false);
    if (sessionId) {
      endFocusSession(sessionId).catch(() => setToast('Could not save your session end.'));
    }
    nav.home();
  };

  return (
    <ScreenFade duration={400} style={{ backgroundColor: '#1B2621' }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: 'rgba(239,243,240,0.45)' }}>Ibadah Focus</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: 'rgba(239,243,240,0.45)' }}>4 apps restricted</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SkeletonBlock width={236} height={236} radius={118} style={{ backgroundColor: 'rgba(239,243,240,0.08)' }} />
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
          <ProgressRing size={236} strokeWidth={4} progress={target > 0 ? count / target : 0} trackColor="rgba(239,243,240,0.1)" color="#3D73C9">
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 62, fontWeight: '600', color: '#EFF3F0', letterSpacing: -0.035 }}>{count}</Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: 'rgba(239,243,240,0.5)', marginTop: 8 }}>/ {target}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(239,243,240,0.42)', marginTop: 14 }}>{remaining} remaining</Text>
            </View>
          </ProgressRing>
          <Text style={{ fontSize: 17, fontWeight: '500', color: 'rgba(239,243,240,0.85)', marginTop: 30 }}>Stay focused.</Text>
          <PressableScale
            onPress={onTap}
            accessibilityRole="button"
            scaleTo={0.985}
            style={{ marginTop: 20, borderWidth: 1, borderColor: 'rgba(239,243,240,0.18)', backgroundColor: 'rgba(239,243,240,0.07)', minHeight: 56, paddingHorizontal: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#EFF3F0' }}>Continue Dhikr</Text>
          </PressableScale>
          <Text style={{ fontSize: 12.5, lineHeight: 20, color: 'rgba(239,243,240,0.4)', marginTop: 22, textAlign: 'center', maxWidth: 250 }}>Calls and messages still reach you. Everything else waits.</Text>
        </View>
      )}

      <View style={{ paddingHorizontal: 26, paddingBottom: insets.bottom + 20 }}>
        <PressableScale onPress={() => setConfirmEnd(true)} disabled={loading} accessibilityRole="button" scaleTo={1} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: 'rgba(239,243,240,0.5)' }}>End focus</Text>
        </PressableScale>
      </View>

      {/* Early-exit friction: leaving before the goal is a deliberate choice. */}
      <ConfirmSheet
        visible={confirmEnd}
        title="End focus early?"
        body={`You have ${remaining} left of your goal. Your count so far is saved either way.`}
        confirmLabel="End focus now"
        onConfirm={onEndFocus}
        onCancel={() => setConfirmEnd(false)}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
