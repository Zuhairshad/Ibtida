import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/AuthContext';
import { createGoal } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import Toggle from '../../components/Toggle';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import Toast from '../../components/Toast';

const FREQS = ['Every day', 'Weekdays', 'Custom'];

// `range` (0=Today/1=Week/2=Month/3=Year, see supabase/migrations/0003_adhkar.sql)
// has no picker in this form — the prototype only ever created "daily
// target" goals — so every goal created here is stored range=0 ("Today").
// Left as a documented simplification rather than adding a new selector UI.
const DEFAULT_RANGE = 0;

export default function GoalNewScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  // In-progress form state, local until "Create goal" is pressed — nothing
  // here is persisted domain data on its own.
  const [target, setTarget] = useState(100);
  const [freq, setFreq] = useState(0);
  const [reminderOn, setReminderOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const targetUp = () => setTarget((t) => t + 10);
  const targetDown = () => setTarget((t) => Math.max(t - 10, 10));

  const onCreate = async () => {
    if (!user) {
      setToast('You need to be signed in to create a goal.');
      return;
    }
    setSaving(true);
    try {
      await createGoal(user.id, 'Durood Sharif', target, freq, DEFAULT_RANGE);
      nav.goals();
    } catch {
      setToast('Could not create your goal. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
      <SecondaryButton label="Cancel" onPress={nav.back} style={{ alignSelf: 'flex-start', marginBottom: 6 }} />
      <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Create goal</Text>
      <Text style={{ fontSize: 14, color: colors.inkMuted, marginTop: 6, marginBottom: 20 }}>What would you like to recite?</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary }}>Dhikr</Text>
            <Text style={{ fontSize: 17, fontWeight: '500', color: colors.inkStrong, marginTop: 9 }}>Durood Sharif</Text>
            <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 7 }}>Arabic, translation and reference attach from the library</Text>
          </View>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary }}>Daily target</Text>
              <Text style={{ fontSize: 17, fontWeight: '500', color: colors.inkStrong, marginTop: 9 }}>{target}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <PressableScale onPress={targetDown} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Decrease daily target" style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(23,32,28,0.1)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 19, color: colors.inkMuted }}>−</Text>
              </PressableScale>
              <PressableScale onPress={targetUp} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Increase daily target" style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(23,32,28,0.1)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 19, color: colors.inkMuted }}>+</Text>
              </PressableScale>
            </View>
          </View>
          <View style={{ padding: 18, borderBottomWidth: 1, borderColor: colors.cardBorder }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary, marginBottom: 12 }}>Repeat</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FREQS.map((label, i) => {
                const on = freq === i;
                return (
                  <PressableScale
                    key={label}
                    onPress={() => setFreq(i)}
                    scaleTo={1}
                    style={{ flex: 1, minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: on ? colors.primary : '#FFFFFF', borderWidth: on ? 0 : 1, borderColor: 'rgba(23,32,28,0.1)', alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: on ? '600' : '500', color: on ? '#FFFFFF' : colors.inkMuted }}>{label}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
          <PressableScale
            onPress={() => setReminderOn((v) => !v)}
            scaleTo={1}
            accessibilityRole="switch"
            accessibilityState={{ checked: reminderOn }}
            accessibilityLabel="Daily reminder at 8:00 PM"
            style={{ padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52 }}
          >
            <View>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary }}>Reminder</Text>
              <Text style={{ fontSize: 17, fontWeight: '500', color: reminderOn ? colors.inkStrong : colors.inkSecondary, marginTop: 9 }}>
                {reminderOn ? '8:00 PM' : 'Off'}
              </Text>
            </View>
            <Toggle on={reminderOn} />
          </PressableScale>
        </View>

        <View style={{ marginTop: 12, borderRadius: 22, padding: 17, backgroundColor: colors.bgTint }}>
          <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkMuted }}>Private by default. Nothing about this goal leaves the device unless you attach it to a community goal.</Text>
        </View>
      </ScrollView>

      <PrimaryButton label="Create goal" onPress={onCreate} loading={saving} style={{ marginTop: 16 }} />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
