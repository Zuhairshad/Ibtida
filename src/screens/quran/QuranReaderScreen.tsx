import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';
import { ChevronLeftIcon, BookmarkIcon, PlayIcon, MoonIcon } from '../../theme/icons';
import { AYAT } from '../../state/quranData';

export default function QuranReaderScreen() {
  const { state, setArabicSize, toggleTranslation, toggleNight, toggleBookmark } = useAppState();
  const insets = useSafeAreaInsets();
  const [panel, setPanel] = useState<'size' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const night = state.quran.night;
  // Night reading theme per §18 — a warm dark ground, not an inverted grey.
  const bg = night ? '#141A18' : '#FBFAF6';
  const cardBg = night ? '#1D2523' : '#FFFFFF';
  const ink = night ? colors.inkOnDark : colors.inkStrong;
  const subInk = night ? 'rgba(239,243,240,0.6)' : colors.inkSecondary;
  const border = night ? 'rgba(239,243,240,0.1)' : 'rgba(23,32,28,0.05)';

  const bookmarked = state.bookmarks.includes(2);

  const onBookmark = () => {
    toggleBookmark(2);
    setToast(bookmarked ? 'Bookmark removed from Al-Baqarah.' : 'Al-Baqarah bookmarked.');
  };

  return (
    <ScreenFade duration={280} style={{ backgroundColor: bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: 12, borderBottomWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale onPress={nav.back} scaleTo={1} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <ChevronLeftIcon color={subInk} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: subInk }}>Quran</Text>
        </PressableScale>
        <Text style={{ fontSize: 14, fontWeight: '600', color: ink }}>Al-Baqarah</Text>
        <PressableScale onPress={onBookmark} accessibilityRole="button" accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark this surah'} scaleTo={0.85} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <BookmarkIcon size={18} color={bookmarked ? colors.goldInk : subInk} />
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 20 }}>
        {AYAT.map((a) => (
          <View key={a.n} style={{ borderWidth: 1, borderColor: border, borderRadius: 24, padding: 22, backgroundColor: cardBg, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ backgroundColor: night ? 'rgba(239,243,240,0.08)' : colors.bgTint, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: ink }}>2:{a.n}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <PressableScale onPress={onBookmark} accessibilityRole="button" accessibilityLabel={`Bookmark ayah ${a.n}`} scaleTo={0.85} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <BookmarkIcon size={16} color={subInk} />
                </PressableScale>
                <PressableScale
                  onPress={() => setToast('Recitation audio needs a licensed reciter source — not available yet.')}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ayah ${a.n}`}
                  scaleTo={0.85}
                  style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                >
                  <PlayIcon size={16} color={subInk} />
                </PressableScale>
              </View>
            </View>
            <View style={{ marginTop: 18, padding: 20, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: night ? 'rgba(239,243,240,0.18)' : 'rgba(23,32,28,0.14)', alignItems: 'center' }}>
              {/* Arabic size control drives this block's type scale. */}
              <Text style={{ fontSize: Math.round(state.quran.arabicSize * 0.38), lineHeight: state.quran.arabicSize * 0.6, color: subInk, textAlign: 'center' }}>
                Arabic text loads from the licensed Mushaf source
              </Text>
              <Text style={{ fontSize: 11.5, lineHeight: 17, color: subInk, marginTop: 7, textAlign: 'center', opacity: 0.8 }}>Not rendered here — scripture is never generated</Text>
            </View>
            {state.quran.showTranslation && (
              <>
                <Text style={{ fontSize: 15.5, lineHeight: 25, color: ink, marginTop: 16 }}>{a.translationState}</Text>
                <Text style={{ fontSize: 11.5, color: subInk, marginTop: 12 }}>{a.source}</Text>
              </>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Text-size panel, opened by the Text size control below. */}
      {panel === 'size' && (
        <View style={{ paddingHorizontal: 22, paddingVertical: 16, backgroundColor: cardBg, borderTopWidth: 1, borderColor: border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: ink }}>Arabic text size</Text>
            <Text style={{ fontSize: 13, color: subInk }}>{state.quran.arabicSize}px</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <PressableScale
              onPress={() => setArabicSize(state.quran.arabicSize - 2)}
              accessibilityRole="button"
              accessibilityLabel="Decrease Arabic text size"
              scaleTo={0.94}
              style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 18, color: ink }}>A−</Text>
            </PressableScale>
            <PressableScale
              onPress={() => setArabicSize(state.quran.arabicSize + 2)}
              accessibilityRole="button"
              accessibilityLabel="Increase Arabic text size"
              scaleTo={0.94}
              style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 22, color: ink }}>A+</Text>
            </PressableScale>
          </View>
        </View>
      )}

      <View style={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 14, paddingTop: 12, borderTopWidth: 1, borderColor: border, flexDirection: 'row', gap: 10, backgroundColor: bg }}>
        <PressableScale
          onPress={() => setPanel((p) => (p === 'size' ? null : 'size'))}
          accessibilityRole="button"
          accessibilityState={{ expanded: panel === 'size' }}
          accessibilityLabel="Text size"
          scaleTo={0.97}
          style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: panel === 'size' ? colors.primary : border, backgroundColor: cardBg, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '500', color: panel === 'size' ? colors.primary : subInk }}>Text size</Text>
        </PressableScale>

        <PressableScale
          onPress={toggleTranslation}
          accessibilityRole="switch"
          accessibilityState={{ checked: state.quran.showTranslation }}
          accessibilityLabel="Show translation"
          scaleTo={0.97}
          style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: state.quran.showTranslation ? colors.primary : border, backgroundColor: cardBg, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '500', color: state.quran.showTranslation ? colors.primary : subInk }}>Translation</Text>
        </PressableScale>

        <PressableScale
          onPress={toggleNight}
          accessibilityRole="switch"
          accessibilityState={{ checked: night }}
          accessibilityLabel="Night reading theme"
          scaleTo={0.97}
          style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: night ? colors.primary : border, backgroundColor: cardBg, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
        >
          <MoonIcon size={15} color={night ? colors.primary : subInk} />
          <Text style={{ fontSize: 13.5, fontWeight: '500', color: night ? colors.primary : subInk }}>Night</Text>
        </PressableScale>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
