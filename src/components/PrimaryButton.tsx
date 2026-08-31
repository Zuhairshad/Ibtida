import React from 'react';
import { ActivityIndicator, StyleProp, Text, ViewStyle } from 'react-native';
import PressableScale from './PressableScale';
import { colors, radii, spacing, type } from '../theme/tokens';

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
          backgroundColor: disabled ? colors.inkMuted : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.standard,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.inkOnPrimary} />
      ) : (
        <Text style={{ ...type.bodyStrong, color: colors.inkOnPrimary }}>{label}</Text>
      )}
    </PressableScale>
  );
}
