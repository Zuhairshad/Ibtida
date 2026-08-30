import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import { ChevronLeftIcon, BookmarkIcon, PlayIcon } from '../../theme/icons';
import { AYAT } from '../../state/quranData';

export default function QuranReaderScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScreenFade duration={280} style={{ backgroundColor: '#FBFAF6' }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.divider, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale onPress={nav.back} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <ChevronLeftIcon color={colors.inkMuted} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Quran</Text>
        </PressableScale>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.inkStrong }}>Al-Baqarah</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 20 }}>
        {AYAT.map((a) => (
          <View key={a.n} style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 22, backgroundColor: '#FFFFFF', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ backgroundColor: colors.bgTint, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkStrong }}>2:{a.n}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}>
                <BookmarkIcon />
                <PlayIcon />
              </View>
            </View>
            <View style={{ marginTop: 18, padding: 20, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(23,32,28,0.14)', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, lineHeight: 20, color: colors.inkSecondary, textAlign: 'center' }}>Arabic text loads from the licensed Mushaf source</Text>
              <Text style={{ fontSize: 11.5, lineHeight: 17, color: colors.inkFaint, marginTop: 7, textAlign: 'center' }}>Not rendered here — scripture is never generated</Text>
            </View>
            <Text style={{ fontSize: 15.5, lineHeight: 25, color: colors.inkStrong, marginTop: 16 }}>{a.translationState}</Text>
            <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 12 }}>{a.source}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 14, paddingTop: 12, borderTopWidth: 1, borderColor: colors.divider, flexDirection: 'row', gap: 10 }}>
        {['Text size', 'Translation', 'Audio'].map((label) => (
          <PressableScale
            key={label}
            scaleTo={0.97}
            style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: 'rgba(23,32,28,0.09)', backgroundColor: '#FFFFFF', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '500', color: colors.inkMuted }}>{label}</Text>
          </PressableScale>
        ))}
      </View>
    </ScreenFade>
  );
}
