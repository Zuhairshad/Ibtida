import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../state/AuthContext';
import { createGoal } from '../../services/adhkar';
import { listCommunityGoals, type CommunityGoal } from '../../services/community';
import { nav } from '../../navigation/navigate';
import { colors, arabicFont } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import Toggle from '../../components/Toggle';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import Toast from '../../components/Toast';
import { SkeletonBlock } from '../../components/Skeleton';

const FREQS = ['Every day', 'Weekdays', 'Custom'];
const DEFAULT_RANGE = 0;

const DHIKR_OPTIONS = [
  'Durood Sharif',
  'SubhanAllah',
  'Alhamdulillah',
  'AllahuAkbar',
  'Astaghfirullah',
  'Laa ilaaha illallah',
  'Custom…',
] as const;

const ARABIC_MAP: Record<string, string> = {
  'Durood Sharif': 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
  'Kalma Tayyiba': 'لَا إِلَٰهَ إِلَّا اللَّهُ',
  'Subhan Allah': 'سُبْحَانَ اللهِ',
};

type Mode = 'community' | 'personal';

const IVORY = '#FAF8F3';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function CommunityGoalCard({
  goal,
  selected,
  onSelect,
}: {
  goal: CommunityGoal;
  selected: boolean;
  onSelect: () => void;
}) {
  const pct = goal.target > 0 ? Math.min(1, goal.totalProgress / goal.target) : 0;
  const arabic = ARABIC_MAP[goal.name] ?? null;

  return (
    <PressableScale
      onPress={onSelect}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        borderRadius: 22,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.cardBorder,
        backgroundColor: '#FFFFFF',
        padding: 18,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.inkStrong }}>{goal.name}</Text>
          {arabic ? (
            <Text style={{ fontFamily: arabicFont, fontSize: 17, color: colors.inkMuted, marginTop: 5, textAlign: 'left' }}>
              {arabic}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
          </View>
        ) : (
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.cardBorderStrong }} />
        )}
      </View>

      <View style={{ marginTop: 14 }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.successTint, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              borderRadius: 3,
              backgroundColor: colors.success,
              width: `${Math.round(pct * 100)}%`,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
          <Text style={{ fontSize: 12, color: colors.inkMuted }}>
            {formatCount(goal.totalProgress)} / {formatCount(goal.target)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.inkMuted }}>
            {goal.participantCount.toLocaleString()} participant{goal.participantCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

function GoalCardSkeleton() {
  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: '#FFFFFF',
        padding: 18,
        marginBottom: 10,
      }}
    >
      <SkeletonBlock width="55%" height={16} />
      <SkeletonBlock width="40%" height={13} style={{ marginTop: 8 }} />
      <SkeletonBlock width="100%" height={6} radius={3} style={{ marginTop: 16 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <SkeletonBlock width="30%" height={11} />
        <SkeletonBlock width="35%" height={11} />
      </View>
    </View>
  );
}

function Stepper({
  value,
  onDecrement,
  onIncrement,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <PressableScale
        onPress={onDecrement}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: colors.bgTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 22, color: colors.inkStrong, lineHeight: 26 }}>−</Text>
      </PressableScale>
      <Text style={{ fontSize: 20, fontWeight: '600', color: colors.inkStrong, minWidth: 60, textAlign: 'center' }}>
        {value.toLocaleString()}
      </Text>
      <PressableScale
        onPress={onIncrement}
        scaleTo={0.9}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: colors.bgTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 22, color: colors.inkStrong, lineHeight: 26 }}>+</Text>
      </PressableScale>
    </View>
  );
}

