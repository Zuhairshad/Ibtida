import React from 'react';
import { Text, View } from 'react-native';
import { radii, spacing, type } from '../theme/tokens';

type Props = {
  label: string;
  bg: string;
  ink: string;
  fontSize?: number;
};

export default function StatusPill({ label, bg, ink, fontSize = 12.5 }: Props) {
  return (
    <View style={{ backgroundColor: bg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.pill }}>
      <Text style={{ ...type.captionStrong, fontSize, color: ink }}>{label}</Text>
    </View>
  );
}
