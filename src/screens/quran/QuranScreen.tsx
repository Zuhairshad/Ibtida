import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SegmentedControl from '../../components/SegmentedControl';
import { SURAHS } from '../../state/quranData';

const TABS = ['Surahs', 'Juz', 'Bookmarks', 'History', 'Search'];

export default function QuranScreen() {
  const { state, setQuranTab } = useAppState();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Quran</Text>
        </RiseIn>

        <RiseIn delay={70} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <PressableScale
            onPress={nav.quranReader}
            style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 30, padding: 24, backgroundColor: '#16323E', overflow: 'hidden' }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: 'rgba(239,243,240,0.55)' }}>Continue reading</Text>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#EFF3F0', letterSpacing: -0.025, marginTop: 12 }}>Surah Al-Baqarah</Text>
            <Text style={{ fontSize: 14.5, color: 'rgba(239,243,240,0.7)', marginTop: 8 }}>Ayah 183</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 20 }}>
              <View style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: 'rgba(239,243,240,0.16)', overflow: 'hidden' }}>
                <View style={{ height: '100%', width: '72%', backgroundColor: '#3D73C9', borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: 'rgba(239,243,240,0.8)' }}>72%</Text>
            </View>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={110} style={{ paddingHorizontal: 24, marginTop: 12 }}>
          <SegmentedControl options={TABS} selected={state.quranTab} onChange={setQuranTab} />
        </RiseIn>

        <RiseIn delay={150} style={{ paddingHorizontal: 24, marginTop: 14, gap: 8 }}>
          {SURAHS.map((s) => (
            <PressableScale
              key={s.n}
              onPress={nav.quranReader}
              style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 20, paddingVertical: 15, paddingHorizontal: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48 }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgTint, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkStrong }}>{s.n}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15.5, fontWeight: '600', color: colors.inkStrong }} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 5 }}>{s.meta}</Text>
              </View>
              <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', fontSize: 17, lineHeight: 26, color: colors.goldInk, writingDirection: 'rtl' }}>{s.ar}</Text>
            </PressableScale>
          ))}
        </RiseIn>
      </ScrollView>
    </View>
  );
}
