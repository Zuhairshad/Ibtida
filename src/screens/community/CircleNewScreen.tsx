import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/AuthContext';
import { createCircle, CirclePrivacy } from '../../services/community';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow, type } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import Toast from '../../components/Toast';

// §17 Circles are private groups. Permissions default to the most private
// option and are chosen explicitly, never assumed.
const PRIVACY_LEVELS = [
  { label: 'Invite only', sub: 'People you invite by link' },
  { label: 'Private', sub: 'Hidden — you add members yourself' },
  { label: 'Friends', sub: 'People you already share circles with' },
];

const GOAL_TEMPLATES = ['Fajr together this month', 'One juz a week', '100 durood a day', 'Morning adhkar streak'];

export default function CircleNewScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState(0);
  const [goal, setGoal] = useState(0);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const canCreate = name.trim().length > 1;

  const onCreate = async () => {
    if (!canCreate || creating || !user) return;
    setCreating(true);
    try {
      await createCircle(user.id, name.trim(), PRIVACY_LEVELS[privacy].label as CirclePrivacy);
      nav.circles();
    } catch {
      setToast('Could not create your circle — try again.');
      setCreating(false);
    }
  };

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SecondaryButton label="Cancel" onPress={nav.back} style={{ alignSelf: 'flex-start' }} />
        <Text style={{ ...type.h1, color: colors.ink, marginTop: 12 }}>New circle</Text>
        <Text style={{ fontSize: 14, lineHeight: 22, color: colors.inkMuted, marginTop: 8, marginBottom: 20 }}>A small private group — family, friends, a Ramadan or Quran group.</Text>

        <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.card, backgroundColor: colors.card, ...shadow.card }}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary }}>Circle name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Rahman family"
              placeholderTextColor={colors.inkMuted}
              accessibilityLabel="Circle name"
              style={{ fontSize: 17, fontWeight: '500', color: colors.ink, marginTop: 9, padding: 0, minHeight: 24 }}
            />
          </View>

          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Who can join</Text>
            <View style={{ gap: 8 }}>
              {PRIVACY_LEVELS.map((p, i) => {
                const on = privacy === i;
                return (
                  <PressableScale
                    key={p.label}
                    onPress={() => setPrivacy(i)}
                    scaleTo={0.99}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={{
                      borderWidth: 1,
                      borderColor: on ? colors.primary : colors.cardBorder,
                      backgroundColor: on ? colors.primaryTint : colors.card,
                      borderRadius: radii.button,
                      padding: 14,
                      minHeight: 48,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{p.label}</Text>
                      <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 4 }}>{p.sub}</Text>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: on ? 6.5 : 1.5,
                        borderColor: on ? colors.primary : colors.inkMuted,
                      }}
                    />
                  </PressableScale>
                );
              })}
            </View>
          </View>

          <View style={{ padding: 18 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Shared goal</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GOAL_TEMPLATES.map((g, i) => {
                const on = goal === i;
                return (
                  <PressableScale
                    key={g}
                    onPress={() => setGoal(i)}
                    scaleTo={0.94}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={{
                      borderWidth: 1,
                      borderColor: on ? colors.primary : colors.cardBorder,
                      backgroundColor: on ? colors.primary : colors.card,
                      paddingVertical: 10,
                      paddingHorizontal: 13,
                      borderRadius: radii.pill,
                      minHeight: 44,
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: on ? '600' : '500', color: on ? colors.inkOnPrimary : colors.inkMuted }}>{g}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </View>

        <View style={{ marginTop: 12, borderRadius: radii.card, padding: 17, backgroundColor: colors.primaryTint }}>
          <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkMuted }}>
            Members see the circle’s shared progress, never each other’s individual worship history.
          </Text>
        </View>

        <PrimaryButton label="Create circle" onPress={onCreate} disabled={!canCreate} loading={creating} style={{ marginTop: 16 }} />
        {!canCreate && <Text style={{ fontSize: 12, color: colors.inkSecondary, textAlign: 'center', marginTop: 10 }}>Give your circle a name to continue.</Text>}
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
