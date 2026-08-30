import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
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

      <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: 'rgba(217,164,74,0.4)' }}>
        <WarningIcon />
        <Text style={{ fontSize: 13.5, fontWeight: '500', color: colors.goldInkDeep, lineHeight: 19, flex: 1 }}>Offline · your counts are still being saved</Text>
      </View>

      <View style={{ marginTop: 12, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', padding: 24, alignItems: 'center' }}>
        <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.bgTint, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <OfflineIcon />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.inkStrong }}>Something went wrong</Text>
        <Text style={{ fontSize: 14.5, lineHeight: 23, color: colors.inkMuted, marginTop: 10, textAlign: 'center' }}>Your progress is safe. We'll try again when you're connected.</Text>
        <PrimaryButton label="Try again" onPress={nav.home} style={{ marginTop: 18, paddingHorizontal: 26, minHeight: 48, alignSelf: 'center', width: undefined }} />
      </View>

      <View style={{ marginTop: 12, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', padding: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Skeleton loading</Text>
        <View style={{ marginTop: 16 }}>
          <RowSkeleton rows={3} />
        </View>
        <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkSecondary, marginTop: 16 }}>Local data paints first; remote totals fill in behind it.</Text>
      </View>
    </ScreenFade>
  );
}
