import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../state/AuthContext';
import { getTasbeehSession, setTasbeehCount } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { ChevronLeftIcon, ChevronDownIcon, CheckIcon } from '../../theme/icons';

// Matches AppState's `buzz(6)` for tap/+5 (6ms <= 10 -> selectionAsync); undo
// and reset never buzzed there, so those stay silent here too.
function tapBuzz() {
  try {
    Haptics.selectionAsync();
  } catch {
    // haptics unavailable — silently no-op, matches the rest of the app
  }
}

export default function TasbeehScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(100);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      getTasbeehSession(user.id)
        .then((s) => {
          if (!active) return;
          setCount(s.count);
          setTarget(s.target);
        })
        .catch(() => active && setToast('Could not load your tasbeeh count.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [user])
  );

  // The dial's count is authored client-side (matches AppState's original
  // instant-tap feel — no network round trip before the ring moves) and
  // persisted as a plain absolute write. That's a deliberate, documented
  // deviation from the contract's read-modify-write tapTasbeeh/plusFive/
  // undo/reset signatures (still exported from services/adhkar.ts for other
  // callers): syncing an absolute value here avoids the lost-update races a
  // rapid-tap UI would hit if every tap round-tripped through a fresh read.
  const persist = (next: number) => {
    if (!user) return;
    setTasbeehCount(user.id, next).catch(() => setToast('Could not save your count.'));
  };

  const frac = target > 0 ? Math.min(count / target, 1) : 0;

  const onTap = () => {
    tapBuzz();
    const next = count + 1;
    setCount(next);
    persist(next);
    if (next >= target) nav.goalComplete();
  };

  const onPlusFive = () => {
    tapBuzz();
    const next = Math.min(count + 5, target);
    const wasBelow = count < target;
    setCount(next);
    persist(next);
    if (next >= target && wasBelow) nav.goalComplete();
  };

  const onUndo = () => {
    const next = Math.max(count - 1, 0);
    setCount(next);
    persist(next);
  };

  const onReset = () => {
    setCount(0);
    persist(0);
  };

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale onPress={nav.adhkar} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <ChevronLeftIcon color={colors.inkMuted} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Adhkar</Text>
        </PressableScale>
        <PressableScale
          onPress={nav.goalNew}
          scaleTo={1}
          style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.1)', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 13, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.inkStrong }}>SubhanAllah</Text>
          <ChevronDownIcon color={colors.inkMuted} />
        </PressableScale>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <SkeletonBlock width={272} height={272} radius={136} />
        </View>
      ) : (
        <PressableScale onPress={onTap} scaleTo={0.994} accessibilityRole="button" accessibilityLabel="Count one dhikr" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <ProgressRing size={272} strokeWidth={6} progress={frac} trackColor="rgba(23,32,28,0.06)" color="#3D73C9">
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', fontSize: 20, color: colors.goldInk, marginBottom: 16 }}>سُبْحَانَ اللهِ</Text>
              <Text style={{ fontSize: 76, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.04 }}>{count}</Text>
              <Text style={{ fontSize: 17, fontWeight: '500', color: colors.inkSecondary, marginTop: 6 }}>/ {target}</Text>
              <Text style={{ fontSize: 14, color: colors.inkMuted, marginTop: 14 }}>SubhanAllah</Text>
            </View>
          </ProgressRing>
          <Text style={{ fontSize: 13, color: colors.inkFaint, marginTop: 26 }}>Tap anywhere to count</Text>
        </PressableScale>
      )}

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Undo', onPress: onUndo },
            { label: '+5', onPress: onPlusFive },
            { label: 'Reset', onPress: onReset },
          ].map((b) => (
            <PressableScale
              key={b.label}
              onPress={b.onPress}
              disabled={loading}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={b.label === '+5' ? 'Add five' : b.label}
              style={{ flex: 1, minHeight: 52, borderWidth: 1, borderColor: 'rgba(23,32,28,0.09)', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, alignItems: 'center', opacity: loading ? 0.5 : 1 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>{b.label}</Text>
            </PressableScale>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14 }}>
          <CheckIcon size={12} color={colors.inkFaint} />
          <Text style={{ fontSize: 12, color: colors.inkFaint }}>Synced to your account · haptics on</Text>
        </View>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
