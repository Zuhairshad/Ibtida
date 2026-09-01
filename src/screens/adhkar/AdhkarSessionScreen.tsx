import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { nav } from '../../navigation/navigate';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';
import { ChevronLeftIcon } from '../../theme/icons';
import { ADHKAR_CONTENT } from '../../state/adhkarContent';

function tapBuzz() {
  try { Haptics.selectionAsync(); } catch { /* no-op */ }
}

export default function AdhkarSessionScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'AdhkarSession'>>();
  const { category } = route.params;

  const dhikrList = ADHKAR_CONTENT[category] ?? [];
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const current = dhikrList[index];
  const isLast = index === dhikrList.length - 1;
  const progress = dhikrList.length > 0 ? (index + 1) / dhikrList.length : 0;

  const categoryLabel = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const onContinue = () => {
    tapBuzz();
    if (isLast) {
      setToast('Session complete!');
      setTimeout(() => nav.adhkar(), 1200);
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (!current) {
    return (
      <ScreenFade duration={280} style={{ flex: 1, backgroundColor: colors.bgTint, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 15, color: colors.inkMuted }}>No content for this category yet.</Text>
        <PressableScale onPress={nav.adhkar} scaleTo={0.97} style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 14, color: colors.primary }}>Go back</Text>
        </PressableScale>
      </ScreenFade>
    );
  }

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bgTint }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale onPress={nav.adhkar} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <ChevronLeftIcon color={colors.inkMuted} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>{categoryLabel}</Text>
        </PressableScale>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}>
          {index + 1} / {dhikrList.length}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: 'rgba(23,32,28,0.08)', overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: colors.success, borderRadius: 3 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18 }}>
        <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 28, paddingVertical: 28, paddingHorizontal: 22, backgroundColor: '#FFFFFF' }}>
          {current.title ? (
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.inkMuted, textAlign: 'center', marginBottom: 16 }}>
              {current.title}
            </Text>
          ) : null}
          <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', lineHeight: 60, color: colors.inkStrong, textAlign: 'center', fontSize: 34, writingDirection: 'rtl' }}>
            {current.arabic}
          </Text>
          <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 24 }} />
          <Text style={{ fontSize: 14, color: colors.inkSecondary, textAlign: 'center' }}>
            {current.transliteration}
          </Text>
          <Text style={{ fontSize: 17, lineHeight: 26, color: colors.inkStrong, textAlign: 'center', marginTop: 12 }}>
            {current.translation}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
            {current.reference ? (
              <View style={{ backgroundColor: colors.bgTint, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 10 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.inkStrong }}>{current.reference}</Text>
              </View>
            ) : null}
            <View style={{ backgroundColor: colors.goldTint, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 10 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.goldInk }}>{current.count} ×</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, paddingTop: 14 }}>
        <PressableScale
          onPress={onContinue}
          scaleTo={0.99}
          style={{ minHeight: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
            {isLast ? 'Complete' : 'Continue'}
          </Text>
        </PressableScale>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
