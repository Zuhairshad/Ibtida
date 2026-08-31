import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { listGoals, AdhkarGoal } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing, type } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import EmptyState from '../../components/EmptyState';
import { RowSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { PlusIcon } from '../../theme/icons';

const FREQS = ['Every day', 'Weekdays', 'Custom'];

export default function GoalsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<AdhkarGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      listGoals(user.id)
        .then((g) => active && setGoals(g))
        .catch(() => active && setToast('Could not load your goals.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [user])
  );

  const activeCount = goals.filter((g) => !g.completedAt).length;
  const subtitle =
    goals.length === 0
      ? 'Start with one small act of worship.'
      : `${activeCount} active. That is usually enough.`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View>
            <Text style={{ ...type.h1, color: colors.ink }}>Goals</Text>
            <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 9, lineHeight: 20 }}>{subtitle}</Text>
          </View>
          <PressableScale onPress={nav.goalNew} style={{ width: 44, height: 44, borderRadius: radii.button, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22, color: colors.inkOnPrimary }}>+</Text>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={80} style={{ paddingHorizontal: 24, marginTop: 18, gap: 10 }}>
          {loading ? (
            <RowSkeleton rows={2} />
          ) : (
            goals.map((g) => {
              const pct = g.target > 0 ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0;
              const done = pct >= 100;
              return (
                <View key={g.id} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, ...shadow.card }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View>
                      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{g.title}</Text>
                      <Text style={{ fontSize: 13, color: colors.inkSecondary, marginTop: 6 }}>{FREQS[g.frequency] ?? 'Custom'}</Text>
                    </View>
                    <View style={{ backgroundColor: done ? colors.successTint : colors.primaryTint, paddingVertical: 7, paddingHorizontal: 10, borderRadius: radii.pill }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: colors.ink }}>{done ? 'Done' : `${pct}%`}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 16 }}>
                    <View style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: colors.primaryTint, overflow: 'hidden' }}>
                      <View style={{ height: '100%', borderRadius: 3, backgroundColor: colors.success, width: `${pct}%` }} />
                    </View>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}>
                      {done ? 'Done' : `${g.progress} / ${g.target}`}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </RiseIn>

        <RiseIn delay={140} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <EmptyState
            icon={<PlusIcon />}
            title="Room for one more"
            subtitle="Start with one small act of worship."
            actionLabel="Create goal"
            onAction={nav.goalNew}
          />
        </RiseIn>
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
