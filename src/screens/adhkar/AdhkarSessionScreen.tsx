import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';
import { ChevronLeftIcon, BookmarkIcon, MoreIcon } from '../../theme/icons';

export default function AdhkarSessionScreen() {
  const { state, tapDhikr } = useAppState();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bgTint }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale onPress={nav.adhkar} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <ChevronLeftIcon color={colors.inkMuted} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Evening</Text>
        </PressableScale>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <PressableScale
            onPress={() => {
              setSaved((v) => !v);
              setToast(saved ? 'Removed from your saved adhkar.' : 'Saved to your adhkar.');
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            accessibilityLabel={saved ? 'Remove from saved adhkar' : 'Save this dhikr'}
            scaleTo={0.85}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <BookmarkIcon size={18} color={saved ? colors.goldInk : colors.inkMuted} />
          </PressableScale>
          <PressableScale
            onPress={nav.goalNew}
            accessibilityRole="button"
            accessibilityLabel="Make this a daily goal"
            scaleTo={0.85}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <MoreIcon size={18} color={colors.inkMuted} />
          </PressableScale>
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: 'rgba(23,32,28,0.08)', overflow: 'hidden' }}>
          <View style={{ height: '100%', width: '30%', backgroundColor: colors.success, borderRadius: 3 }} />
        </View>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}>6 / 20</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18 }}>
        <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 28, paddingVertical: 28, paddingHorizontal: 22, backgroundColor: '#FFFFFF' }}>
          <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', lineHeight: 60, color: colors.inkStrong, textAlign: 'center', fontSize: 34, writingDirection: 'rtl' }}>
            سُبْحَانَ اللهِ وَبِحَمْدِهِ
          </Text>
          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 24 }} />
          <Text style={{ fontSize: 14, color: colors.inkSecondary, textAlign: 'center' }}>SubhanAllahi wa bihamdih</Text>
          <Text style={{ fontSize: 17, lineHeight: 26, color: colors.inkStrong, textAlign: 'center', marginTop: 12 }}>Glory be to Allah, and praise belongs to Him.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 }}>
            <View style={{ backgroundColor: colors.bgTint, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 10 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.inkStrong }}>Sahih al-Bukhari 6405</Text>
            </View>
            <View style={{ backgroundColor: colors.goldTint, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 10 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.goldInk }}>100 ×</Text>
            </View>
          </View>
        </View>
        <View style={{ marginTop: 12, borderRadius: 22, padding: 16, backgroundColor: colors.bgTint }}>
          <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkMuted }}>Reference shown as recorded in the content set. Items awaiting review are labelled rather than displayed as established.</Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, paddingTop: 14 }}>
        <PressableScale
          onPress={tapDhikr}
          scaleTo={0.99}
          style={{ minHeight: 56, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Continue</Text>
          <Text style={{ fontSize: 16, fontWeight: '500', color: 'rgba(248,247,243,0.55)' }}>{state.dhikrReps} / 100</Text>
        </PressableScale>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
