import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { startFocusSession, tapFocusSession, endFocusSession } from '../../services/focus';
import { listGoals, updateGoalProgress, completeGoal } from '../../services/adhkar';
import {
  getActiveLockedSession,
  startGoalLockedSession,
  endLockedSession,
  logEmergencyOverride,
  listBlockedApps,
  type AppPlatform,
} from '../../services/ibadahLock';
import { isAppBlockingSupported, startBlocking, stopBlocking, addBlockingEventListener } from '../../../modules/expo-ibadah-native';
import { nav } from '../../navigation/navigate';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import ConfirmSheet from '../../components/ConfirmSheet';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';

const CURRENT_PLATFORM: AppPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
// Fixed for the process lifetime — see the same constant's comment in
// FocusSetupScreen.tsx.
const BLOCKING_SUPPORTED = isAppBlockingSupported();

// Dark, minimal, hard-to-accidentally-exit focus state — the "Ibadah Lock"
// distraction-blocking feature. Calls/messages explicitly remain available.
//
// A session is "locked" (app-blocked) when route.params.goalId is set (a
// fresh start from FocusSetupScreen's goal picker) or when the session being
// resumed already has a goal_id (see getActiveLockedSession) — a plain
// unlocked session has neither and behaves exactly as before this feature.
export default function FocusActiveScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'FocusActive'>>();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(100);
  const [loading, setLoading] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmEmergency, setConfirmEmergency] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  // Whether native app-blocking is actually enforcing right now for this
  // session — distinct from `goalId` being set, since arming can fail, the
  // platform may not support it yet, or an emergency unlock may have lifted
  // it already. Never shown as "on" unless it really is.
  const [blockingActive, setBlockingActive] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Starts native enforcement for this platform's persisted blocked_apps
  // list. Best-effort: any failure (no native module, native error) just
  // leaves blockingActive false rather than throwing into the caller — a
  // locked session with blocking that failed to arm is still a valid state,
  // just one this screen must show honestly (see the render below).
  const armBlocking = useCallback(async (userId: string) => {
    try {
      const apps = await listBlockedApps(userId);
      const ids = apps.filter((a) => a.platform === CURRENT_PLATFORM).map((a) => a.appIdentifier);
      setBlockedCount(ids.length);
      if (ids.length === 0) {
        setBlockingActive(false);
        return;
      }
      await startBlocking(ids);
      setBlockingActive(true);
    } catch {
      setBlockingActive(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      (async () => {
        try {
          // getActiveLockedSession is a strict superset of focus.ts's
          // getActiveFocusSession (same row, plus goal_id) — resuming
          // through it covers both locked and plain in-progress sessions.
          const existing = await getActiveLockedSession(user.id);
          if (existing) {
            if (!active) return;
            setSessionId(existing.id);
            setCount(existing.count);
            setTarget(existing.target);
            setGoalId(existing.goalId);
            if (existing.goalId && BLOCKING_SUPPORTED) await armBlocking(user.id);
            return;
          }

          if (route.params?.goalId) {
            const created = await startGoalLockedSession(user.id, route.params.goalId, route.params.target);
            if (!active) return;
            setSessionId(created.id);
            setCount(0);
            setTarget(route.params.target);
            setGoalId(route.params.goalId);
            if (BLOCKING_SUPPORTED) await armBlocking(user.id);
            return;
          }

          // Plain (unlocked) session — no dedicated "focus goal" target
          // exists, so seed it from the user's most recent Adhkar goal,
          // falling back to 100 (AppState's old `newTarget` field is dead:
          // GoalNewScreen keeps its target as local form state only).
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
    }, [user, route.params, armBlocking])
  );

  // Surfaces a gentle in-app notice if the app happens to be foregrounded
  // when the native side reports a blocked-app open attempt, and reflects
  // blocking having been stopped from the native side itself (e.g. the user
  // revoked Screen Time authorization out from under the app).
  useEffect(() => {
    if (!goalId) return;
    const sub = addBlockingEventListener((event) => {
      if (event.type === 'blocked-app-opened') {
        setToast('That app is blocked until your goal is done.');
      } else if (event.type === 'stopped') {
        setBlockingActive(false);
      }
    });
    return () => sub.remove();
  }, [goalId]);

  const remaining = Math.max(target - count, 0);

  // Reaching the goal ends the session in the celebration moment rather than
  // silently capping the counter — and, for a locked session, marks the
  // linked adhkar goal complete and lifts app-blocking.
  const onTap = () => {
    if (!sessionId) return;
    const optimistic = Math.min(count + 1, target);
    setCount(optimistic);
    if (optimistic >= target) {
      if (goalId) {
        updateGoalProgress(goalId, target).catch(() => {});
        completeGoal(goalId).catch(() => {});
      }
      if (blockingActive) stopBlocking().catch(() => {});
      setBlockingActive(false);
      endLockedSession(sessionId).catch(() => {});
      nav.goalComplete();
    }
    tapFocusSession(sessionId)
      .then((s) => setCount(s.count))
      .catch(() => setToast('Could not save your progress.'));
  };

  const onEndFocus = () => {
    setConfirmEnd(false);
    if (sessionId) {
      endFocusSession(sessionId).catch(() => setToast('Could not save your session end.'));
      if (blockingActive) stopBlocking().catch(() => {});
      setBlockingActive(false);
    }
    nav.home();
  };

  // The "break glass" safety valve: lifts blocking immediately and logs the
  // use to the caller's own, own-eyes-only history — never ends the
  // session, so this reads as a real release valve rather than a shortcut
  // to quit early.
  const onEmergencyUnlock = async () => {
    setConfirmEmergency(false);
    if (!user || !sessionId) return;
    setUnlocking(true);
    try {
      await stopBlocking();
    } catch {
      // Best-effort — still reflect apps as unblocked and log the override
      // even if the native call itself failed (e.g. already stopped).
    }
    setBlockingActive(false);
    try {
      await logEmergencyOverride(user.id, sessionId);
      setToast('Apps unlocked. This is saved to your own emergency-unlock history — visible only to you.');
    } catch {
      setToast('Apps are unlocked, but we could not save this to your history.');
    } finally {
      setUnlocking(false);
    }
  };

  const isLocked = !!goalId;
  const lockStatusLabel = !isLocked
    ? null
    : !BLOCKING_SUPPORTED
      ? 'Not available on this device yet'
      : blockingActive
        ? `${blockedCount} app${blockedCount === 1 ? '' : 's'} restricted`
        : 'Apps unlocked';

  return (
    <ScreenFade duration={400} style={{ backgroundColor: '#1B2621' }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: 'rgba(239,243,240,0.45)' }}>
          {isLocked ? 'Ibadah Lock' : 'Ibadah Focus'}
        </Text>
        {!!lockStatusLabel && <Text style={{ fontSize: 12.5, fontWeight: '500', color: 'rgba(239,243,240,0.45)' }}>{lockStatusLabel}</Text>}
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

          {isLocked && BLOCKING_SUPPORTED && !blockingActive && blockedCount > 0 && (
            <Text style={{ fontSize: 12, lineHeight: 18, color: '#E0B166', marginTop: 16, textAlign: 'center', maxWidth: 260 }}>
              Apps aren’t currently blocked{unlocking ? '…' : '.'}
            </Text>
          )}
        </View>
      )}

      <View style={{ paddingHorizontal: 26, paddingBottom: insets.bottom + 20, gap: 4 }}>
        {isLocked && blockingActive && (
          <PressableScale
            onPress={() => setConfirmEmergency(true)}
            disabled={loading || unlocking}
            accessibilityRole="button"
            scaleTo={1}
            style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#E0B166' }}>{unlocking ? 'Unlocking…' : 'Emergency unlock'}</Text>
          </PressableScale>
        )}
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

      {/* A real safety valve, not a shortcut to quit: apps unblock instantly,
          the session keeps running, and the use is recorded to a history
          only the user themself can ever see. */}
      <ConfirmSheet
        visible={confirmEmergency}
        title="Emergency unlock?"
        body="Your restricted apps unblock right away. Your dhikr count and goal keep going either way — this just gets logged to your own emergency-unlock history, visible only to you."
        confirmLabel="Unlock now"
        onConfirm={onEmergencyUnlock}
        onCancel={() => setConfirmEmergency(false)}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
