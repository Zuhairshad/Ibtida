import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import ConfirmSheet from '../../components/ConfirmSheet';

// Dark, minimal, hard-to-accidentally-exit focus state — the "Ibadah Lock"
// distraction-blocking feature. Calls/messages explicitly remain available.
export default function FocusActiveScreen() {
  const { state, focusTarget, tapFocus } = useAppState();
  const insets = useSafeAreaInsets();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const remaining = Math.max(focusTarget - state.focusCount, 0);

  // Reaching the goal ends the session in the celebration moment rather than
  // silently capping the counter.
  const onTap = () => {
    tapFocus();
    if (state.focusCount + 1 >= focusTarget) nav.goalComplete();
  };

  return (
    <ScreenFade duration={400} style={{ backgroundColor: '#1B2621' }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: 'rgba(239,243,240,0.45)' }}>Ibadah Focus</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: 'rgba(239,243,240,0.45)' }}>4 apps restricted</Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <ProgressRing size={236} strokeWidth={4} progress={state.focusCount / focusTarget} trackColor="rgba(239,243,240,0.1)" color="#3D73C9">
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 62, fontWeight: '600', color: '#EFF3F0', letterSpacing: -0.035 }}>{state.focusCount}</Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: 'rgba(239,243,240,0.5)', marginTop: 8 }}>/ {focusTarget}</Text>
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

      <View style={{ paddingHorizontal: 26, paddingBottom: insets.bottom + 20 }}>
        <PressableScale onPress={() => setConfirmEnd(true)} accessibilityRole="button" scaleTo={1} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: 'rgba(239,243,240,0.5)' }}>End focus</Text>
        </PressableScale>
      </View>

      {/* Early-exit friction: leaving before the goal is a deliberate choice. */}
      <ConfirmSheet
        visible={confirmEnd}
        title="End focus early?"
        body={`You have ${remaining} left of your goal. Your count so far is saved either way.`}
        confirmLabel="End focus now"
        onConfirm={() => {
          setConfirmEnd(false);
          nav.home();
        }}
        onCancel={() => setConfirmEnd(false)}
      />
    </ScreenFade>
  );
}
