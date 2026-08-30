import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import EmptyState from '../../components/EmptyState';
import { PlusIcon } from '../../theme/icons';
import { GOALS } from '../../state/adhkarData';

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View>
            <Text style={{ fontSize: 27, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025 }}>Goals</Text>
            <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 9, lineHeight: 20 }}>Two active. That is usually enough.</Text>
          </View>
          <PressableScale onPress={nav.goalNew} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 22, color: '#FFFFFF' }}>+</Text>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={80} style={{ paddingHorizontal: 24, marginTop: 18, gap: 10 }}>
          {GOALS.map((g) => (
            <View key={g.name} style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 24, padding: 20, backgroundColor: '#FFFFFF' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: colors.inkStrong }}>{g.name}</Text>
                  <Text style={{ fontSize: 13, color: colors.inkSecondary, marginTop: 6 }}>
                    {g.freq} · reminder {g.remind}
                  </Text>
                </View>
                <View style={{ backgroundColor: colors.bgTint, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: colors.inkStrong }}>{g.streak} days</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 16 }}>
                <View style={{ height: 6, flex: 1, borderRadius: 3, backgroundColor: colors.bgTint, overflow: 'hidden' }}>
                  <View style={{ height: '100%', borderRadius: 3, backgroundColor: colors.success, width: `${g.pct}%` }} />
                </View>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}>{g.progress}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 16 }}>
                {g.week.map((v, i) => (
                  <View key={i} style={{ flex: 1, height: 22, borderRadius: 7, backgroundColor: v ? colors.success : colors.bgTint }} />
                ))}
              </View>
            </View>
          ))}
        </RiseIn>

        <RiseIn delay={140} style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <EmptyState
            icon={<PlusIcon />}
            title="Room for one more"
            subtitle="Start with one small act of worship."
            actionLabel="Create goal"
            onAction={nav.goalNew}
          />
        </RiseIn>
      </ScrollView>
    </View>
  );
}
