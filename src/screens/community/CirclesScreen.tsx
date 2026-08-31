import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { listMyCircles, MyCircle } from '../../services/community';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, spacing, type } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import { RowSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import { ChevronLeftIcon, CommunityIcon } from '../../theme/icons';

export default function CirclesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [circles, setCircles] = useState<MyCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      listMyCircles(user.id)
        .then((c) => active && setCircles(c))
        .catch(() => active && setToast('Could not load your circles.'))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [user])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <PressableScale onPress={nav.community} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <ChevronLeftIcon color={colors.inkMuted} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Community</Text>
          </PressableScale>
          <PressableScale
            onPress={nav.circleNew}
            accessibilityRole="button"
            scaleTo={0.95}
            style={{ borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, borderRadius: radii.pill, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>New circle</Text>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 14 }}>
          <Text style={{ ...type.h1, color: colors.ink }}>Circles</Text>
          <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 9, lineHeight: 20 }}>Private groups. Invite only unless you change it.</Text>
        </RiseIn>

        <RiseIn delay={100} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          {loading ? (
            <RowSkeleton rows={2} />
          ) : circles.length === 0 ? (
            <EmptyState
              icon={<CommunityIcon />}
              title="No circles yet"
              subtitle="Start a small private group — family, friends, a Ramadan or Quran group."
              actionLabel="New circle"
              onAction={nav.circleNew}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {circles.map((c) => (
                <View key={c.id} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.card, ...shadow.card }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{c.name}</Text>
                      <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 6 }}>
                        {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'} · {c.privacy}
                      </Text>
                    </View>
                    {c.role === 'owner' && (
                      <View style={{ backgroundColor: colors.primaryTint, paddingVertical: 7, paddingHorizontal: 10, borderRadius: radii.pill }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink }}>Owner</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </RiseIn>
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