export default function GoalNewScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('community');

  // Community mode state
  const [communityGoals, setCommunityGoals] = useState<CommunityGoal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [contribution, setContribution] = useState(1000);

  // Personal mode state
  const [dhikr, setDhikr] = useState<string>('Durood Sharif');
  const [customDhikr, setCustomDhikr] = useState('');
  const [target, setTarget] = useState(100);
  const [freq, setFreq] = useState(0);
  const [reminderOn, setReminderOn] = useState(true);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingGoals(true);
    listCommunityGoals(user.id)
      .then((goals) => {
        if (!active) return;
        const global = goals.filter((g) => g.circleId === null);
        setCommunityGoals(global);
        if (global.length > 0 && selectedGoalId === null) {
          setSelectedGoalId(global[0].id);
        }
      })
      .catch(() => active && setToast('Could not load community goals.'))
      .finally(() => active && setLoadingGoals(false));
    return () => {
      active = false;
    };
  }, [user]);

  const contributionDown = useCallback(() => setContribution((c) => Math.max(c - 100, 100)), []);
  const contributionUp = useCallback(() => setContribution((c) => c + 100), []);

  const targetDown = useCallback(() => setTarget((t) => Math.max(t - 10, 10)), []);
  const targetUp = useCallback(() => setTarget((t) => t + 10), []);

  const onCreate = async () => {
    if (!user) {
      setToast('You need to be signed in to create a goal.');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'community') {
        const goal = communityGoals.find((g) => g.id === selectedGoalId);
        if (!goal) {
          setToast('Please select a community goal.');
          setSaving(false);
          return;
        }
        await createGoal(user.id, goal.name, contribution, 0, DEFAULT_RANGE, goal.id);
      } else {
        const title = dhikr === 'Custom…' ? customDhikr.trim() : dhikr;
        if (!title) {
          setToast('Please enter a dhikr name.');
          setSaving(false);
          return;
        }
        await createGoal(user.id, title, target, freq, DEFAULT_RANGE);
      }
      nav.goals();
    } catch {
      setToast('Could not create your goal. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const canCreate =
    mode === 'community'
      ? selectedGoalId !== null
      : dhikr === 'Custom…'
        ? customDhikr.trim().length > 0
        : true;

  return (
    <ScreenFade
      duration={280}
      style={{
        backgroundColor: IVORY,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View style={{ paddingHorizontal: 24 }}>
        <SecondaryButton label="Cancel" onPress={nav.back} style={{ alignSelf: 'flex-start', marginBottom: 6 }} />
        <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Create goal</Text>
        <Text style={{ fontSize: 14, color: colors.inkMuted, marginTop: 6, marginBottom: 20 }}>
          Join the community or set a personal target.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
      >
        {/* Mode selector */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
          {(
            [
              {
                id: 'community' as Mode,
                icon: '🌙',
                title: 'Community goal',
                subtitle: 'Contribute to a shared target',
              },
              {
                id: 'personal' as Mode,
                icon: '✦',
                title: 'Personal goal',
                subtitle: 'A private, daily target',
              },
            ] as const
          ).map(({ id, icon, title, subtitle }) => {
            const active = mode === id;
            return (
              <PressableScale
                key={id}
                onPress={() => setMode(id)}
                scaleTo={0.97}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  borderRadius: 22,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? colors.primary : colors.cardBorder,
                  backgroundColor: active ? colors.primaryTint : '#FFFFFF',
                  padding: 16,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: active ? colors.primary : colors.bgTint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{icon}</Text>
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: active ? colors.primary : colors.inkStrong }}>
                  {title}
                </Text>
                <Text style={{ fontSize: 12, color: active ? colors.primary : colors.inkMuted, lineHeight: 17 }}>
                  {subtitle}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {mode === 'community' ? (
          <>
            {loadingGoals ? (
              <>
                <GoalCardSkeleton />
                <GoalCardSkeleton />
                <GoalCardSkeleton />
              </>
            ) : (
              communityGoals.map((goal) => (
                <CommunityGoalCard
                  key={goal.id}
                  goal={goal}
                  selected={selectedGoalId === goal.id}
                  onSelect={() => setSelectedGoalId(goal.id)}
                />
              ))
            )}

            <View
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: '#FFFFFF',
                padding: 18,
                marginTop: 4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.09,
                    textTransform: 'uppercase',
                    color: colors.inkSecondary,
                  }}
                >
                  Your target
                </Text>
                <Text style={{ fontSize: 12.5, color: colors.inkMuted, marginTop: 5, lineHeight: 18 }}>
                  How many recitations would you like to reach?
                </Text>
              </View>
              <Stepper value={contribution} onDecrement={contributionDown} onIncrement={contributionUp} />
            </View>

            <View style={{ marginTop: 12, borderRadius: 22, padding: 17, backgroundColor: colors.goldTint }}>
              <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.goldInkDeep }}>
                Your count contributes to the shared total — every recitation counts toward the community goal.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View
              style={{
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: 24,
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              {/* Dhikr selector */}
              <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.09,
                    textTransform: 'uppercase',
                    color: colors.inkSecondary,
                    marginBottom: 12,
                  }}
                >
                  Dhikr
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -2 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
                    {DHIKR_OPTIONS.map((label) => {
                      const on = dhikr === label;
                      return (
                        <PressableScale
                          key={label}
                          onPress={() => setDhikr(label)}
                          scaleTo={0.95}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            borderRadius: 20,
                            backgroundColor: on ? colors.primary : colors.bgTint,
                            borderWidth: on ? 0 : 1,
                            borderColor: colors.cardBorder,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13.5,
                              fontWeight: on ? '600' : '400',
                              color: on ? '#FFFFFF' : colors.inkMuted,
                            }}
                          >
                            {label}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                </ScrollView>
                {dhikr === 'Custom…' ? (
                  <TextInput
                    value={customDhikr}
                    onChangeText={setCustomDhikr}
                    placeholder="e.g. Ya Rahman"
                    placeholderTextColor={colors.inkFaint}
                    autoFocus
                    style={{
                      marginTop: 12,
                      fontSize: 16,
                      color: colors.inkStrong,
                      borderWidth: 1,
                      borderColor: colors.cardBorderStrong,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      backgroundColor: IVORY,
                    }}
                  />
                ) : null}
              </View>

              {/* Daily target */}
              <View
                style={{
                  padding: 18,
                  borderBottomWidth: 1,
                  borderColor: colors.cardBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 0.09,
                      textTransform: 'uppercase',
                      color: colors.inkSecondary,
                    }}
                  >
                    Daily target
                  </Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkMuted, marginTop: 5 }}>recitations per day</Text>
                </View>
                <Stepper value={target} onDecrement={targetDown} onIncrement={targetUp} />
              </View>

              {/* Repeat */}
              <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.09,
                    textTransform: 'uppercase',
                    color: colors.inkSecondary,
                    marginBottom: 12,
                  }}
                >
                  Repeat
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {FREQS.map((label, i) => {
                    const on = freq === i;
                    return (
                      <PressableScale
                        key={label}
                        onPress={() => setFreq(i)}
                        scaleTo={1}
                        style={{
                          flex: 1,
                          minHeight: 44,
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: on ? colors.primary : '#FFFFFF',
                          borderWidth: on ? 0 : 1,
                          borderColor: 'rgba(23,32,28,0.1)',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13.5,
                            fontWeight: on ? '600' : '500',
                            color: on ? '#FFFFFF' : colors.inkMuted,
                          }}
                        >
                          {label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* Reminder */}
              <PressableScale
                onPress={() => setReminderOn((v) => !v)}
                scaleTo={1}
                accessibilityRole="switch"
                accessibilityState={{ checked: reminderOn }}
                accessibilityLabel="Daily reminder at 8:00 PM"
                style={{
                  padding: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  minHeight: 52,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 0.09,
                      textTransform: 'uppercase',
                      color: colors.inkSecondary,
                    }}
                  >
                    Reminder
                  </Text>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: '500',
                      color: reminderOn ? colors.inkStrong : colors.inkSecondary,
                      marginTop: 9,
                    }}
                  >
                    {reminderOn ? '8:00 PM' : 'Off'}
                  </Text>
                </View>
                <Toggle on={reminderOn} />
              </PressableScale>
            </View>

            <View style={{ marginTop: 12, borderRadius: 22, padding: 17, backgroundColor: colors.bgTint }}>
              <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkMuted }}>
                Private by default. Nothing about this goal leaves the device unless you attach it to a community goal.
              </Text>
            </View>
          </>
        )}

        <PrimaryButton
          label="Create goal"
          onPress={onCreate}
          loading={saving}
          disabled={!canCreate}
          style={{ marginTop: 20 }}
        />
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
