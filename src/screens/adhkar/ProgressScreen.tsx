import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import SegmentedControl from '../../components/SegmentedControl';

const RANGES = ['Today', 'Week', 'Month', 'Year'];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_ABBR = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const BAR_HEIGHT = 96;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function buildBars(range: number, byDay: Map<string, number>): { values: number[]; labels: string[] } {
  if (range === 0) {
    const today = new Date();
    const ds = isoDate(today);
    return {
      values: [Math.round(((byDay.get(ds) ?? 0) / 5) * 100)],
      labels: [DAY_LETTERS[today.getDay()]],
    };
  }
  if (range === 1) {
    const values: number[] = [];
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = daysAgo(i);
      const ds = isoDate(d);
      values.push(Math.round(((byDay.get(ds) ?? 0) / 5) * 100));
      labels.push(DAY_LETTERS[d.getDay()]);
    }
    return { values, labels };
  }
  if (range === 2) {
    const values: number[] = [];
    const labels: string[] = [];
    for (let w = 3; w >= 0; w--) {
      let total = 0;
      for (let day = 0; day < 7; day++) {
        total += byDay.get(isoDate(daysAgo(w * 7 + day))) ?? 0;
      }
      values.push(Math.round((total / 35) * 100));
      labels.push(`W${4 - w}`);
    }
    return { values, labels };
  }
  const values: number[] = [];
  const labels: string[] = [];
  const now = new Date();
  for (let m = 11; m >= 0; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const monthStr = isoDate(monthDate).slice(0, 7);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    let total = 0;
    for (const [date, count] of byDay.entries()) {
      if (date.startsWith(monthStr)) total += count;
    }
    values.push(Math.round((total / (daysInMonth * 5)) * 100));
    labels.push(MONTH_ABBR[monthDate.getMonth()]);
  }
  return { values, labels };
}

type HeatCell = { full: boolean; part: boolean };

function buildHeatmap(range: number, byDay: Map<string, number>): HeatCell[] {
  if (range === 3) {
    return Array.from({ length: 52 }, (_, w) => {
      let total = 0;
      for (let day = 0; day < 7; day++) {
        total += byDay.get(isoDate(daysAgo((51 - w) * 7 + day))) ?? 0;
      }
      return { full: total >= 28, part: total > 0 && total < 28 };
    });
  }
  const days = range === 0 ? 1 : range === 1 ? 7 : 30;
  return Array.from({ length: days }, (_, i) => {
    const count = byDay.get(isoDate(daysAgo(days - 1 - i))) ?? 0;
    return { full: count >= 5, part: count > 0 && count < 5 };
  });
}

