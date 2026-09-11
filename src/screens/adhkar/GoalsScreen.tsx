import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { listGoals, AdhkarGoal } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import EmptyState from '../../components/EmptyState';
import { RowSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { PlusIcon } from '../../theme/icons';

const FREQS = ['Every day', 'Weekdays', 'Custom'];

const ARABIC_BOLD = 'ScheherazadeNew_700Bold';

const TITLE_TO_ARABIC: Record<string, string> = {
  'Durood Sharif':       'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
  'Durood Ibrahim':      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
  'SubhanAllah':         'سُبْحَانَ اللهِ',
  'Alhamdulillah':       'الْحَمْدُ لِلَّهِ',
  'AllahuAkbar':         'اللهُ أَكْبَرُ',
  'Astaghfirullah':      'أَسْتَغْفِرُ اللهَ',
  'Laa ilaaha illallah': 'لَا إِلَٰهَ إِلَّا اللَّهُ',
  'La ilaha illallah':   'لَا إِلَٰهَ إِلَّا اللَّهُ',
  'La hawla':            'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
};

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
            <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Goals</Text>
            <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 9, lineHeight: 20 }}>{subtitle}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PressableScale
              onPress={nav.goalSchedule}
              style={{ height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryTint, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>📅 Schedule</Text>
            </PressableScale>
            <PressableScale onPress={nav.goalNew} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, color: '#FFFFFF' }}>+</Text>
            </PressableScale>
          </View>
        </RiseIn>

        <RiseIn delay={80} style={{ paddingHorizontal: 24, marginTop: 18, gap: 10 }}>
          {loading ? (
            <RowSkeleton rows={2} />
          ) : (
            goals.map((g) => {
              const pct = g.target > 0 ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0;
              const done = pct >= 100;
              return (
                <PressableScale
                  key={g.id}
                  scaleTo={0.98}
                  onPress={() => nav.goalTasbeeh(g.id, g.title, g.target, g.progress, g.communityGoalId)}
                  style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.06)', borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFFFFF' }}
                >
                  {/* Gold top accent strip */}
                  <LinearGradient
                    colors={done ? ['#4CA96B', '#5EAA78'] : pct >= 50 ? ['#D9BE86', '#C4A96A'] : [colors.primary, '#3B7DDE']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ height: 3, width: `${Math.max(pct, 4)}%` }}
                  />
                  <View style={{ padding: 18 }}>
                    {/* Arabic calligraphy */}
                    {TITLE_TO_ARABIC[g.title] && (
                      <Text style={{ fontFamily: ARABIC_BOLD, fontSize: 18, color: colors.goldInk, writingDirection: 'rtl', textAlign: 'right', marginBottom: 8, opacity: 0.85 }}>
                        {TITLE_TO_ARABIC[g.title]}
                      </Text>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.inkStrong }}>{g.title}</Text>
                        <Text style={{ fontSize: 12.5, color: colors.inkMuted, marginTop: 4 }}>{FREQS[g.frequency] ?? 'Custom'}</Text>
                      </View>
                      <View style={{ backgroundColor: done ? colors.successTint : pct >= 50 ? colors.goldTint : colors.bgTint, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: done ? colors.successText : pct >= 50 ? colors.goldInk : colors.inkStrong }}>
                          {done ? '✓ Done' : `${pct}%`}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14 }}>
                      <View style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: colors.bgTint, overflow: 'hidden' }}>
                        <View style={{ height: '100%', borderRadius: 3, width: `${pct}%`, backgroundColor: done ? colors.success : pct >= 50 ? colors.gold : colors.primary }} />
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkMuted }}>
                        {done ? `${g.target} done` : `${g.progress} / ${g.target}`}
                      </Text>
                    </View>

                    {!done && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
                        <Text style={{ fontSize: 10.5, color: colors.primary, fontWeight: '600', letterSpacing: 0.3 }}>
                          Tap to count →
                        </Text>
                        {g.communityGoalId && (
                          <View style={{ backgroundColor: colors.primaryTint, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                            <Text style={{ fontSize: 9.5, color: colors.primary, fontWeight: '600' }}>Community</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </PressableScale>
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
