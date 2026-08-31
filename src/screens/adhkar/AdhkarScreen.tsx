import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { listGoals } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing, type } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SegmentedControl from '../../components/SegmentedControl';
import { SearchIcon, BeadsIcon, TimerIcon, ChevronRightIcon, SunriseIcon, MoonIcon, PrayerIcon, WarningIcon } from '../../theme/icons';
import { CATEGORIES } from '../../state/adhkarData';

const CATEGORY_ICONS = [SunriseIcon, MoonIcon, PrayerIcon, WarningIcon, BeadsIcon, BeadsIcon, MoonIcon, PrayerIcon];

export default function AdhkarScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = React.useState(0);
  // Only the "Your goals" entry-point badge below reflects real data — the
  // "Continue Evening Adhkar" card and Categories grid are static content
  // library placeholders (adhkarData.ts), unrelated to the adhkar_goals /
  // tasbeeh_sessions tables this domain owns, so they're left untouched.
  const [activeGoals, setActiveGoals] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      listGoals(user.id)
        .then((goals) => active && setActiveGoals(goals.filter((g) => !g.completedAt).length))
        .catch(() => active && setActiveGoals(null));
      return () => {
        active = false;
      };
    }, [user])
  );

  const onModeChange = (i: number) => {
    if (i === 1) nav.tasbeeh();
    else setMode(0);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.standard, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: spacing.xl }}>
          <Text style={{ ...type.h1, color: colors.ink }}>Adhkar</Text>
          <SegmentedControl options={['Adhkar', 'Tasbeeh']} selected={mode} onChange={onModeChange} style={{ marginTop: spacing.standard }} />
          <PressableScale
            onPress={nav.search}
            scaleTo={0.99}
            accessibilityRole="search"
            accessibilityLabel="Search English, Arabic, Urdu or transliteration"
            style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.standard, borderRadius: radii.button, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, minHeight: 48 }}
          >
            <SearchIcon color={colors.inkMuted} />
            <Text style={{ ...type.body, color: colors.inkSecondary }}>Search English, Arabic, Urdu or transliteration</Text>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={80} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
          <PressableScale
            onPress={nav.adhkarSession}
            style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.cardLarge, padding: spacing.lg, backgroundColor: colors.card, ...shadow.card }}
          >
            <Text style={{ ...type.captionStrong, textTransform: 'uppercase', color: colors.primary }}>Continue</Text>
            <Text style={{ ...type.h1, color: colors.ink, marginTop: spacing.sm }}>Evening Adhkar</Text>
            <Text style={{ ...type.caption, color: colors.inkMuted, marginTop: spacing.sm }}>20 adhkar · about 8 minutes</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.standard }}>
              <View style={{ height: 5, flex: 1, borderRadius: radii.pill, backgroundColor: colors.primaryTint, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: '30%', backgroundColor: colors.primary, borderRadius: radii.pill }} />
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}>30% · 6 / 20</Text>
            </View>
          </PressableScale>
        </RiseIn>

        {/* Goals live in this tab group, so they need an entry point here —
            otherwise they are only reachable via Profile. */}
        <RiseIn delay={100} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
          <PressableScale
            onPress={nav.goals}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel="Your goals, 2 active"
            style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.standard, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, ...shadow.card }}
          >
            <View style={{ width: 36, height: 36, borderRadius: radii.control, backgroundColor: colors.successTint, alignItems: 'center', justifyContent: 'center' }}>
              <BeadsIcon size={18} color={colors.successStrong} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.ink }}>Your goals</Text>
              <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 3 }}>
                {activeGoals === null ? 'View goals' : `${activeGoals} active`}
              </Text>
            </View>
            <ChevronRightIcon />
          </PressableScale>
          <PressableScale
            onPress={nav.progress}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel="Progress and history"
            style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.standard, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, ...shadow.card }}
          >
            <View style={{ width: 36, height: 36, borderRadius: radii.control, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
              <TimerIcon size={18} color={colors.primaryStrong} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.ink }}>Progress</Text>
              <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 3 }}>History</Text>
            </View>
            <ChevronRightIcon />
          </PressableScale>
        </RiseIn>

        <RiseIn delay={140} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
          <Text style={{ ...type.captionStrong, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: spacing.md }}>Categories</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {CATEGORIES.map((c, index) => {
              const accent = [
                { tint: colors.primaryTint, ink: colors.primary },
                { tint: colors.goldTint, ink: colors.gold },
                { tint: colors.purpleTint, ink: colors.purple },
                { tint: colors.successTint, ink: colors.successStrong },
              ][index % 4];
              const Icon = CATEGORY_ICONS[index] ?? BeadsIcon;
              return (
                <PressableScale
                  key={c.name}
                  onPress={nav.adhkarSession}
                  style={{ width: '47.5%', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.standard, backgroundColor: colors.card, minHeight: 120, justifyContent: 'space-between', gap: spacing.md, ...shadow.card }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                    <View style={{ width: 36, height: 36, borderRadius: radii.button, backgroundColor: accent.tint, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={accent.ink} />
                    </View>
                    <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', fontSize: 16, color: accent.ink, writingDirection: 'rtl', flexShrink: 1 }}>{c.ar}</Text>
                  </View>
                  <View>
                    <Text style={{ ...type.bodyStrong, color: colors.ink }}>{c.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: spacing.xs }}>
                      {c.n} adhkar · {c.mins} min
                    </Text>
                    <View style={{ height: 4, borderRadius: radii.pill, backgroundColor: colors.primaryTint, marginTop: spacing.sm, overflow: 'hidden' }}>
                      <View style={{ height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary, width: `${c.pct}%` }} />
                    </View>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </RiseIn>
      </ScrollView>
    </View>
  );
}
