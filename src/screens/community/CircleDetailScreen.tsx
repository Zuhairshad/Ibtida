import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../state/AuthContext';
import { CommunityStackParamList } from '../../navigation/types';
import {
  getCircleDetail,
  listCircleGoals,
  kickMember,
  deleteMembership,
  deleteCircle,
  createCircleGoal,
  updateCircle,
  regenerateInviteCode,
  contributeToCircleGoal,
  CircleDetail,
  CircleGoal,
  CirclePrivacy,
} from '../../services/community';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import { RowSkeleton } from '../../components/Skeleton';
import BottomSheetModal from '../../components/BottomSheetModal';
import Toast from '../../components/Toast';
import { ChevronLeftIcon } from '../../theme/icons';

type Props = NativeStackScreenProps<CommunityStackParamList, 'CircleDetail'>;

const AVATAR_COLORS = ['#4E8FE0', '#4CA96B', '#C9A96E', '#9B6FD4', '#E05E5E', '#5BB8D4'];
const PRIVACY_OPTIONS: { label: CirclePrivacy; sub: string }[] = [
  { label: 'Invite only', sub: 'Anyone with the link can join' },
  { label: 'Private', sub: 'Hidden — you add members yourself' },
  { label: 'Friends', sub: 'People you already share circles with' },
];

function avatarColor(userId: string) {
  let n = 0;
  for (let i = 0; i < userId.length; i++) n += userId.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function initials(displayName: string | null, userId: string): string {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : displayName.slice(0, 2).toUpperCase();
  }
  return userId.slice(0, 2).toUpperCase();
}

