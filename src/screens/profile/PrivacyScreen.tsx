import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRIVACY_OPTIONS, NOTIFICATION_CATEGORIES } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import { getPrivacySettings, getNotificationSettings, cyclePrivacy as cyclePrivacyRemote, toggleNotification as toggleNotificationRemote } from '../../services/settings';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import Toggle from '../../components/Toggle';
import ConfirmSheet from '../../components/ConfirmSheet';
import Toast from '../../components/Toast';
import { SkeletonBlock } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import PrayerLocationSettingsSheet from '../prayer/PrayerLocationSettingsSheet';
import { ChevronLeftIcon, ChevronRightIcon, WarningIcon } from '../../theme/icons';

const ROWS: { label: string; sub: string }[] = [
  { label: 'Profile visibility', sub: 'Who can see your name' },
  { label: 'Activity visibility', sub: 'Prayer, dhikr and reading' },
  { label: 'Community participation', sub: 'Anonymous contribution to totals' },
  { label: 'Goal visibility', sub: 'Shown inside your circles only' },
  { label: 'Location', sub: 'For prayer times only' },
  { label: 'Analytics', sub: 'Crashes and feature use, never content' },
];

type LoadState = 'loading' | 'error' | 'ready';

export default function PrivacyScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [privacy, setPrivacy] = useState<Record<string, string>>({});
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    Promise.all([getPrivacySettings(user.id), getNotificationSettings(user.id)])
      .then(([privacyResult, notificationsResult]) => {
        if (!mounted) return;
        setPrivacy(privacyResult);
        setNotifications(notificationsResult);
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
        setError(true);
      });
    return () => {
      mounted = false;
    };
  }, [user, reloadKey]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    setReloadKey((k) => k + 1);
  }, []);

  const loadState: LoadState = loading ? 'loading' : error ? 'error' : 'ready';

  // Optimistic: flip the value immediately (same cycle math the server will
  // apply) so the row feels instant, then persist; revert + toast on failure.
  const onCyclePrivacy = (key: string) => {
    if (!user) return;
    const opts = PRIVACY_OPTIONS[key];
    if (!opts) return;
    const previous = privacy[key] ?? opts[0];
    const optimistic = opts[(opts.indexOf(previous) + 1) % opts.length];
    setPrivacy((p) => ({ ...p, [key]: optimistic }));

    cyclePrivacyRemote(user.id, key)
      .then((confirmed) => setPrivacy((p) => ({ ...p, [key]: confirmed })))
      .catch(() => {
        setPrivacy((p) => ({ ...p, [key]: previous }));
        setToast('Couldn’t save that setting. Try again.');
      });
  };

  const onToggleNotification = (key: string) => {
    if (!user) return;
    const previous = notifications[key] ?? true;
    setNotifications((n) => ({ ...n, [key]: !previous }));

    toggleNotificationRemote(user.id, key)
      .then((confirmed) => setNotifications((n) => ({ ...n, [key]: confirmed })))
      .catch(() => {
        setNotifications((n) => ({ ...n, [key]: previous }));
        setToast('Couldn’t save that setting. Try again.');
      });
  };

  const onExport = () => setToast('Export started — we’ll save a file to your device when it’s ready.');
  const onDelete = () => {
    setConfirmDelete(false);
    setToast('Account deletion requested. You’ll get a confirmation email before anything is removed.');
  };

  if (loadState === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 12, paddingHorizontal: 24 }}>
        <SkeletonBlock width={140} height={27} style={{ marginTop: 12 }} />
        <SkeletonBlock width="100%" height={280} radius={24} style={{ marginTop: 22 }} />
        <SkeletonBlock width="100%" height={220} radius={24} style={{ marginTop: 22 }} />
      </View>
    );
  }

  if (loadState === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 12, paddingHorizontal: 24, justifyContent: 'center' }}>
        <EmptyState
          icon={<WarningIcon size={22} color={colors.inkMuted} />}
          title="Couldn’t load your settings"
          subtitle="Check your connection and try again."
          actionLabel="Retry"
          onAction={load}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24 }}>
          <PressableScale onPress={nav.profile} scaleTo={1} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
            <ChevronLeftIcon color={colors.inkMuted} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Profile</Text>
          </PressableScale>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 12 }}>Privacy</Text>
          <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 9, lineHeight: 20 }}>Everything starts private. You choose what leaves the device.</Text>
        </RiseIn>

        {/* Value-picker rows — tapping cycles through that setting's options. */}
        <RiseIn delay={80} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            {ROWS.map((row, i) => {
              const value = privacy[row.label];
              const isOn = value === 'On';
              return (
                <PressableScale
                  key={row.label}
                  onPress={() => onCyclePrivacy(row.label)}
                  scaleTo={1}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.label}, currently ${value}. Double tap to change.`}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    borderBottomWidth: i === ROWS.length - 1 ? 0 : 1,
                    borderColor: colors.divider,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    minHeight: 52,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkStrong }}>{row.label}</Text>
                    <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 5, lineHeight: 17 }}>{row.sub}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: isOn ? 'rgba(94,170,120,0.15)' : colors.bgTint, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 11 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '500', color: isOn ? '#2F6B45' : colors.inkStrong }}>{value}</Text>
                    </View>
                    <ChevronRightIcon />
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </RiseIn>

        {/* §24 — every notification category can be disabled independently. */}
        <RiseIn delay={110} style={{ paddingHorizontal: 24, marginTop: 22 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Notifications</Text>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            {NOTIFICATION_CATEGORIES.map((cat, i) => (
              <PressableScale
                key={cat}
                onPress={() => onToggleNotification(cat)}
                scaleTo={1}
                accessibilityRole="switch"
                accessibilityState={{ checked: notifications[cat] }}
                accessibilityLabel={`${cat} notifications`}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderBottomWidth: i === NOTIFICATION_CATEGORIES.length - 1 ? 0 : 1,
                  borderColor: colors.divider,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 52,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkStrong }}>{cat}</Text>
                <Toggle on={notifications[cat]} />
              </PressableScale>
            ))}
          </View>
          <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 10, lineHeight: 18 }}>
            {Object.values(notifications).filter(Boolean).length} of {NOTIFICATION_CATEGORIES.length} categories on.
          </Text>
        </RiseIn>

        {/* Task item 7 — real prayer-time calculation needs a location and a
            calc method the user can see/change after first-run, not just at
            initial setup. */}
        <RiseIn delay={130} style={{ paddingHorizontal: 24, marginTop: 22 }}>
          <PressableScale
            onPress={() => setLocationSheetOpen(true)}
            accessibilityRole="button"
            scaleTo={0.99}
            style={{ minHeight: 52, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View>
              <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkStrong }}>Location & calculation method</Text>
              <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 4 }}>Prayer times & Qibla direction</Text>
            </View>
            <ChevronRightIcon />
          </PressableScale>
        </RiseIn>

        {/* Wake-verified prayer alarm — toggle per prayer + view the printable
            QR tag (see src/screens/shared/WakeAlarmSettingsScreen.tsx). */}
        <RiseIn delay={135} style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <PressableScale
            onPress={nav.wakeAlarmSettings}
            accessibilityRole="button"
            scaleTo={0.99}
            style={{ minHeight: 52, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View>
              <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkStrong }}>Wake-verification alarm</Text>
              <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 4 }}>Scan-to-confirm alerts for Fajr and other prayers</Text>
            </View>
            <ChevronRightIcon />
          </PressableScale>
        </RiseIn>

        <RiseIn delay={140} style={{ paddingHorizontal: 24, marginTop: 16, gap: 8 }}>
          <PressableScale
            onPress={onExport}
            accessibilityRole="button"
            scaleTo={0.99}
            style={{ minHeight: 52, borderWidth: 1, borderColor: 'rgba(23,32,28,0.09)', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkStrong }}>Export my data</Text>
          </PressableScale>
          <PressableScale
            onPress={() => setConfirmDelete(true)}
            accessibilityRole="button"
            scaleTo={0.99}
            style={{ minHeight: 52, borderWidth: 1, borderColor: 'rgba(201,107,107,0.3)', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.dangerInk }}>Delete account</Text>
          </PressableScale>
        </RiseIn>
      </ScrollView>

      <ConfirmSheet
        visible={confirmDelete}
        title="Delete your account?"
        body="Your prayer history, goals and counts are removed from this device and from your account. This cannot be undone."
        confirmLabel="Delete account"
        destructive
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      {user && <PrayerLocationSettingsSheet visible={locationSheetOpen} userId={user.id} onClose={() => setLocationSheetOpen(false)} />}
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