function computeStreak(byDay: Map<string, number>): number {
  let count = 0;
  const d = new Date();
  while (true) {
    const ds = isoDate(d);
    if ((byDay.get(ds) ?? 0) === 0) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

type Stats = { prayersLogged: number | null; dhikrCounted: number | null; adhkarSessions: number | null };

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const [range, setRange] = useState(0);
  const [stats, setStats] = useState<Stats>({ prayersLogged: null, dhikrCounted: null, adhkarSessions: null });
  const [byDay, setByDay] = useState<Map<string, number>>(new Map());

  const cardWidth = (screenWidth - 48 - 10) / 2;

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      const today = isoDate(new Date());
      const yearAgo = isoDate(daysAgo(364));
      const fromDate = range === 0 ? today : range === 1 ? isoDate(daysAgo(6)) : range === 2 ? isoDate(daysAgo(29)) : yearAgo;

      Promise.all([
        supabase.from('prayer_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('done', true).gte('log_date', fromDate).lte('log_date', today),
        supabase.from('prayer_logs').select('log_date').eq('user_id', user.id).eq('done', true).gte('log_date', yearAgo).lte('log_date', today),
        supabase.from('tasbeeh_sessions').select('count').eq('user_id', user.id).maybeSingle(),
        supabase.from('adhkar_goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gt('progress', 0),
      ])
        .then(([rangeRes, allRes, tasbeehRes, adhkarRes]) => {
          if (!active) return;
          const map = new Map<string, number>();
          for (const row of (allRes.data ?? []) as { log_date: string }[]) {
            map.set(row.log_date, (map.get(row.log_date) ?? 0) + 1);
          }
          setByDay(map);
          setStats({
            prayersLogged: rangeRes.count ?? null,
            dhikrCounted: tasbeehRes.data ? (tasbeehRes.data as { count: number }).count : null,
            adhkarSessions: adhkarRes.count ?? null,
          });
        })
        .catch(() => {});

      return () => {
        active = false;
      };
    }, [user, range])
  );

  const streak = useMemo(() => computeStreak(byDay), [byDay]);
  const bars = useMemo(() => buildBars(range, byDay), [range, byDay]);
  const heatmap = useMemo(() => buildHeatmap(range, byDay), [range, byDay]);

  const statTiles = [
    { label: 'Prayers logged', value: stats.prayersLogged === null ? '—' : String(stats.prayersLogged) },
    { label: 'Dhikr counted', value: stats.dhikrCounted === null ? '—' : stats.dhikrCounted.toLocaleString() },
    { label: 'Adhkar sessions', value: stats.adhkarSessions === null ? '—' : String(stats.adhkarSessions) },
    { label: 'Prayer streak', value: streak === 0 ? '—' : `${streak}d` },
  ];

  const streakMsg =
    streak >= 7
      ? `Ma sha Allah — ${streak} days in a row. Keep going!`
      : streak >= 3
        ? `${streak} days of consistent prayer. Don't break the chain.`
        : streak > 0
          ? `You've prayed today — keep the chain going!`
          : 'Log a prayer to start your streak.';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Progress</Text>
          <SegmentedControl options={RANGES} selected={range} onChange={setRange} style={{ marginTop: 16 }} />
        </RiseIn>

        <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {statTiles.map((s) => (
            <View key={s.label} style={{ width: cardWidth, borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 22, padding: 18, backgroundColor: '#FFFFFF' }}>
              <Text style={{ fontSize: 27, fontWeight: '700', color: colors.inkStrong, letterSpacing: -0.03 }}>{s.value}</Text>
              <Text style={{ fontSize: 12.5, color: colors.inkMuted, marginTop: 9, lineHeight: 18 }}>{s.label}</Text>
            </View>
          ))}
        </RiseIn>

        <RiseIn delay={110} style={{ paddingHorizontal: 24, marginTop: 10 }}>
          <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Prayers per day</Text>
            {bars.values.every((v) => v === 0) ? (
              <Text style={{ fontSize: 13, color: colors.inkMuted, marginTop: 18, marginBottom: 8 }}>No prayers logged yet for this period.</Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: BAR_HEIGHT, marginTop: 18 }}>
                  {bars.values.map((h, i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        borderRadius: 4,
                        backgroundColor: colors.primary,
                        height: Math.max(3, Math.round((h / 100) * BAR_HEIGHT)),
                        opacity: h === 0 ? 0.12 : 1,
                      }}
                    />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  {bars.labels.map((l, i) => (
                    <Text key={i} style={{ flex: 1, fontSize: 10, color: colors.inkSecondary, textAlign: 'center' }}>
                      {l}
                    </Text>
                  ))}
                </View>
              </>
            )}
          </View>
        </RiseIn>

        <RiseIn delay={160} style={{ paddingHorizontal: 24, marginTop: 10 }}>
          <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 16 }}>Prayer consistency</Text>
            {heatmap.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.inkMuted }}>No data for this period yet.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {heatmap.map((d, i) => (
                  <View
                    key={i}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      backgroundColor: d.full ? colors.success : d.part ? '#BFE0CB' : colors.bgTint,
                    }}
                  />
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 }}>
              {[
                { label: 'All five', bg: colors.success },
                { label: 'Some', bg: '#BFE0CB' },
                { label: 'None logged', bg: colors.bgTint },
              ].map((l) => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 11, height: 11, borderRadius: 4, backgroundColor: l.bg }} />
                  <Text style={{ fontSize: 11, color: colors.inkSecondary }}>{l.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </RiseIn>

        <RiseIn delay={210} style={{ paddingHorizontal: 24, marginTop: 10 }}>
          <View style={{ borderRadius: 24, padding: 20, backgroundColor: colors.bgTint }}>
            <Text style={{ fontSize: 17, lineHeight: 24, color: colors.inkStrong }}>{streakMsg}</Text>
            <Text style={{ fontSize: 13, lineHeight: 20, color: colors.inkMuted, marginTop: 10 }}>Nothing here is shared, ranked or compared.</Text>
          </View>
        </RiseIn>
      </ScrollView>
    </View>
  );
}
