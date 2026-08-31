import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import EmptyState from '../../components/EmptyState';
import { SearchIcon, ChevronRightIcon, BookIcon, BeadsIcon, AdhkarIcon } from '../../theme/icons';
import { CATEGORIES, GOALS } from '../../state/adhkarData';
import { SURAHS } from '../../state/quranData';

type Result = { kind: 'Adhkar' | 'Quran' | 'Goal'; title: string; sub: string; go: () => void };

// §20 Global search — searches Adhkar categories, Quran surahs and personal
// goals. Matching is transliteration-and-Arabic aware: each item carries its
// Arabic string, and queries are normalised so "istighfar" finds
// "الاستغفار" via the transliteration index below.
const TRANSLIT: Record<string, string[]> = {
  Morning: ['sabah', 'subh'],
  Evening: ['masa', 'masaa'],
  'After Salah': ['salah', 'salat', 'namaz'],
  Protection: ['hifz', 'hifdh'],
  Forgiveness: ['istighfar', 'astaghfirullah'],
  Gratitude: ['shukr', 'shukur'],
  'Before Sleep': ['nawm', 'sleep'],
  Travel: ['safar'],
  'Al-Fatihah': ['fatiha', 'fatihah'],
  'Al-Baqarah': ['baqara', 'baqarah'],
  'Ali ‘Imran': ['imran', 'aal-e-imran'],
  'An-Nisa': ['nisa', 'nisaa'],
  'Al-Kahf': ['kahf'],
  'Ya-Sin': ['yasin', 'yaseen'],
  'Durood Sharif': ['durood', 'salawat', 'darood'],
  'Morning Adhkar': ['sabah', 'morning'],
};

function normalise(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip Latin diacritics
    .replace(/[ً-ْ]/g, '') // strip Arabic harakat
    .replace(/[‘’'-]/g, '');
}

function matches(query: string, ...fields: (string | undefined)[]) {
  const q = normalise(query);
  if (!q) return false;
  return fields.some((f) => f && normalise(f).includes(q));
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const results = useMemo<Result[]>(() => {
    if (!query.trim()) return [];
    const out: Result[] = [];

    CATEGORIES.forEach((c) => {
      if (matches(query, c.name, c.ar, ...(TRANSLIT[c.name] ?? []))) {
        out.push({ kind: 'Adhkar', title: c.name, sub: `${c.n} adhkar · ${c.mins} min`, go: nav.adhkarSession });
      }
    });
    SURAHS.forEach((s) => {
      if (matches(query, s.name, s.ar, String(s.n), ...(TRANSLIT[s.name] ?? []))) {
        out.push({ kind: 'Quran', title: s.name, sub: s.meta, go: nav.quranReader });
      }
    });
    GOALS.forEach((g) => {
      if (matches(query, g.name, ...(TRANSLIT[g.name] ?? []))) {
        out.push({ kind: 'Goal', title: g.name, sub: `${g.freq} · ${g.progress}`, go: nav.goals });
      }
    });
    return out;
  }, [query]);

  const iconFor = (kind: Result['kind']) =>
    kind === 'Quran' ? <BookIcon size={19} color={colors.primaryStrong} /> : kind === 'Goal' ? <BeadsIcon size={19} color={colors.successStrong} /> : <AdhkarIcon size={19} color={colors.gold} />;
  const tintFor = (kind: Result['kind']) => (kind === 'Quran' ? colors.primaryTint : kind === 'Goal' ? colors.successTint : colors.goldTint);

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.standard, borderRadius: radii.button, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, minHeight: 48 }}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Search Quran, adhkar, duas and goals"
            placeholderTextColor={colors.inkMuted}
            accessibilityLabel="Search"
            returnKeyType="search"
            style={{ flex: 1, fontSize: 14.5, color: colors.ink, padding: 0 }}
          />
        </View>
        <PressableScale onPress={nav.back} scaleTo={1} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>Cancel</Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {!query.trim() ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Try searching</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['Istighfar', 'Al-Kahf', 'Durood', 'Evening', 'Travel'].map((s) => (
                <PressableScale key={s} onPress={() => setQuery(s)} scaleTo={0.94} accessibilityRole="button" style={{ backgroundColor: colors.primaryTint, paddingVertical: 10, paddingHorizontal: 14, borderRadius: radii.pill }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.ink }}>{s}</Text>
                </PressableScale>
              ))}
            </View>
            <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkSecondary, marginTop: 20 }}>
              Search works in English, Arabic and transliteration — “istighfar” finds الاستغفار.
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={{ marginTop: 20 }}>
            <EmptyState icon={<SearchIcon size={22} color={colors.inkMuted} />} title="Nothing matched" subtitle={`No adhkar, surah or goal matches “${query}”.`} actionLabel="Clear search" onAction={() => setQuery('')} />
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginBottom: 4 }}>
              {results.length} result{results.length === 1 ? '' : 's'}
            </Text>
            {results.map((r, i) => (
              <PressableScale
                key={`${r.kind}-${r.title}-${i}`}
                onPress={r.go}
                scaleTo={0.985}
                accessibilityRole="button"
                accessibilityLabel={`${r.title}, ${r.kind}`}
                style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, paddingVertical: spacing.standard, paddingHorizontal: spacing.standard, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, ...shadow.card }}
              >
                <View style={{ width: 38, height: 38, borderRadius: radii.control, backgroundColor: tintFor(r.kind), alignItems: 'center', justifyContent: 'center' }}>{iconFor(r.kind)}</View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600', color: colors.ink }} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 4 }} numberOfLines={1}>
                    {r.kind} · {r.sub}
                  </Text>
                </View>
                <ChevronRightIcon />
              </PressableScale>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenFade>
  );
}
