import React from 'react';
import { StyleProp, Text, TextStyle, ViewStyle } from 'react-native';
import PressableScale from './PressableScale';
import { colors } from '../theme/tokens';

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
      style={[{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Text style={[{ color: colors.inkSecondary, fontSize: 14, fontWeight: '500' as const }, textStyle]}>{label}</Text>
    </PressableScale>
  );
}
