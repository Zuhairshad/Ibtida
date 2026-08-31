import React from 'react';
import { View, ViewStyle } from 'react-native';
import { colors, radii, shadow, spacing } from '../theme/tokens';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
  padding?: number;
  bg?: string;
  border?: string;
};

export default function Card({ children, style, radius = radii.card, padding = spacing.lg, bg = colors.card, border = colors.cardBorder }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius,
          padding,
          borderWidth: 1,
          borderColor: border,
          ...shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
