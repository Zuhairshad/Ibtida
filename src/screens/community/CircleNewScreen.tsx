import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';

// §17 Circles are private groups. Permissions default to the most private
// option and are chosen explicitly, never assumed.
const PRIVACY_LEVELS = [
  { label: 'Invite only', sub: 'People you invite by link' },
  { label: 'Private', sub: 'Hidden — you add members yourself' },
  { label: 'Friends', sub: 'People you already share circles with' },
];

const GOAL_TEMPLATES = ['Fajr together this month', 'One juz a week', '100 durood a day', 'Morning adhkar streak'];

export default function CircleNewScreen() {
  const { addCircle } = useAppState();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState(0);
  const [goal, setGoal] = useState(0);

  const canCreate = name.trim().length > 1;

  const onCreate = () => {
    if (!canCreate) return;
    addCircle(name.trim());
    nav.circles();
  };

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SecondaryButton label="Cancel" onPress={nav.back} style={{ alignSelf: 'flex-start' }} />
        <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, marginTop: 12 }}>New circle</Text>
        <Text style={{ fontSize: 14, lineHeight: 22, color: colors.inkMuted, marginTop: 8, marginBottom: 20 }}>A small private group — family, friends, a Ramadan or Quran group.</Text>

        <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary }}>Circle name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Rahman family"
              placeholderTextColor="#A8AEB4"
              accessibilityLabel="Circle name"
              style={{ fontSize: 17, fontWeight: '500', color: colors.inkStrong, marginTop: 9, padding: 0, minHeight: 24 }}
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
                      borderColor: on ? 'rgba(61,115,201,0.4)' : 'rgba(23,32,28,0.09)',
                      backgroundColor: on ? colors.primaryTint : '#FFFFFF',
                      borderRadius: 14,
                      padding: 14,
                      minHeight: 48,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong }}>{p.label}</Text>
                      <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 4 }}>{p.sub}</Text>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: on ? 6.5 : 1.5,
                        borderColor: on ? colors.primary : 'rgba(23,32,28,0.2)',
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
                    style={{ backgroundColor: on ? colors.primary : colors.bgTint, paddingVertical: 10, paddingHorizontal: 13, borderRadius: 12, minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: on ? '600' : '500', color: on ? '#FFFFFF' : colors.inkMuted }}>{g}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </View>

        <View style={{ marginTop: 12, borderRadius: 22, padding: 17, backgroundColor: colors.bgTint }}>
          <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkMuted }}>
            Members see the circle’s shared progress, never each other’s individual worship history.
          </Text>
        </View>

        <PrimaryButton label="Create circle" onPress={onCreate} disabled={!canCreate} style={{ marginTop: 16 }} />
        {!canCreate && <Text style={{ fontSize: 12, color: colors.inkSecondary, textAlign: 'center', marginTop: 10 }}>Give your circle a name to continue.</Text>}
      </ScrollView>
    </ScreenFade>
  );
}
