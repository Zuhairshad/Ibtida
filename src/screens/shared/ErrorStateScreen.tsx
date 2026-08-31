import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing, type } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import PrimaryButton from '../../components/PrimaryButton';
import { WarningIcon, OfflineIcon } from '../../theme/icons';
import { RowSkeleton } from '../../components/Skeleton';

// Shared error/offline/loading component — adapts per context rather than
// being one static graphic. Never implies worship history has disappeared.
export default function ErrorStateScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScreenFade duration={300} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: insets.bottom + 34 }}>
      <PressableScale onPress={nav.profile} scaleTo={1} style={{ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Back</Text>
      </PressableScale>

      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radii.button, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.gold }}>
        <WarningIcon />
        <Text style={{ fontSize: 13.5, fontWeight: '500', color: colors.gold, lineHeight: 19, flex: 1 }}>Offline · your counts are still being saved</Text>
      </View>

      <View style={{ marginTop: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, backgroundColor: colors.card, padding: spacing.xl, alignItems: 'center', ...shadow.card }}>
        <View style={{ width: 54, height: 54, borderRadius: radii.button, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.standard }}>
          <OfflineIcon />
        </View>
        <Text style={{ ...type.h2, color: colors.ink }}>Something went wrong</Text>
        <Text style={{ fontSize: 14.5, lineHeight: 23, color: colors.inkMuted, marginTop: 10, textAlign: 'center' }}>Your progress is safe. We’ll try again when you’re connected.</Text>
        <PrimaryButton label="Try again" onPress={nav.home} style={{ marginTop: 18, paddingHorizontal: 26, minHeight: 48, alignSelf: 'center', width: undefined }} />
      </View>

      <View style={{ marginTop: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, backgroundColor: colors.card, padding: spacing.lg, ...shadow.card }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Skeleton loading</Text>
        <View style={{ marginTop: 16 }}>
          <RowSkeleton rows={3} />
        </View>
        <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkSecondary, marginTop: 16 }}>Local data paints first; remote totals fill in behind it.</Text>
      </View>
    </ScreenFade>
  );
}
