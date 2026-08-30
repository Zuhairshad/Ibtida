import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { FOCUS_DURATIONS } from '../../state/AppState';
import { getFocusSettings, cycleFocusDuration } from '../../services/focus';
import { listGoals, type AdhkarGoal } from '../../services/adhkar';
import { listBlockedApps, addBlockedApp, removeBlockedApp, type BlockedApp, type AppPlatform } from '../../services/ibadahLock';
import { pickAppsToBlock, isAppBlockingSupported } from '../../../modules/expo-ibadah-native';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SecondaryButton from '../../components/SecondaryButton';
import PrimaryButton from '../../components/PrimaryButton';
import EmptyState from '../../components/EmptyState';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { ChevronRightIcon, CheckIcon, PlusIcon } from '../../theme/icons';

// The current platform, typed to match blocked_apps.platform / BlockedApp's
// AppPlatform union — 'web' (Expo web / a plain browser preview) has no
// blocking mechanism at all, so it's mapped to 'android' only for the shape
// of addBlockedApp's call; isAppBlockingSupported() is what actually gates
// whether that call path is ever reached.
const CURRENT_PLATFORM: AppPlatform = Platform.OS === 'ios' ? 'ios' : 'android';

// This platform/build's capability is fixed for the life of the app process
// (it depends on whether a native dev client with the real module is
// running, not on anything that changes at runtime), so it's read once at
// module scope rather than re-checked on every render.
const BLOCKING_SUPPORTED = isAppBlockingSupported();

