import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadow, spacing, type } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import SegmentedControl from '../../components/SegmentedControl';
import { PROGRESS_STATS_BY_RANGE, PROGRESS_BARS_BY_RANGE, PROGRESS_AXIS, PROGRESS_HEAT, PROGRESS_HEAT_DAYS } from '../../state/adhkarData';

const RANGES = ['Today', 'Week', 'Month', 'Year'];

// NOTE: the panels below (dhikr-per-day bars, prayer-consistency heatmap)
// remain static demo content. `adhkar_goals` only stores a single running
// `progress` integer per goal and `tasbeeh_sessions` a single `count`/`reps`
// — there is no per-day history table backing a real "Dhikr per day" chart,
// and the heatmap mixes in prayer data that belongs to the prayers domain's
// own tables. Wiring this to real history would need a new migration (e.g.
// a per-day adhkar log) which is out of this pass's scope — left for a
// future agent per the task's "note in report" guidance rather than invented
// here. Only the range selector itself (which of these static datasets is
// shown) is real, local UI state — it isn't persisted anywhere.
export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState(0);

  // Every panel below reads from the selected range, so the control actually
  // changes what you see rather than just highlighting a different pill.
  const stats = PROGRESS_STATS_BY_RANGE[range];
  const bars = PROGRESS_BARS_BY_RANGE[range];
  const [axisStart, axisEnd] = PROGRESS_AXIS[range];
  const heat = PROGRESS_HEAT.slice(0, PROGRESS_HEAT_DAYS[range]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24 }}>
          <Text style={{ ...type.h1, color: colors.ink }}>Progress</Text>
          <SegmentedControl options={RANGES} selected={range} onChange={setRange} style={{ marginTop: 16 }} />
        </RiseIn>

        <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {stats.map((s) => (
            <View key={s.label} style={{ width: '47.5%', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, ...shadow.card }}>
              <Text style={{ ...type.display, color: colors.ink }}>{s.value}</Text>
              <Text style={{ fontSize: 12.5, color: colors.inkMuted, marginTop: 9, lineHeight: 18 }}>{s.label}</Text>
            </View>
          ))}
        </RiseIn>

        <RiseIn delay={110} style={{ paddingHorizontal: 24, marginTop: 10 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, ...shadow.card }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Dhikr per day</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 112, marginTop: 18 }}>
              {bars.map((h, i) => (
                <View key={i} style={{ flex: 1, borderRadius: 5, backgroundColor: colors.primary, height: `${h}%` }} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: colors.inkSecondary }}>{axisStart}</Text>
              <Text style={{ fontSize: 12, color: colors.inkSecondary }}>{axisEnd}</Text>
            </View>
          </View>
        </RiseIn>

        <RiseIn delay={160} style={{ paddingHorizontal: 24, marginTop: 10 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, ...shadow.card }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 16 }}>Prayer consistency</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {heat.map((d, i) => (
                <View key={i} style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: d.full ? colors.success : d.part ? colors.successTint : colors.bg }} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 }}>
              {[
                { label: 'All five', bg: colors.success },
                { label: 'Some', bg: colors.successTint },
                { label: 'None logged', bg: colors.bg },
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
          <View style={{ borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.primaryTint }}>
            <Text style={{ fontSize: 17, lineHeight: 24, color: colors.ink }}>Your consistency is growing. Fajr has held 19 days running.</Text>
            <Text style={{ fontSize: 13, lineHeight: 20, color: colors.inkMuted, marginTop: 10 }}>Nothing here is shared, ranked or compared.</Text>
          </View>
        </RiseIn>
      </ScrollView>
    </View>
  );
}
