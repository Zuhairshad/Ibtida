import React from 'react';
import { Text, View } from 'react-native';
import PressableScale from './PressableScale';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = {
  options: string[];
  selected: number;
  onChange: (i: number) => void;
  style?: object;
};

export default function SegmentedControl({ options, selected, onChange, style }: Props) {
  return (
    <View style={[{ flexDirection: 'row', gap: spacing.xs, padding: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.primaryTint }, style]}>
      {options.map((label, i) => {
        const on = i === selected;
        return (
          <PressableScale
            key={label}
            scaleTo={1}
            onPress={() => onChange(i)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: radii.pill,
              backgroundColor: on ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ ...type.captionStrong, color: on ? colors.inkOnPrimary : colors.inkSecondary }}>{label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
