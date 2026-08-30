import React from 'react';
import { ActivityIndicator, StyleProp, Text, ViewStyle } from 'react-native';
import PressableScale from './PressableScale';
import { colors, radii } from '../theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function PrimaryButton({ label, onPress, disabled, loading, style }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.99}
      style={[
        {
          minHeight: 52,
          borderRadius: radii.button,
          backgroundColor: disabled ? colors.cardBorderStrong : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{label}</Text>
      )}
    </PressableScale>
  );
}
