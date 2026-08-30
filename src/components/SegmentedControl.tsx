import React from 'react';
import { Text, View } from 'react-native';
import PressableScale from './PressableScale';
import { colors } from '../theme/tokens';

type Props = {
  options: string[];
  selected: number;
  onChange: (i: number) => void;
  style?: object;
};

export default function SegmentedControl({ options, selected, onChange, style }: Props) {
  return (
    <View style={[{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: colors.bgTint }, style]}>
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
              borderRadius: 11,
              backgroundColor: on ? '#FFFFFF' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: on ? '#17201C' : undefined,
              shadowOpacity: on ? 0.1 : 0,
              shadowRadius: on ? 3 : 0,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: on ? '600' : '500', color: on ? colors.inkStrong : colors.inkMuted }}>{label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
