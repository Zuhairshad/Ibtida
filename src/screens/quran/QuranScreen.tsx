import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SegmentedControl from '../../components/SegmentedControl';
import EmptyState from '../../components/EmptyState';
import { BookmarkIcon, SearchIcon, ChevronRightIcon } from '../../theme/icons';
import { SURAHS, JUZ, HISTORY } from '../../state/quranData';

const TABS = ['Surahs', 'Juz', 'Bookmarks', 'History', 'Search'];

export default function QuranScreen() {
  const { state, setQuranTab, toggleBookmark } = useAppState();
  const insets = useSafeAreaInsets();

  const onTabChange = (i: number) => {
    // Search is a full screen of its own rather than an inline tab pane.
    if (i === 4) nav.search();
    else setQuranTab(i);
  };

  const surahRow = (s: (typeof SURAHS)[number]) => {
    const marked = state.bookmarks.includes(s.n);
    return (
      <PressableScale
        key={s.n}
        onPress={nav.quranReader}
        accessibilityRole="button"
        accessibilityLabel={`Surah ${s.name}, ${s.meta}`}
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
        <PressableScale
          onPress={() => toggleBookmark(s.n)}
          scaleTo={0.85}
          accessibilityRole="button"
          accessibilityState={{ selected: marked }}
          accessibilityLabel={marked ? `Remove bookmark from ${s.name}` : `Bookmark ${s.name}`}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <BookmarkIcon size={18} color={marked ? colors.goldInk : '#C9CEC8'} />
        </PressableScale>
        <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', fontSize: 17, lineHeight: 26, color: colors.goldInk }}>{s.ar}</Text>
      </PressableScale>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Quran</Text>
          <PressableScale onPress={nav.search} accessibilityRole="button" accessibilityLabel="Search the Quran" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <SearchIcon size={19} color={colors.inkMuted} />
          </PressableScale>
        </RiseIn>

        <RiseIn delay={70} style={{ paddingHorizontal: 24, marginTop: 12 }}>
          <PressableScale
            onPress={nav.quranReader}
            accessibilityRole="button"
            accessibilityLabel="Continue reading Surah Al-Baqarah, ayah 183, 72 percent complete"
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
          <SegmentedControl options={TABS} selected={state.quranTab} onChange={onTabChange} />
        </RiseIn>

        <RiseIn delay={150} style={{ paddingHorizontal: 24, marginTop: 14, gap: 8 }}>
          {state.quranTab === 0 && SURAHS.map(surahRow)}

          {state.quranTab === 1 &&
            JUZ.map((j) => (
              <PressableScale
                key={j.n}
                onPress={nav.quranReader}
                accessibilityRole="button"
                accessibilityLabel={`${j.name}, ${j.pct} percent read`}
                style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 20, paddingVertical: 15, paddingHorizontal: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48 }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkStrong }}>{j.n}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600', color: colors.inkStrong }}>{j.name}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 5 }} numberOfLines={1}>
                    {j.meta}
                  </Text>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.bgTint, marginTop: 9, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 2, backgroundColor: colors.success, width: `${j.pct}%` }} />
                  </View>
                </View>
                <ChevronRightIcon />
              </PressableScale>
            ))}

          {state.quranTab === 2 &&
            (state.bookmarks.length === 0 ? (
              <EmptyState
                icon={<BookmarkIcon size={22} color={colors.inkMuted} />}
                title="No bookmarks yet"
                subtitle="Tap the bookmark on any surah to keep your place."
                actionLabel="Browse surahs"
                onAction={() => setQuranTab(0)}
              />
            ) : (
              SURAHS.filter((s) => state.bookmarks.includes(s.n)).map(surahRow)
            ))}

          {state.quranTab === 3 &&
            HISTORY.map((h) => (
              <PressableScale
                key={h.name + h.when}
                onPress={nav.quranReader}
                accessibilityRole="button"
                accessibilityLabel={`${h.name}, ${h.meta}, ${h.when}`}
                style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 20, paddingVertical: 15, paddingHorizontal: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48 }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600', color: colors.inkStrong }}>{h.name}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 5 }}>{h.meta}</Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.inkSecondary }}>{h.when}</Text>
                <ChevronRightIcon />
              </PressableScale>
            ))}
        </RiseIn>
      </ScrollView>
    </View>
  );
}
