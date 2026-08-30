import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { FOCUS_DURATIONS } from '../../state/AppState';
import { getFocusSettings, toggleFocusApp, cycleFocusDuration } from '../../services/focus';
import { listGoals } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SecondaryButton from '../../components/SecondaryButton';
import PrimaryButton from '../../components/PrimaryButton';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { ChevronRightIcon, CheckIcon } from '../../theme/icons';

const RESTRICT_APPS = ['Instagram', 'TikTok', 'YouTube', 'Facebook'];

// Seeds a brand-new user's focus_settings row so first-run UX matches the
// old AppState.initialState default (all four apps pre-selected).
const DEFAULT_BLOCKED_APPS = RESTRICT_APPS.reduce<Record<string, boolean>>((acc, a) => ({ ...acc, [a]: true }), {});

// Platform capability layer per §21 — never assumes identical capability on
// iOS vs Android, and calls out emergency access explicitly.
export default function FocusSetupScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [blockedApps, setBlockedApps] = useState<Record<string, boolean>>({});
  const [durationIndex, setDurationIndex] = useState(0);
  // The worship-goal target shown here comes from the user's most recent
  // Adhkar goal (`adhkar_goals`, via services/adhkar.listGoals) — there is no
  // dedicated "focus goal" column, and AppState's old `newTarget` field is now
  // dead (GoalNewScreen keeps its target as fully local form state and never
  // wrote it back to AppState), so reading it here would always show the
  // stale initial value of 100. Falls back to 100 when the user has no goals.
  const [goalTarget, setGoalTarget] = useState(100);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      Promise.all([getFocusSettings(user.id, DEFAULT_BLOCKED_APPS), listGoals(user.id)])
        .then(([s, goals]) => {
          if (!active) return;
          setBlockedApps(s.blockedApps);
          setDurationIndex(s.durationIndex);
          const active_ = goals.find((g) => !g.completedAt) ?? goals[0];
          if (active_) setGoalTarget(active_.target);
        })
        .catch(() => active && setToast('Could not load your focus settings.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [user])
  );

  const selectedCount = RESTRICT_APPS.filter((a) => blockedApps[a]).length;

  const onToggleApp = (name: string) => {
    if (!user || busy) return;
    const prev = blockedApps;
    setBlockedApps((b) => ({ ...b, [name]: !b[name] }));
    toggleFocusApp(user.id, name, DEFAULT_BLOCKED_APPS).catch(() => {
      setBlockedApps(prev);
      setToast('Could not save that change.');
    });
  };

  const onCycleDuration = () => {
    if (!user || busy) return;
    setBusy(true);
    cycleFocusDuration(user.id, FOCUS_DURATIONS.length)
      .then((next) => setDurationIndex(next))
      .catch(() => setToast('Could not save that change.'))
      .finally(() => setBusy(false));
  };

  return (
    <ScreenFade duration={300} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 34 }} showsVerticalScrollIndicator={false}>
        <SecondaryButton label="Close" onPress={nav.back} style={{ alignSelf: 'flex-start' }} />
        <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 12 }}>Ibadah Focus</Text>
        <Text style={{ fontSize: 15, lineHeight: 23, color: colors.inkMuted, marginTop: 9 }}>Choose your worship goal. Your phone stays quiet until you finish it.</Text>

        {loading ? (
          <View style={{ marginTop: 18, gap: 12 }}>
            <SkeletonBlock width="100%" height={162} radius={24} />
            <SkeletonBlock width="100%" height={150} radius={24} />
          </View>
        ) : (
          <>
            <View style={{ marginTop: 18, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
              <PressableScale
                onPress={nav.goalNew}
                scaleTo={1}
                accessibilityRole="button"
                accessibilityLabel={`Worship goal, Durood Sharif ${goalTarget}. Double tap to change.`}
                style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }}>Worship goal</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14, color: colors.inkMuted }}>Durood Sharif · {goalTarget}</Text>
                  <ChevronRightIcon />
                </View>
              </PressableScale>

              <PressableScale
                onPress={onCycleDuration}
                disabled={busy}
                scaleTo={1}
                accessibilityRole="button"
                accessibilityLabel={`Focus duration, ${FOCUS_DURATIONS[durationIndex]}. Double tap to change.`}
                style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: busy ? 0.6 : 1 }}
              >
                <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }}>Focus duration</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14, color: colors.inkMuted }}>{FOCUS_DURATIONS[durationIndex]}</Text>
                  <ChevronRightIcon />
                </View>
              </PressableScale>

              <View style={{ padding: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }}>Apps to restrict</Text>
                  <Text style={{ fontSize: 14, color: colors.inkMuted }}>{selectedCount} selected</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
                  {RESTRICT_APPS.map((a) => {
                    const on = blockedApps[a];
                    return (
                      <PressableScale
                        key={a}
                        onPress={() => onToggleApp(a)}
                        scaleTo={0.94}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={a}
                        style={{
                          backgroundColor: on ? colors.primaryTint : colors.bgTint,
                          borderWidth: 1,
                          borderColor: on ? 'rgba(61,115,201,0.35)' : 'transparent',
                          paddingVertical: 9,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {on && <CheckIcon size={10} color={colors.primary} />}
                        <Text style={{ fontSize: 12.5, fontWeight: '500', color: on ? colors.primary : colors.inkMuted }}>{a}</Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={{ marginTop: 12, borderRadius: 24, padding: 20, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: 'rgba(61,115,201,0.2)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2F5CA3' }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F3E63' }}>Platform capability</Text>
              </View>
              <View style={{ gap: 10, marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.75)', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, minWidth: 52, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#1F3E63' }}>iOS</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 20, color: '#3A5A7E' }}>Screen Time authorisation required. Apple’s own limiter shields the apps you choose.</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.75)', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, minWidth: 52, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#1F3E63' }}>Android</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 12.5, lineHeight: 20, color: '#3A5A7E' }}>Usage Access required. Fallback is a full-screen reminder when a restricted app opens.</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12.5, lineHeight: 20, color: '#3A5A7E', marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderColor: 'rgba(61,115,201,0.18)' }}>
                Calls, messages and emergency services remain available on both platforms.
              </Text>
            </View>
          </>
        )}

        <PrimaryButton label="Activate Focus" onPress={nav.focusActive} disabled={loading} style={{ marginTop: 16 }} />
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
