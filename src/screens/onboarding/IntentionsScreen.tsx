import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import PrimaryButton from '../../components/PrimaryButton';
import { CheckIcon } from '../../theme/icons';

const INTENTS = [
  { title: 'The five daily prayers', sub: 'Track and catch up on what I miss' },
  { title: 'Daily dhikr', sub: 'A count I keep without thinking about it' },
  { title: 'Reading Quran', sub: 'A few pages, most days' },
  { title: 'Morning and evening adhkar', sub: 'Two short habits, book-ending the day' },
  { title: 'Less time on my phone', sub: 'Worship before scrolling' },
];

export default function IntentionsScreen() {
  const { state, toggleIntent } = useAppState();
  const insets = useSafeAreaInsets();

  return (
    <ScreenFade duration={350} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
      <Text style={{ fontSize: 28, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.025, lineHeight: 34 }}>What would you like to be steady in?</Text>
      <Text style={{ fontSize: 15, lineHeight: 23, color: colors.inkMuted, marginTop: 8, marginBottom: 24 }}>Pick one or two. This only sets what Home shows first.</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {INTENTS.map((it, i) => {
          const on = state.intents[i];
          return (
            <PressableScale
              key={it.title}
              onPress={() => toggleIntent(i)}
              scaleTo={0.99}
              style={{
                minHeight: 48,
                padding: 16,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: 'rgba(23,32,28,0.07)',
              }}
            >
              <View style={{ gap: 3, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.inkStrong }}>{it.title}</Text>
                <Text style={{ fontSize: 13, color: colors.inkMuted, lineHeight: 18 }}>{it.sub}</Text>
              </View>
              {on ? (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}>
                  <CheckIcon size={12} />
                </View>
              ) : (
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(23,32,28,0.15)' }} />
              )}
            </PressableScale>
          );
        })}
      </ScrollView>

      <PrimaryButton label="Continue" onPress={nav.home} style={{ marginTop: 20 }} />
    </ScreenFade>
  );
}
