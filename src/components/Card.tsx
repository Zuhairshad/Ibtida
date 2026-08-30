import React from 'react';
import { View, ViewStyle } from 'react-native';
import { colors, radii } from '../theme/tokens';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
  padding?: number;
  bg?: string;
  border?: string;
};

export default function Card({ children, style, radius = radii.card, padding = 20, bg = colors.card, border = colors.cardBorder }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius,
          padding,
          borderWidth: 1,
          borderColor: border,
          shadowColor: '#1B2430',
          shadowOpacity: 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 1 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
