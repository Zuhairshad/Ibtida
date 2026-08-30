import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/AuthContext';
import { getNotificationSettings } from '../../services/settings';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import EmptyState from '../../components/EmptyState';
import { RowSkeleton } from '../../components/Skeleton';
import { ChevronLeftIcon, BellIcon, PrayerIcon, AdhkarIcon, BeadsIcon, CommunityIcon, WarningIcon } from '../../theme/icons';

// §24 — contextual, non-nagging notifications. Copy stays encouraging and
// never guilt-trips ("Your evening adhkar are ready", not "You haven't used
// Ibadah today!!!").
const ITEMS = [
  { cat: 'Prayer', title: 'Asr is in 25 minutes', body: 'Lahore · 3:40 pm', when: 'now', icon: PrayerIcon, tint: colors.asr.tint, ink: colors.asr.ink, go: nav.prayer },
  { cat: 'Adhkar', title: 'Your evening adhkar are ready', body: '20 adhkar · about 8 minutes', when: '2h', icon: AdhkarIcon, tint: colors.goldTint, ink: colors.goldInk, go: nav.adhkar },
  { cat: 'Goals', title: 'Durood Sharif — 33 of 100 today', body: 'Continue where you left off.', when: '5h', icon: BeadsIcon, tint: colors.successTint, ink: '#3B7A52', go: nav.tasbeeh },
  { cat: 'Community', title: '10 Million Durood reached 64.8%', body: 'Milestone reached together.', when: '1d', icon: CommunityIcon, tint: colors.primaryTint, ink: '#2F5CA3', go: () => nav.communityGoal(0) },
];

type LoadState = 'loading' | 'error' | 'ready';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    getNotificationSettings(user.id)
      .then((result) => {
        if (!mounted) return;
        setNotifications(result);
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

  // Respect the per-category switches set in Privacy — a disabled category
  // genuinely stops delivering, it isn't just a cosmetic value.
  const visible = ITEMS.filter((i) => notifications[i.cat]);

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale onPress={nav.back} scaleTo={1} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <ChevronLeftIcon color={colors.inkMuted} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Back</Text>
        </PressableScale>
        <PressableScale onPress={nav.privacy} scaleTo={1} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Settings</Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Notifications</Text>
        <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 9, lineHeight: 20, marginBottom: 18 }}>Only the categories you turned on in Privacy.</Text>

        {loadState === 'loading' ? (
          <RowSkeleton rows={4} />
        ) : loadState === 'error' ? (
          <EmptyState
            icon={<WarningIcon size={22} color={colors.inkMuted} />}
            title="Couldn’t load notifications"
            subtitle="Check your connection and try again."
            actionLabel="Retry"
            onAction={load}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<BellIcon size={22} color={colors.inkMuted} />}
            title="No notifications"
            subtitle="Every category is switched off. Turn one on in Privacy to hear from Ibadah."
            actionLabel="Open Privacy"
            onAction={nav.privacy}
          />
        ) : (
          <View style={{ gap: 8 }}>
            {visible.map((n) => (
              <PressableScale
                key={n.title}
                onPress={n.go}
                scaleTo={0.985}
                accessibilityRole="button"
                accessibilityLabel={`${n.title}. ${n.body}`}
                style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, padding: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'flex-start', gap: 13 }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: n.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <n.icon size={19} color={n.ink} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong }}>{n.title}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 5, lineHeight: 18 }}>{n.body}</Text>
                </View>
                <Text style={{ fontSize: 11.5, color: colors.inkSecondary }}>{n.when}</Text>
              </PressableScale>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenFade>
  );
}
