import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { search, quickSearch, type SearchResult, type ContentType } from '../../lib/kalimatApi';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import EmptyState from '../../components/EmptyState';
import SegmentedControl from '../../components/SegmentedControl';
import { SearchIcon, ChevronRightIcon, BookIcon, BeadsIcon, AdhkarIcon } from '../../theme/icons';

const CONTENT_TYPES: { label: string; value: ContentType }[] = [
  { label: 'Quran', value: 'quran' },
  { label: 'Hadith', value: 'sunnah' },
  { label: 'Azkar', value: 'azkar' },
];

const SUGGESTIONS = ['Patience', 'Surah Al-Kahf', 'Istighfar', 'Kindness', 'Tawakkul', 'Morning Adhkar'];

function typeLabel(type: SearchResult['type']): string {
  switch (type) {
    case 'quran_verse': return 'Verse';
    case 'quran_chapter': return 'Surah';
    case 'quran_range': return 'Verses';
    case 'quran_page': return 'Page';
    case 'quran_juz': return 'Juz';
    case 'hadith': return 'Hadith';
    case 'zikr': return 'Dhikr';
    default: return 'Result';
  }
}

function resultIcon(type: SearchResult['type']) {
  if (type === 'hadith') return <BeadsIcon size={19} color="#3B7A52" />;
  if (type === 'zikr') return <AdhkarIcon size={19} color={colors.goldInk} />;
  return <BookIcon size={19} color="#2F5CA3" />;
}

function resultTint(type: SearchResult['type']) {
  if (type === 'hadith') return colors.successTint;
  if (type === 'zikr') return colors.goldTint;
  return colors.primaryTint;
}

function resultTitle(r: SearchResult): string {
  if (r.type === 'quran_chapter') return r.translatedText ?? r.id;
  if (r.type === 'hadith') return r.chapterEnglish ?? 'Hadith';
  if (r.type === 'zikr') return r.englishTitle ?? r.title ?? 'Dhikr';
  return r.id;
}

function resultSubtitle(r: SearchResult): string {
  if (r.type === 'hadith') {
    const parts: string[] = [];
    if (r.sourceBook) parts.push(r.sourceBook.charAt(0).toUpperCase() + r.sourceBook.slice(1));
    if (r.hadithNumber) parts.push(`#${r.hadithNumber}`);
    if (r.gradeEn) parts.push(r.gradeEn);
    return parts.join(' · ');
  }
  const text = r.translatedText ?? r.text ?? '';
  return text.length > 80 ? text.slice(0, 80) + '…' : text;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const contentType = CONTENT_TYPES[tabIndex].value;

  const runSearch = useCallback(
    async (q: string, ct: ContentType) => {
      if (!q.trim()) { setResults([]); setError(null); return; }
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);
      try {
        const res = await search(q, {
          contentType: ct,
          numResults: 15,
          getText: true,
          getMetadata: ct === 'sunnah',
        });
        setResults(res);
      } catch (e: unknown) {
        if ((e as Error)?.name !== 'AbortError') {
          setError('Search failed. Check your connection.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query, contentType), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, contentType, runSearch]);

  const onTabChange = (i: number) => {
    setTabIndex(i);
    setResults([]);
  };

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      {/* Search bar */}
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, minHeight: 48 }}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Search Quran, Hadith, adhkar…"
            placeholderTextColor="#8A928C"
            accessibilityLabel="Search"
            returnKeyType="search"
            style={{ flex: 1, fontSize: 14.5, color: colors.inkStrong, padding: 0 }}
          />
          {loading && <ActivityIndicator size="small" color={colors.inkMuted} />}
        </View>
        <PressableScale onPress={nav.back} scaleTo={1} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>Cancel</Text>
        </PressableScale>
      </View>

      {/* Content type tabs */}
      <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
        <SegmentedControl
          options={CONTENT_TYPES.map((t) => t.label)}
          selected={tabIndex}
          onChange={onTabChange}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Empty state — no query yet */}
        {!query.trim() && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Try searching</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <PressableScale key={s} onPress={() => setQuery(s)} scaleTo={0.94} accessibilityRole="button" style={{ backgroundColor: colors.bgTint, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.inkStrong }}>{s}</Text>
                </PressableScale>
              ))}
            </View>
            <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkSecondary, marginTop: 20 }}>
              AI-powered semantic search — "patience" finds verses about صبر even if the word doesn't appear literally.
            </Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={{ marginTop: 20 }}>
            <EmptyState icon={<SearchIcon size={22} color={colors.inkMuted} />} title="Search unavailable" subtitle={error} />
          </View>
        )}

        {/* No results */}
        {!loading && !error && query.trim() && results.length === 0 && (
          <View style={{ marginTop: 20 }}>
            <EmptyState
              icon={<SearchIcon size={22} color={colors.inkMuted} />}
              title="Nothing found"
              subtitle={`No ${CONTENT_TYPES[tabIndex].label.toLowerCase()} results for "${query}".`}
              actionLabel="Clear search"
              onAction={() => setQuery('')}
            />
          </View>
        )}

        {/* Results */}
        {results.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginBottom: 4 }}>
              {results.length} result{results.length === 1 ? '' : 's'}
            </Text>
            {results.map((r, i) => (
              <PressableScale
                key={`${r.id}-${i}`}
                onPress={nav.quranReader}
                scaleTo={0.985}
                accessibilityRole="button"
                accessibilityLabel={resultTitle(r)}
                style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, padding: 16, backgroundColor: '#FFFFFF', gap: 10, minHeight: 48 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: resultTint(r.type), alignItems: 'center', justifyContent: 'center' }}>
                    {resultIcon(r.type)}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong, flex: 1 }} numberOfLines={1}>
                        {resultTitle(r)}
                      </Text>
                      <View style={{ backgroundColor: colors.bgTint, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkSecondary }}>{typeLabel(r.type)}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 3 }} numberOfLines={1}>
                      {resultSubtitle(r)}
                    </Text>
                  </View>
                  <ChevronRightIcon />
                </View>

                {/* Arabic text */}
                {r.text && (
                  <Text
                    style={{ fontSize: 18, lineHeight: 32, color: colors.inkStrong, textAlign: 'right', fontFamily: 'NotoNaskhArabic_400Regular' }}
                    numberOfLines={3}
                  >
                    {r.text}
                  </Text>
                )}

                {/* Translation */}
                {r.translatedText && r.type !== 'quran_chapter' && (
                  <Text style={{ fontSize: 13, lineHeight: 20, color: colors.inkSecondary }} numberOfLines={4}>
                    {r.type === 'hadith' && r.matnEn ? r.matnEn : r.translatedText}
                  </Text>
                )}
              </PressableScale>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenFade>
  );
}
