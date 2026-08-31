import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/AuthContext';
import { getProfile, getPrivacySettings, type Profile } from '../../services/settings';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing } from '../../theme/tokens';
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

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    Promise.all([getProfile(user.id), getPrivacySettings(user.id)])
      .then(([profileResult, privacyResult]) => {
        if (!mounted) return;
        setProfile(profileResult);
        setPrivacy(privacyResult);
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
    { label: 'Goals', value: '2 active', go: nav.goals },
    { label: 'Bookmarks', value: '14', go: nav.quran },
    { label: 'History', value: 'All time', go: nav.progress },
    { label: 'Circles', value: '2', go: nav.circles },
    { label: 'Settings', value: 'MWL · Hanafi', go: nav.privacy },
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
          title="Couldn’t load your profile"
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
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '600', color: colors.ink }}>{initial}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink, letterSpacing: -0.02 }} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={{ fontSize: 13, color: colors.inkSecondary, marginTop: 8 }} numberOfLines={1}>
              {user?.email ?? `${profileVisibility} profile`}
            </Text>
          </View>
        </RiseIn>

        <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, ...shadow.card }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary }}>Today’s consistency</Text>
              <Text style={{ fontSize: 24, fontWeight: '600', color: colors.ink, letterSpacing: -0.025, marginTop: 11 }}>7 day streak</Text>
            </View>
            <ProgressRing size={56} strokeWidth={5} progress={0.8} trackColor={colors.primaryTint} color={colors.success}>
              <Text style={{ fontSize: 13, fontWeight: '600' }}>80%</Text>
            </ProgressRing>
          </View>
        </RiseIn>

        <RiseIn delay={100} style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, backgroundColor: colors.card, ...shadow.card }}>
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
                <Text style={{ fontSize: 15.5, fontWeight: '500', color: colors.ink }}>{row.label}</Text>
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
            style={{ minHeight: 48, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.pill, backgroundColor: colors.card, padding: 15, alignItems: 'center', justifyContent: 'center' }}
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
              borderColor: colors.danger,
              borderRadius: radii.button,
              backgroundColor: colors.card,
              padding: 15,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: signingOut ? 0.6 : 1,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.danger }}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </PressableScale>
        </RiseIn>
      </ScrollView>

      <ConfirmSheet
        visible={confirmSignOut}
        title="Sign out?"
        body="You’ll need to sign back in to see your prayers, goals and counts."
        confirmLabel="Sign out"
        destructive
        onConfirm={onSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </View>
  );
}
