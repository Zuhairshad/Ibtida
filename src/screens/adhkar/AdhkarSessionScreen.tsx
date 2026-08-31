import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../state/AuthContext';
import { getTasbeehSession, incrementDhikrReps } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { ChevronLeftIcon, BookmarkIcon, MoreIcon } from '../../theme/icons';

// Matches AppState's `buzz(6)` for tapDhikr (6ms <= 10 -> selectionAsync).
function tapBuzz() {
  try {
    Haptics.selectionAsync();
  } catch {
    // haptics unavailable — silently no-op, matches the rest of the app
  }
}

export default function AdhkarSessionScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reps, setReps] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      getTasbeehSession(user.id)
        .then((s) => active && setReps(s.reps))
        .catch(() => active && setToast('Could not load your progress.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [user])
  );

  const onContinue = () => {
    if (!user) return;
    tapBuzz();
    setReps((r) => Math.min(r + 1, 100));
    incrementDhikrReps(user.id)
      .then((result) => setReps(result.reps))
      .catch(() => setToast('Could not save your progress.'));
  };

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bg }}>
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
            <BookmarkIcon size={18} color={saved ? colors.gold : colors.inkMuted} />
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
        <View style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: colors.primaryTint, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: '30%', backgroundColor: colors.primary, borderRadius: radii.pill }} />
        </View>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}>6 / 20</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18 }}>
        <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.cardLarge, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, backgroundColor: colors.card, ...shadow.card }}>
          <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', lineHeight: 60, color: colors.ink, textAlign: 'center', fontSize: 34, writingDirection: 'rtl' }}>
            سُبْحَانَ اللهِ وَبِحَمْدِهِ
          </Text>
          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 24 }} />
          <Text style={{ fontSize: 14, color: colors.inkSecondary, textAlign: 'center' }}>SubhanAllahi wa bihamdih</Text>
          <Text style={{ fontSize: 17, lineHeight: 26, color: colors.ink, textAlign: 'center', marginTop: 12 }}>Glory be to Allah, and praise belongs to Him.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 }}>
            <View style={{ backgroundColor: colors.primaryTint, paddingVertical: 7, paddingHorizontal: 11, borderRadius: radii.pill }}>
              <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.ink }}>Sahih al-Bukhari 6405</Text>
            </View>
            <View style={{ backgroundColor: colors.goldTint, paddingVertical: 7, paddingHorizontal: 11, borderRadius: radii.pill }}>
              <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.gold }}>100 ×</Text>
            </View>
          </View>
        </View>
        <View style={{ marginTop: spacing.md, borderRadius: radii.card, padding: spacing.standard, backgroundColor: colors.primaryTint }}>
          <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkMuted }}>Reference shown as recorded in the content set. Items awaiting review are labelled rather than displayed as established.</Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, paddingTop: 14 }}>
        <PressableScale
          onPress={onContinue}
          disabled={loading}
          scaleTo={0.99}
          style={{ minHeight: 56, borderRadius: radii.button, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, opacity: loading ? 0.6 : 1 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.inkOnPrimary }}>Continue</Text>
          {loading ? (
            <SkeletonBlock width={48} height={16} style={{ backgroundColor: colors.primaryTint }} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '500', color: colors.inkOnPrimary, opacity: 0.65 }}>{reps} / 100</Text>
          )}
        </PressableScale>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
