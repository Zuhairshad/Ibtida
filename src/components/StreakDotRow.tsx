import React from 'react';
import { Text, View } from 'react-native';
import { CheckIcon } from '../theme/icons';
import { colors, spacing, type } from '../theme/tokens';

type Day = { label: string; hit: boolean };

export default function StreakDotRow({ days, dotSize = 22 }: { days: Day[]; dotSize?: number }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs }}>
      {days.map((d, i) => (
        <View key={i} style={{ alignItems: 'center', gap: spacing.sm }}>
          {d.hit ? (
            <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: colors.successStrong, alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={Math.round(dotSize * 0.5)} />
            </View>
          ) : (
            <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.card }} />
          )}
          <Text style={{ ...type.captionStrong, fontSize: 12, color: colors.inkSecondary }}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}
