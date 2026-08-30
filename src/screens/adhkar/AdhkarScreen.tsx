import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SegmentedControl from '../../components/SegmentedControl';
import { SearchIcon } from '../../theme/icons';
import { CATEGORIES } from '../../state/adhkarData';

export default function AdhkarScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = React.useState(0);

  const onModeChange = (i: number) => {
    if (i === 1) nav.tasbeeh();
    else setMode(0);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Adhkar</Text>
          <SegmentedControl options={['Adhkar', 'Tasbeeh']} selected={mode} onChange={onModeChange} style={{ marginTop: 16 }} />
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, minHeight: 48 }}>
            <SearchIcon />
            <Text style={{ fontSize: 14.5, color: '#6E7671' }}>Search English, Arabic, Urdu or transliteration</Text>
          </View>
        </RiseIn>

        <RiseIn delay={80} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <PressableScale
            onPress={nav.adhkarSession}
            style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 28, padding: 22, backgroundColor: '#FBF8F1' }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.goldInk }}>Continue</Text>
            <Text style={{ fontSize: 22, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.02, marginTop: 10 }}>Evening Adhkar</Text>
            <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 7 }}>20 adhkar · about 8 minutes</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <View style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: 'rgba(23,32,28,0.08)', overflow: 'hidden' }}>
                <View style={{ height: '100%', width: '30%', backgroundColor: colors.success, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}>30% · 6 / 20</Text>
            </View>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={120} style={{ paddingHorizontal: 24, marginTop: 22 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Categories</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {CATEGORIES.map((c) => (
              <PressableScale
                key={c.name}
                onPress={nav.adhkarSession}
                style={{ width: '47.5%', borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 22, padding: 16, backgroundColor: '#FFFFFF', minHeight: 120, justifyContent: 'space-between', gap: 12 }}
              >
                <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', fontSize: 16, color: colors.goldInk, writingDirection: 'rtl' }}>{c.ar}</Text>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong }}>{c.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 5 }}>
                    {c.n} adhkar · {c.mins} min
                  </Text>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.bgTint, marginTop: 10, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 2, backgroundColor: colors.success, width: `${c.pct}%` }} />
                  </View>
                </View>
              </PressableScale>
            ))}
          </View>
        </RiseIn>
      </ScrollView>
    </View>
  );
}
