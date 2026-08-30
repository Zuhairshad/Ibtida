import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/AuthContext';
import { continueCounting } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import ProgressRing from '../../components/ProgressRing';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import Toast from '../../components/Toast';

// A genuine celebration moment — no confetti, no gaming effects. Subtle
// light, a completed ring, "Alhamdulillah." Matches the prototype exactly.
export default function GoalCompleteScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<string | null>(null);

  const onKeepCounting = async () => {
    // Navigate immediately — the tasbeeh screen reloads its own count on
    // focus, so it doesn't matter that this write hasn't landed yet.
    nav.tasbeeh();
    if (!user) return;
    try {
      await continueCounting(user.id);
    } catch {
      setToast('Could not reset your count — it will still show the completed total.');
    }
  };

  return (
    <ScreenFade
      duration={500}
      style={{
        backgroundColor: colors.goldTint,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <ProgressRing size={200} strokeWidth={6} progress={1} trackColor="rgba(23,32,28,0.06)" color="#3D73C9" animate={false}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 46, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.03 }}>100</Text>
          <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkSecondary, marginTop: 8 }}>/ 100</Text>
        </View>
      </ProgressRing>
      <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 34, textAlign: 'center' }}>Goal complete</Text>
      <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', fontSize: 24, lineHeight: 40, color: colors.inkStrong, marginTop: 16 }}>اَلْحَمْدُ لِلَّهِ</Text>
      <Text style={{ fontSize: 16, lineHeight: 26, color: colors.inkMuted, marginTop: 12, maxWidth: 280, textAlign: 'center' }}>Alhamdulillah. May Allah accept your worship.</Text>
      <View style={{ width: '100%', marginTop: 40, gap: 8 }}>
        <PrimaryButton label="Done" onPress={nav.home} />
        <SecondaryButton label="Keep counting" onPress={onKeepCounting} />
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
