import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

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
import ConfirmSheet from '../../components/ConfirmSheet';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';

const CURRENT_PLATFORM: AppPlatform = Platform.OS === 'ios' ? 'ios' : 'android';
const BLOCKING_SUPPORTED = isAppBlockingSupported();

// Bead ring geometry — matches TasbeehScreen
const TOTAL_BEADS = 33;
const ORBIT_RADIUS = 112;
const BEAD_R = 9;
const SVG_SIZE = (ORBIT_RADIUS + BEAD_R) * 2 + 20;

function beadPosition(i: number) {
  const angle = (i / TOTAL_BEADS) * 2 * Math.PI - Math.PI / 2;
  return {
    cx: SVG_SIZE / 2 + ORBIT_RADIUS * Math.cos(angle),
    cy: SVG_SIZE / 2 + ORBIT_RADIUS * Math.sin(angle),
  };
}

function BeadRing({ count, target }: { count: number; target: number }) {
  const filledBeads = count % TOTAL_BEADS;
  const done = count >= target;
  return (
    <Svg width={SVG_SIZE} height={SVG_SIZE}>
      {Array.from({ length: TOTAL_BEADS }, (_, i) => {
        const { cx, cy } = beadPosition(i);
        const filled = done || i < filledBeads;
        const isCurrent = !done && i === filledBeads;
        return (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={isCurrent ? BEAD_R + 2.5 : BEAD_R}
            fill={
              filled
                ? '#C9A96E'
                : isCurrent
                  ? 'rgba(201,169,110,0.45)'
                  : 'rgba(239,243,240,0.1)'
            }
          />
        );
      })}
    </Svg>
  );
}

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
  const [blockingActive, setBlockingActive] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Pulse animation for current bead
  const pulseScale = useRef(new Animated.Value(1)).current;

  const triggerPulse = useCallback(() => {
    pulseScale.setValue(1.35);
    Animated.spring(pulseScale, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }).start();
  }, [pulseScale]);

  const armBlocking = useCallback(async (userId: string) => {
    try {
      const apps = await listBlockedApps(userId);
      const ids = apps.filter((a) => a.platform === CURRENT_PLATFORM).map((a) => a.appIdentifier);
      setBlockedCount(ids.length);
      if (ids.length === 0) { setBlockingActive(false); return; }
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
      return () => { active = false; };
    }, [user, route.params, armBlocking])
  );

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

  // Keep a ref to the latest onCount for use inside PanResponder
  const onCountRef = useRef<() => void>(() => {});

  const onCount = useCallback(() => {
    if (!sessionId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    triggerPulse();
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
  }, [sessionId, count, target, goalId, blockingActive, triggerPulse]);

  useEffect(() => { onCountRef.current = onCount; }, [onCount]);

  // PanResponder: swipe up/right or tap → count one bead
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5 || Math.abs(gs.dx) > 5,
      onPanResponderRelease: (_, gs) => {
        // Accept swipe in any direction, or a simple tap (no movement)
        const moved = Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4;
        const isUpSwipe = gs.dy < -8;
        const isRightSwipe = gs.dx > 8;
        if (!moved || isUpSwipe || isRightSwipe) {
          onCountRef.current();
        }
      },
    })
  ).current;

  const remaining = Math.max(target - count, 0);
  const reps = Math.floor(count / TOTAL_BEADS);

  // Position of the current bead for the pulsing overlay
  const currentBeadIdx = count % TOTAL_BEADS;
  const { cx: beadCx, cy: beadCy } = beadPosition(currentBeadIdx);

  const onEndFocus = () => {
    setConfirmEnd(false);
    if (sessionId) {
      endFocusSession(sessionId).catch(() => setToast('Could not save your session end.'));
      if (blockingActive) stopBlocking().catch(() => {});
      setBlockingActive(false);
    }
    nav.home();
  };

  const onEmergencyUnlock = async () => {
    setConfirmEmergency(false);
    if (!user || !sessionId) return;
    setUnlocking(true);
    try { await stopBlocking(); } catch {}
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
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: 'rgba(239,243,240,0.45)' }}>
          {isLocked ? 'Ibadah Lock' : 'Ibadah Focus'}
        </Text>
        {!!lockStatusLabel && (
          <Text style={{ fontSize: 12.5, fontWeight: '500', color: 'rgba(239,243,240,0.45)' }}>{lockStatusLabel}</Text>
        )}
      </View>

      {/* Main content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SkeletonBlock width={SVG_SIZE} height={SVG_SIZE} radius={SVG_SIZE / 2} style={{ backgroundColor: 'rgba(239,243,240,0.08)' }} />
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* Bead ring — tap or swipe up/right to count */}
          <View
            {...panResponder.panHandlers}
            style={{ width: SVG_SIZE, height: SVG_SIZE, alignItems: 'center', justifyContent: 'center' }}
          >
            <BeadRing count={count} target={target} />

            {/* Pulsing current-bead overlay */}
            {count < target && (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: beadCx - (BEAD_R + 2.5),
                  top: beadCy - (BEAD_R + 2.5),
                  width: (BEAD_R + 2.5) * 2,
                  height: (BEAD_R + 2.5) * 2,
                  borderRadius: BEAD_R + 2.5,
                  backgroundColor: '#C9A96E',
                  transform: [{ scale: pulseScale }],
                }}
              />
            )}

            {/* Center display */}
            <View style={{ position: 'absolute', alignItems: 'center', pointerEvents: 'none' }}>
              <Text style={{ fontSize: 56, fontWeight: '700', color: '#EFF3F0', letterSpacing: -0.04 }}>{count}</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: 'rgba(239,243,240,0.45)', marginTop: 4 }}>/ {target}</Text>
              {reps > 0 && (
                <Text style={{ fontSize: 12, color: '#C9A96E', marginTop: 8, fontWeight: '600' }}>{reps} × 33</Text>
              )}
            </View>
          </View>

          {/* Remaining + hint */}
          <Text style={{ fontSize: 13.5, color: 'rgba(239,243,240,0.42)', marginTop: 18 }}>
            {remaining} remaining
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(239,243,240,0.28)', marginTop: 7 }}>
            Swipe up or tap to count
          </Text>

          {isLocked && BLOCKING_SUPPORTED && !blockingActive && blockedCount > 0 && (
            <Text style={{ fontSize: 12, lineHeight: 18, color: '#E0B166', marginTop: 18, textAlign: 'center', maxWidth: 260 }}>
              Apps aren't currently blocked{unlocking ? '…' : '.'}
            </Text>
          )}
        </View>
      )}

      {/* Footer controls */}
      <View style={{ paddingHorizontal: 26, paddingBottom: insets.bottom + 20, gap: 4 }}>
        {isLocked && blockingActive && (
          <PressableScale
            onPress={() => setConfirmEmergency(true)}
            disabled={loading || unlocking}
            accessibilityRole="button"
            scaleTo={1}
            style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#E0B166' }}>
              {unlocking ? 'Unlocking…' : 'Emergency unlock'}
            </Text>
          </PressableScale>
        )}
        <PressableScale
          onPress={() => setConfirmEnd(true)}
          disabled={loading}
          accessibilityRole="button"
          scaleTo={1}
          style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: 'rgba(239,243,240,0.5)' }}>End focus</Text>
        </PressableScale>
      </View>

      <ConfirmSheet
        visible={confirmEnd}
        title="End focus early?"
        body={`You have ${remaining} left of your goal. Your count so far is saved either way.`}
        confirmLabel="End focus now"
        onConfirm={onEndFocus}
        onCancel={() => setConfirmEnd(false)}
      />
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