// Platform capability layer per §21 — never assumes identical capability on
// iOS vs Android, and calls out emergency access explicitly.
export default function FocusSetupScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [durationIndex, setDurationIndex] = useState(0);
  const [goals, setGoals] = useState<AdhkarGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [blockedApps, setBlockedApps] = useState<BlockedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickingApps, setPickingApps] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      Promise.all([getFocusSettings(user.id), listGoals(user.id), listBlockedApps(user.id)])
        .then(([s, goalList, apps]) => {
          if (!active) return;
          setDurationIndex(s.durationIndex);
          setGoals(goalList);
          setBlockedApps(apps);
          // Default to the most recently created still-open goal — the user
          // can pick a different one below before activating.
          setSelectedGoalId((prev) => {
            if (prev && goalList.some((g) => g.id === prev && !g.completedAt)) return prev;
            return goalList.find((g) => !g.completedAt)?.id ?? null;
          });
        })
        .catch(() => active && setToast('Could not load your focus settings.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [user])
  );

  const openGoals = goals.filter((g) => !g.completedAt);
  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? null;
  const platformApps = blockedApps.filter((a) => a.platform === CURRENT_PLATFORM);

  const onCycleDuration = () => {
    if (!user || busy) return;
    setBusy(true);
    cycleFocusDuration(user.id, FOCUS_DURATIONS.length)
      .then((next) => setDurationIndex(next))
      .catch(() => setToast('Could not save that change.'))
      .finally(() => setBusy(false));
  };

  const onPickApps = async () => {
    if (!user || pickingApps || !BLOCKING_SUPPORTED) return;
    setPickingApps(true);
    try {
      const picked = await pickAppsToBlock();
      await Promise.all(picked.map((ref) => addBlockedApp(user.id, CURRENT_PLATFORM, ref.id, ref.label)));
      const refreshed = await listBlockedApps(user.id);
      setBlockedApps(refreshed);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not open the app picker.');
    } finally {
      setPickingApps(false);
    }
  };

  const onRemoveApp = (app: BlockedApp) => {
    if (!user) return;
    const prev = blockedApps;
    setBlockedApps((apps) => apps.filter((a) => a.id !== app.id));
    removeBlockedApp(user.id, app.id).catch(() => {
      setBlockedApps(prev);
      setToast('Could not remove that app.');
    });
  };

  const onActivate = () => {
    if (!selectedGoal) return;
    nav.focusActive(selectedGoal.id, selectedGoal.target);
  };

  return (
    <ScreenFade duration={300} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 34 }} showsVerticalScrollIndicator={false}>
        <SecondaryButton label="Close" onPress={nav.back} style={{ alignSelf: 'flex-start' }} />
        <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 12 }}>Ibadah Lock</Text>
        <Text style={{ fontSize: 15, lineHeight: 23, color: colors.inkMuted, marginTop: 9 }}>Choose your worship goal and the apps that stay out of reach until you finish it.</Text>

        {loading ? (
          <View style={{ marginTop: 18, gap: 12 }}>
            <SkeletonBlock width="100%" height={162} radius={24} />
            <SkeletonBlock width="100%" height={150} radius={24} />
          </View>
        ) : (
          <>
            <View style={{ marginTop: 18 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkSecondary, marginBottom: 10 }}>Worship goal</Text>
              {openGoals.length === 0 ? (
                <EmptyState
                  icon={<PlusIcon />}
                  title="No open goals yet"
                  subtitle="Create an Adhkar goal to link this session to — finishing it is what unlocks your blocked apps."
                  actionLabel="Create goal"
                  onAction={nav.goalNew}
                />
              ) : (
                <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                  {openGoals.map((g, i) => {
                    const selected = g.id === selectedGoalId;
                    return (
                      <PressableScale
                        key={g.id}
                        onPress={() => setSelectedGoalId(g.id)}
                        scaleTo={1}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${g.title}, target ${g.target}`}
                        style={{
                          padding: 18,
                          borderBottomWidth: i === openGoals.length - 1 ? 0 : 1,
                          borderColor: colors.cardBorder,
                          minHeight: 52,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: selected ? colors.primaryTint : 'transparent',
                        }}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }} numberOfLines={1}>
                            {g.title}
                          </Text>
                          <Text style={{ fontSize: 12.5, color: colors.inkMuted, marginTop: 4 }}>Target {g.target}</Text>
                        </View>
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: selected ? 0 : 1.5,
                            borderColor: colors.cardBorderStrong,
                            backgroundColor: selected ? colors.primary : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {selected && <CheckIcon size={11} color="#fff" />}
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ marginTop: 18, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
              <PressableScale
                onPress={onCycleDuration}
                disabled={busy}
                scaleTo={1}
                accessibilityRole="button"
                accessibilityLabel={`Focus duration, ${FOCUS_DURATIONS[durationIndex]}. Double tap to change.`}
                style={{ padding: 18, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: busy ? 0.6 : 1 }}
              >
                <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }}>Focus duration</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14, color: colors.inkMuted }}>{FOCUS_DURATIONS[durationIndex]}</Text>
                  <ChevronRightIcon />
                </View>
              </PressableScale>
            </View>

            <View style={{ marginTop: 12, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }}>Apps to restrict</Text>
                <Text style={{ fontSize: 14, color: colors.inkMuted }}>{platformApps.length} selected</Text>
              </View>

              {!BLOCKING_SUPPORTED && (
                <Text style={{ fontSize: 12.5, lineHeight: 19, color: colors.inkMuted, marginTop: 10 }}>
                  App blocking isn’t available on this device yet. You can still pick a worship goal — restricting apps will turn on once support lands here.
                </Text>
              )}

              {platformApps.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
                  {platformApps.map((a) => (
                    <View
                      key={a.id}
                      style={{
                        backgroundColor: colors.primaryTint,
                        borderWidth: 1,
                        borderColor: 'rgba(61,115,201,0.35)',
                        paddingVertical: 9,
                        paddingLeft: 12,
                        paddingRight: 8,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.primary }} numberOfLines={1}>
                        {a.displayName ?? (Platform.OS === 'ios' ? 'Restricted app' : a.appIdentifier)}
                      </Text>
                      <PressableScale
                        onPress={() => onRemoveApp(a)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${a.displayName ?? 'this app'} from restricted apps`}
                        scaleTo={0.85}
                        style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, lineHeight: 14 }}>×</Text>
                      </PressableScale>
                    </View>
                  ))}
                </View>
              )}

              <SecondaryButton
                label={pickingApps ? 'Opening picker…' : 'Choose apps'}
                onPress={onPickApps}
                style={{ marginTop: 14, alignSelf: 'flex-start', opacity: !BLOCKING_SUPPORTED || pickingApps ? 0.5 : 1 }}
              />

              <Text style={{ fontSize: 12, lineHeight: 18, color: colors.inkSecondary, marginTop: 10 }}>
                {Platform.OS === 'ios'
                  ? 'Apple’s picker keeps app names private from every app, including this one — restricted apps show as “Restricted app” but blocking still works.'
                  : 'Shows your installed apps by name so you know exactly what you’re restricting.'}
              </Text>
            </View>

            <View style={{ marginTop: 12, borderRadius: 24, padding: 20, backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: 'rgba(61,115,201,0.2)' }}>
              <Text style={{ fontSize: 12.5, lineHeight: 20, color: '#3A5A7E' }}>
                Calls, messages and emergency services remain available on both platforms. An “Emergency unlock” is always one tap away once a session starts.
              </Text>
            </View>
          </>
        )}

        <PrimaryButton label="Activate Ibadah Lock" onPress={onActivate} disabled={loading || !selectedGoal} style={{ marginTop: 16 }} />
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
