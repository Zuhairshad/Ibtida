import React, { useCallback, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { listGoals } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SegmentedControl from '../../components/SegmentedControl';
import { SearchIcon, BeadsIcon, TimerIcon, ChevronRightIcon } from '../../theme/icons';
import { CATEGORIES } from '../../state/adhkarData';

export default function AdhkarScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - 48 - 10) / 2; // 24px padding each side, 10px gap
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
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Adhkar</Text>
          <SegmentedControl options={['Adhkar', 'Tasbeeh']} selected={mode} onChange={onModeChange} style={{ marginTop: 16 }} />
          <PressableScale
            onPress={nav.search}
            scaleTo={0.99}
            accessibilityRole="search"
            accessibilityLabel="Search English, Arabic, Urdu or transliteration"
            style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, minHeight: 48 }}
          >
            <SearchIcon />
            <Text style={{ fontSize: 14.5, color: '#6E7671' }}>Search English, Arabic, Urdu or transliteration</Text>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={80} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          {activeGoals !== null && activeGoals > 0 ? (
            <PressableScale
              onPress={nav.goals}
              style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 28, padding: 22, backgroundColor: '#FBF8F1' }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.goldInk }}>Continue</Text>
              <Text style={{ fontSize: 22, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.02, marginTop: 10 }}>
                {activeGoals === 1 ? '1 active goal' : `${activeGoals} active goals`}
              </Text>
              <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 7 }}>Tap to view your progress</Text>
            </PressableScale>
          ) : (
            <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 28, padding: 22, backgroundColor: '#FBF8F1', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: colors.inkMuted }}>No active session</Text>
            </View>
          )}
        </RiseIn>

        {/* Goals live in this tab group, so they need an entry point here —
            otherwise they are only reachable via Profile. */}
        <RiseIn delay={100} style={{ paddingHorizontal: 24, marginTop: 12, flexDirection: 'row', gap: 10 }}>
          <PressableScale
            onPress={nav.goals}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel="Your goals, 2 active"
            style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, padding: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.successTint, alignItems: 'center', justifyContent: 'center' }}>
              <BeadsIcon size={18} color="#3B7A52" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.inkStrong }}>Your goals</Text>
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
            style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, padding: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
              <TimerIcon size={18} color="#2F5CA3" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.inkStrong }}>Progress</Text>
              <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 3 }}>History</Text>
            </View>
            <ChevronRightIcon />
          </PressableScale>
        </RiseIn>

        <RiseIn delay={140} style={{ paddingHorizontal: 24, marginTop: 22 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Categories</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {CATEGORIES.map((c) => (
              <PressableScale
                key={c.name}
                onPress={nav.adhkarSession}
                style={{ width: cardWidth, borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 22, padding: 16, backgroundColor: '#FFFFFF', minHeight: 120, justifyContent: 'space-between', gap: 12 }}
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
