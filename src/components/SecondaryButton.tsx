import React from 'react';
import { StyleProp, Text, TextStyle, ViewStyle } from 'react-native';
import PressableScale from './PressableScale';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function SecondaryButton({ label, onPress, style, textStyle }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={1}
      style={[
        {
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.standard,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.card,
        },
        style,
      ]}
    >
      <Text style={[{ ...type.captionStrong, color: colors.ink }, textStyle]}>{label}</Text>
    </PressableScale>
  );
}