export default function CircleDetailScreen({ route }: Props) {
  const { circleId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [circle, setCircle] = useState<CircleDetail | null>(null);
  const [goals, setGoals] = useState<CircleGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Edit circle sheet
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrivacy, setEditPrivacy] = useState(0);
  const [saving, setSaving] = useState(false);

  // Add goal sheet
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('1000');
  const [goalUnit, setGoalUnit] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);

  // Contribute to goal sheet
  const [contributeGoal, setContributeGoal] = useState<CircleGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('1');
  const [contributing, setContributing] = useState(false);

  const [regenerating, setRegenerating] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const [c, g] = await Promise.all([getCircleDetail(circleId), listCircleGoals(circleId)]);
      setCircle(c);
      setGoals(g);
    } catch {
      setToast('Could not load circle.');
    }
  }, [circleId, user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      reload().finally(() => active && setLoading(false));
      return () => { active = false; };
    }, [reload])
  );

  const isOwner = circle?.createdBy === user?.id;
  const inviteLink = circle ? `https://ibtida.app/join/${circle.inviteCode}` : '';

  const onShare = async () => {
    try {
      await Share.share({
        message: `Join my circle "${circle?.name}" on Ibtida:\n${inviteLink}`,
        url: inviteLink,
      });
    } catch {}
  };

  const onCopyCode = async () => {
    try {
      await Share.share({ message: circle?.inviteCode ?? '' });
    } catch {}
  };

  const onRegenerateLink = () => {
    Alert.alert(
      'Reset invite link?',
      'The old link will stop working immediately. Anyone who hasn\'t joined yet will need the new link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset link',
          style: 'destructive',
          onPress: async () => {
            setRegenerating(true);
            try {
              const newCode = await regenerateInviteCode(circleId);
              setCircle((c) => c ? { ...c, inviteCode: newCode } : c);
              setToast('Invite link reset. The old link no longer works.');
            } catch {
              setToast('Could not reset invite link.');
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  };

  const openEdit = () => {
    if (!circle) return;
    setEditName(circle.name);
    setEditPrivacy(PRIVACY_OPTIONS.findIndex((p) => p.label === circle.privacy));
    setShowEdit(true);
  };

  const onSaveEdit = async () => {
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      await updateCircle(circleId, editName.trim(), PRIVACY_OPTIONS[editPrivacy].label);
      setCircle((c) => c ? { ...c, name: editName.trim(), privacy: PRIVACY_OPTIONS[editPrivacy].label } : c);
      setShowEdit(false);
      setToast('Circle updated.');
    } catch {
      setToast('Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const onKick = (targetUserId: string, targetName: string | null) => {
    Alert.alert('Remove member?', `${targetName ?? 'This member'} will no longer be part of this circle.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await kickMember(circleId, targetUserId);
            setCircle((c) => c ? { ...c, members: c.members.filter((m) => m.userId !== targetUserId) } : c);
          } catch {
            setToast('Could not remove member.');
          }
        },
      },
    ]);
  };

  const onLeave = () => {
    Alert.alert('Leave circle?', 'You will lose access to this circle and its goals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMembership(circleId, user!.id);
            nav.circles();
          } catch {
            setToast('Could not leave circle.');
          }
        },
      },
    ]);
  };

  const onDelete = () => {
    Alert.alert('Delete circle?', 'This permanently deletes the circle and all its goals for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCircle(circleId);
            nav.circles();
          } catch {
            setToast('Could not delete circle.');
          }
        },
      },
    ]);
  };

  const onAddGoal = async () => {
    if (!user || !goalName.trim() || addingGoal) return;
    const t = parseInt(goalTarget, 10);
    if (isNaN(t) || t <= 0) { setToast('Enter a valid target number.'); return; }
    setAddingGoal(true);
    try {
      await createCircleGoal(circleId, user.id, goalName.trim(), t, goalUnit.trim() || undefined);
      const updated = await listCircleGoals(circleId);
      setGoals(updated);
      setShowAddGoal(false);
      setGoalName(''); setGoalTarget('1000'); setGoalUnit('');
    } catch {
      setToast('Could not create goal.');
    } finally {
      setAddingGoal(false);
    }
  };

  const onContribute = async () => {
    if (!user || !contributeGoal || contributing) return;
    const amt = parseInt(contributeAmount, 10);
    if (isNaN(amt) || amt <= 0) { setToast('Enter a valid amount.'); return; }
    setContributing(true);
    try {
      await contributeToCircleGoal(contributeGoal.id, user.id, amt);
      setContributeGoal(null);
      setContributeAmount('1');
      setToast('Progress logged!');
      const updated = await listCircleGoals(circleId);
      setGoals(updated);
    } catch {
      setToast('Could not log progress.');
    } finally {
      setContributing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <RiseIn style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <PressableScale onPress={nav.circles} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ChevronLeftIcon color={colors.inkMuted} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>Circles</Text>
          </PressableScale>
          {isOwner && !loading && (
            <PressableScale
              onPress={openEdit}
              scaleTo={0.95}
              style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.1)', backgroundColor: '#FFFFFF', borderRadius: 12, minHeight: 40, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkStrong }}>Edit</Text>
            </PressableScale>
          )}
        </RiseIn>

        {loading ? (
          <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
            <RowSkeleton rows={5} />
          </View>
        ) : !circle ? null : (
          <>
            {/* Circle name + meta */}
            <RiseIn delay={40} style={{ paddingHorizontal: 24, marginTop: 10 }}>
              <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>{circle.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <View style={{ backgroundColor: colors.bgTint, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.inkStrong }}>{circle.privacy}</Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.inkSecondary }}>
                  {circle.members.length} {circle.members.length === 1 ? 'member' : 'members'}
                </Text>
                {isOwner && (
                  <View style={{ backgroundColor: colors.primaryTint, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Owner</Text>
                  </View>
                )}
              </View>
            </RiseIn>

            {/* Invite section */}
            <RiseIn delay={80} style={{ paddingHorizontal: 24, marginTop: 20 }}>
              <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 14 }}>
                  Invite friends & family
                </Text>
                <View style={{ backgroundColor: colors.bgTint, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, color: colors.inkSecondary, marginBottom: 4 }}>Invite link</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkStrong }} numberOfLines={1} ellipsizeMode="middle">
                    {inviteLink}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <PressableScale
                    onPress={onShare}
                    scaleTo={0.97}
                    style={{ flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Share invite</Text>
                  </PressableScale>
                  <PressableScale
                    onPress={onCopyCode}
                    scaleTo={0.97}
                    style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.inkStrong }}>Copy code</Text>
                  </PressableScale>
                </View>
                <Text style={{ fontSize: 12, color: colors.inkSecondary, lineHeight: 18 }}>
                  Share on WhatsApp, iMessage, or any app. Anyone with the link can join.
                </Text>
                {isOwner && (
                  <PressableScale
                    onPress={onRegenerateLink}
                    disabled={regenerating}
                    scaleTo={1}
                    style={{ marginTop: 12, alignSelf: 'flex-start' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.dangerInk, opacity: regenerating ? 0.5 : 1 }}>
                      {regenerating ? 'Resetting\u2026' : 'Reset invite link'}
                    </Text>
                  </PressableScale>
                )}
              </View>
            </RiseIn>

            {/* Members */}
            <RiseIn delay={120} style={{ paddingHorizontal: 24, marginTop: 16 }}>
              <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, backgroundColor: '#FFFFFF' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 4 }}>
                  Members
                </Text>
                {circle.members.map((m, idx) => {
                  const isSelf = m.userId === user?.id;
                  const name = isSelf ? 'You' : (m.displayName ?? `Member \u00B7\u00B7\u00B7${m.userId.slice(-4)}`);
                  const ini = isSelf ? (m.displayName ? initials(m.displayName, m.userId) : 'ME') : initials(m.displayName, m.userId);
                  return (
                    <View key={m.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: idx > 0 ? 1 : 0, borderColor: colors.divider }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isSelf ? colors.primary : avatarColor(m.userId), alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{ini}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong }}>{name}</Text>
                        <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 2 }}>{m.role === 'owner' ? 'Owner' : 'Member'}</Text>
                      </View>
                      {isOwner && !isSelf && (
                        <PressableScale
                          onPress={() => onKick(m.userId, m.displayName)}
                          scaleTo={0.9}
                          style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(201,107,107,0.1)' }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.dangerInk }}>Remove</Text>
                        </PressableScale>
                      )}
                    </View>
                  );
                })}
              </View>
            </RiseIn>

            {/* Goals */}
            <RiseIn delay={160} style={{ paddingHorizontal: 24, marginTop: 16 }}>
              <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: '#FFFFFF' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary }}>
                    Circle goals
                  </Text>
                  {isOwner && (
                    <PressableScale
                      onPress={() => setShowAddGoal(true)}
                      scaleTo={0.95}
                      style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.primaryTint }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>+ Add goal</Text>
                    </PressableScale>
                  )}
                </View>
                {goals.length === 0 ? (
                  <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 16, marginBottom: 8 }}>
                    No goals yet. {isOwner ? 'Add one for everyone to work toward together.' : 'The circle owner can add goals.'}
                  </Text>
                ) : (
                  goals.map((g, idx) => {
                    const pct = g.target > 0 ? Math.min(100, Math.round((g.totalProgress / g.target) * 100)) : 0;
                    return (
                      <View key={g.id} style={{ paddingVertical: 14, borderTopWidth: idx > 0 ? 1 : 0, borderColor: colors.divider }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong, flex: 1 }}>{g.name}</Text>
                          <PressableScale
                            onPress={() => { setContributeGoal(g); setContributeAmount('1'); }}
                            scaleTo={0.95}
                            style={{ backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Log</Text>
                          </PressableScale>
                        </View>
                        <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.bgTint, marginTop: 10, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${pct}%`, borderRadius: 3, backgroundColor: colors.primary }} />
                        </View>
                        <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 6 }}>
                          {g.totalProgress.toLocaleString()} / {g.target.toLocaleString()}{g.unit ? ` ${g.unit}` : ''} \u00B7 {pct}% \u00B7 {g.participantCount} {g.participantCount === 1 ? 'contributor' : 'contributors'}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            </RiseIn>

            {/* Leave / Delete */}
            <RiseIn delay={200} style={{ paddingHorizontal: 24, marginTop: 24 }}>
              {isOwner ? (
                <PressableScale onPress={onDelete} scaleTo={1} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.dangerInk }}>Delete circle</Text>
                </PressableScale>
              ) : (
                <PressableScale onPress={onLeave} scaleTo={1} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.dangerInk }}>Leave circle</Text>
                </PressableScale>
              )}
            </RiseIn>
          </>
        )}
      </ScrollView>

      {/* Edit circle sheet */}
      <BottomSheetModal visible={showEdit} onClose={() => setShowEdit(false)}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.inkStrong, marginBottom: 20 }}>Edit circle</Text>
        <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 18, backgroundColor: '#FFFFFF', overflow: 'hidden', marginBottom: 12 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.09, color: colors.inkSecondary, marginBottom: 8 }}>Circle name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={{ fontSize: 16, color: colors.inkStrong, padding: 0 }}
              autoFocus
            />
          </View>
        </View>
        <View style={{ gap: 8, marginBottom: 16 }}>
          {PRIVACY_OPTIONS.map((p, i) => {
            const on = editPrivacy === i;
            return (
              <PressableScale
                key={p.label}
                onPress={() => setEditPrivacy(i)}
                scaleTo={0.99}
                style={{
                  borderWidth: 1,
                  borderColor: on ? 'rgba(61,115,201,0.4)' : 'rgba(23,32,28,0.09)',
                  backgroundColor: on ? colors.primaryTint : '#FFFFFF',
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong }}>{p.label}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 3 }}>{p.sub}</Text>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 6.5 : 1.5, borderColor: on ? colors.primary : 'rgba(23,32,28,0.2)' }} />
              </PressableScale>
            );
          })}
        </View>
        <PrimaryButton label="Save changes" onPress={onSaveEdit} loading={saving} disabled={!editName.trim()} style={{ marginTop: 4 }} />
        <SecondaryButton label="Cancel" onPress={() => setShowEdit(false)} style={{ marginTop: 4 }} />
      </BottomSheetModal>

      {/* Add goal sheet */}
      <BottomSheetModal visible={showAddGoal} onClose={() => setShowAddGoal(false)}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.inkStrong, marginBottom: 20 }}>New circle goal</Text>
        <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 18, backgroundColor: '#FFFFFF', overflow: 'hidden', marginBottom: 12 }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.09, color: colors.inkSecondary, marginBottom: 8 }}>Goal name</Text>
            <TextInput
              value={goalName}
              onChangeText={setGoalName}
              placeholder="e.g. 1000 Durood Sharif"
              placeholderTextColor="#A8AEB4"
              style={{ fontSize: 16, color: colors.inkStrong, padding: 0 }}
            />
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, padding: 16, borderRightWidth: 1, borderColor: colors.cardBorder }}>
              <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.09, color: colors.inkSecondary, marginBottom: 8 }}>Target</Text>
              <TextInput
                value={goalTarget}
                onChangeText={setGoalTarget}
                keyboardType="number-pad"
                style={{ fontSize: 16, color: colors.inkStrong, padding: 0 }}
              />
            </View>
            <View style={{ flex: 1, padding: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.09, color: colors.inkSecondary, marginBottom: 8 }}>Unit (optional)</Text>
              <TextInput
                value={goalUnit}
                onChangeText={setGoalUnit}
                placeholder="recitations"
                placeholderTextColor="#A8AEB4"
                style={{ fontSize: 16, color: colors.inkStrong, padding: 0 }}
              />
            </View>
          </View>
        </View>
        <PrimaryButton label="Create goal" onPress={onAddGoal} loading={addingGoal} disabled={!goalName.trim()} style={{ marginTop: 8 }} />
        <SecondaryButton label="Cancel" onPress={() => setShowAddGoal(false)} style={{ marginTop: 4 }} />
      </BottomSheetModal>

      {/* Contribute to goal sheet */}
      <BottomSheetModal visible={!!contributeGoal} onClose={() => setContributeGoal(null)}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.inkStrong, marginBottom: 6 }}>
          {contributeGoal?.name ?? 'Log progress'}
        </Text>
        <Text style={{ fontSize: 14, color: colors.inkSecondary, marginBottom: 20 }}>
          Group total: {contributeGoal?.totalProgress.toLocaleString() ?? 0} / {contributeGoal?.target.toLocaleString() ?? 0}
          {contributeGoal?.unit ? ` ${contributeGoal.unit}` : ''}
        </Text>
        <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.09, color: colors.inkSecondary, marginBottom: 8 }}>
            How much did you do?
          </Text>
          <TextInput
            value={contributeAmount}
            onChangeText={setContributeAmount}
            keyboardType="number-pad"
            style={{ fontSize: 24, fontWeight: '600', color: colors.inkStrong, padding: 0 }}
            autoFocus
            selectTextOnFocus
          />
          {contributeGoal?.unit ? (
            <Text style={{ fontSize: 13, color: colors.inkSecondary, marginTop: 6 }}>{contributeGoal.unit}</Text>
          ) : null}
        </View>
        <PrimaryButton label="Log progress" onPress={onContribute} loading={contributing} disabled={!contributeAmount || parseInt(contributeAmount, 10) <= 0} style={{ marginTop: 4 }} />
        <SecondaryButton label="Cancel" onPress={() => setContributeGoal(null)} style={{ marginTop: 4 }} />
      </BottomSheetModal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
