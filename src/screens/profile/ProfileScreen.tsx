import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/AuthContext';
import { getProfile, getPrivacySettings, type Profile } from '../../services/settings';
import { getPrayerCalcSettings } from '../../services/prayerSettings';
import { supabase } from '../../lib/supabase';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import { SkeletonBlock } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import ConfirmSheet from '../../components/ConfirmSheet';
import { ChevronRightIcon, WarningIcon } from '../../theme/icons';

type LoadState = 'loading' | 'error' | 'ready';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [profile, setProfile] = useState<Profile>({ displayName: null, avatarUrl: null });
  const [privacy, setPrivacy] = useState<Record<string, string>>({});
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [activeGoalsCount, setActiveGoalsCount] = useState<number | null>(null);
  const [bookmarksCount, setBookmarksCount] = useState<number | null>(null);
  const [circlesCount, setCirclesCount] = useState<number | null>(null);
  const [prayerStreak, setPrayerStreak] = useState<number | null>(null);
  const [prayerConsistency, setPrayerConsistency] = useState<number | null>(null);
  const [calcSettingsLabel, setCalcSettingsLabel] = useState('Settings');

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    Promise.all([getProfile(user.id), getPrivacySettings(user.id), getPrayerCalcSettings(user.id)])
      .then(([profileResult, privacyResult, calcSettings]) => {
        if (!mounted) return;
        setProfile(profileResult);
        setPrivacy(privacyResult);
        if (calcSettings) {
          const methodAbbr: Record<string, string> = {
            MuslimWorldLeague: 'MWL', Egyptian: 'Egyptian', Karachi: 'Karachi',
            UmmAlQura: 'UmmAlQura', Dubai: 'Dubai', MoonsightingCommittee: 'Moonsighting',
            NorthAmerica: 'ISNA', Kuwait: 'Kuwait', Qatar: 'Qatar',
            Singapore: 'Singapore', Tehran: 'Tehran', Turkey: 'Turkey',
          };
          setCalcSettingsLabel(`${methodAbbr[calcSettings.calculationMethod] ?? calcSettings.calculationMethod} · ${calcSettings.madhab}`);
        }
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

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const fromDate = sevenDaysAgo.toISOString().slice(0, 10);

    Promise.all([
      supabase.from('adhkar_goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('completed_at', null),
      supabase.from('quran_bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('circle_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('prayer_logs').select('log_date').eq('user_id', user.id).eq('done', true).gte('log_date', fromDate),
    ]).then(([goalsRes, bookmarksRes, circlesRes, logsRes]) => {
      if (!mounted) return;
      if (goalsRes.count !== null) setActiveGoalsCount(goalsRes.count);
      if (bookmarksRes.count !== null) setBookmarksCount(bookmarksRes.count);
      if (circlesRes.count !== null) setCirclesCount(circlesRes.count);
      if (logsRes.data) {
        const distinctDays = new Set(logsRes.data.map((r: { log_date: string }) => r.log_date)).size;
        setPrayerStreak(distinctDays);
        const pct = Math.round((logsRes.data.length / 35) * 100);
        setPrayerConsistency(Math.min(100, pct));
      }
    }).catch(() => {
      // Stats remain null (showing '—') on error
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

  const onSignOut = async () => {
    setConfirmSignOut(false);
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const displayName = profile.displayName || user?.email?.split('@')[0] || 'Ibtida user';
  const initial = displayName.charAt(0).toUpperCase();
  const profileVisibility = privacy['Profile visibility'] ?? 'Private';

  const ROWS: { label: string; value: string; go: () => void }[] = [
    { label: 'Goals', value: activeGoalsCount === null ? '—' : `${activeGoalsCount} active`, go: nav.goals },
    { label: 'Bookmarks', value: bookmarksCount === null ? '—' : String(bookmarksCount), go: nav.quran },
    { label: 'History', value: 'All time', go: nav.progress },
    { label: 'Circles', value: circlesCount === null ? '—' : String(circlesCount), go: nav.circles },
    { label: 'Settings', value: calcSettingsLabel, go: nav.privacy },
    { label: 'Privacy', value: profileVisibility, go: nav.privacy },
    { label: 'Emergency unlock history', value: 'Ibadah Lock', go: nav.emergencyHistory },
  ];

  if (loadState === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <SkeletonBlock width={62} height={62} radius={31} />
          <View style={{ gap: 9 }}>
            <SkeletonBlock width={140} height={19} />
            <SkeletonBlock width={100} height={13} />
          </View>
        </View>
        <SkeletonBlock width="100%" height={92} radius={24} style={{ marginTop: 20 }} />
        <SkeletonBlock width="100%" height={220} radius={24} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (loadState === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 16, paddingHorizontal: 24, justifyContent: 'center' }}>
        <EmptyState
          icon={<WarningIcon size={22} color={colors.inkMuted} />}
          title="Couldn't load your profile"
          subtitle="Check your connection and try again."
          actionLabel="Retry"
          onAction={load}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: colors.bgTint, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '600', color: colors.inkStrong }}>{initial}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 19, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.02 }} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={{ fontSize: 13, color: colors.inkSecondary, marginTop: 8 }} numberOfLines={1}>
              {user?.email ?? `${profileVisibility} profile`}
            </Text>
          </View>
        </RiseIn>

        <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Last 7 days</Text>
              <Text style={{ fontSize: 24, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 11 }}>
                {prayerStreak === null ? '—' : `${prayerStreak} day streak`}
              </Text>
            </View>
            <ProgressRing
              size={56}
              strokeWidth={5}
              progress={prayerConsistency === null ? 0 : prayerConsistency / 100}
              trackColor={colors.bgTint}
              color={colors.success}
            >
              <Text style={{ fontSize: 13, fontWeight: '600' }}>
                {prayerConsistency === null ? '—' : `${prayerConsistency}%`}
              </Text>
            </ProgressRing>
          </View>
        </RiseIn>

        <RiseIn delay={100} style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            {ROWS.map((row, i) => (
              <PressableScale
                key={row.label}
                onPress={row.go}
                scaleTo={1}
                style={{
                  minHeight: 52,
                  borderBottomWidth: i === ROWS.length - 1 ? 0 : 1,
                  borderColor: colors.divider,
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.inkStrong }}>{row.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.inkSecondary }}>{row.value}</Text>
                  <ChevronRightIcon />
                </View>
              </PressableScale>
            ))}
          </View>
        </RiseIn>

        <RiseIn delay={140} style={{ paddingHorizontal: 24, marginTop: 16, gap: 8 }}>
          <PressableScale
            onPress={nav.error}
            scaleTo={1}
            style={{ minHeight: 48, borderWidth: 1, borderColor: 'rgba(23,32,28,0.09)', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 15, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>See offline & error states</Text>
          </PressableScale>

          <PressableScale
            onPress={() => setConfirmSignOut(true)}
            accessibilityRole="button"
            scaleTo={0.99}
            disabled={signingOut}
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: 'rgba(201,107,107,0.3)',
              borderRadius: 16,
              backgroundColor: '#FFFFFF',
              padding: 15,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: signingOut ? 0.6 : 1,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.dangerInk }}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </PressableScale>
        </RiseIn>
      </ScrollView>

      <ConfirmSheet
        visible={confirmSignOut}
        title="Sign out?"
        body="You'll need to sign back in to see your prayers, goals and counts."
        confirmLabel="Sign out"
        destructive
        onConfirm={onSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </View>
  );
}
