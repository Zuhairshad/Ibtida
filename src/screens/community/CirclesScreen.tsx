import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { listMyCircles, joinCircleByCode, MyCircle } from '../../services/community';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import { RowSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import { ChevronLeftIcon, ChevronRightIcon, CommunityIcon } from '../../theme/icons';

export default function CirclesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [circles, setCircles] = useState<MyCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
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
      return () => { active = false; };
    }, [user])
  );

  const onJoinByCode = async () => {
    if (!user || !joinCode.trim() || joining) return;
    setJoining(true);
    try {
      const { circleId, circleName } = await joinCircleByCode(user.id, joinCode.trim());
      setJoinCode('');
      setToast(`Joined "${circleName}"!`);
      const updated = await listMyCircles(user.id);
      setCircles(updated);
      setTimeout(() => nav.circleDetail(circleId), 800);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Invalid invite code — check and try again.');
    } finally {
      setJoining(false);
    }
  };

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
            style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.1)', backgroundColor: '#FFFFFF', borderRadius: 12, minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkStrong }}>New circle</Text>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={60} style={{ paddingHorizontal: 24, marginTop: 14 }}>
          <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Circles</Text>
          <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 9, lineHeight: 20 }}>Private groups. Invite only unless you change it.</Text>
        </RiseIn>

        {/* Join by invite code */}
        <RiseIn delay={90} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 22, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderColor: colors.cardBorder }}>
              <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.09, color: colors.inkSecondary, marginBottom: 10 }}>
                Join with invite link or code
              </Text>
              <TextInput
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder="Paste invite link or code here…"
                placeholderTextColor="#A8AEB4"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ fontSize: 15, color: colors.inkStrong, padding: 0 }}
              />
            </View>
            <PressableScale
              onPress={onJoinByCode}
              disabled={!joinCode.trim() || joining}
              scaleTo={0.985}
              style={{ padding: 16, alignItems: 'center', opacity: !joinCode.trim() || joining ? 0.5 : 1 }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary }}>
                {joining ? 'Joining\u2026' : 'Join circle'}
              </Text>
            </PressableScale>
          </View>
        </RiseIn>

        {/* My circles */}
        <RiseIn delay={120} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.09, color: colors.inkSecondary, marginBottom: 12 }}>
            My circles
          </Text>
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
                <PressableScale
                  key={c.id}
                  scaleTo={0.985}
                  onPress={() => nav.circleDetail(c.id)}
                  style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.inkStrong }}>{c.name}</Text>
                      <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 6 }}>
                        {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'} · {c.privacy}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {c.role === 'owner' && (
                        <View style={{ backgroundColor: colors.bgTint, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkStrong }}>Owner</Text>
                        </View>
                      )}
                      <ChevronRightIcon color={colors.inkMuted} />
                    </View>
                  </View>
                </PressableScale>
              ))}
            </View>
          )}
        </RiseIn>
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
