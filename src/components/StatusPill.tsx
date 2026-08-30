import React from 'react';
import { Text, View } from 'react-native';

type Props = {
  label: string;
  bg: string;
  ink: string;
  fontSize?: number;
};

export default function StatusPill({ label, bg, ink, fontSize = 12.5 }: Props) {
  return (
    <View style={{ backgroundColor: bg, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 11 }}>
      <Text style={{ fontSize, fontWeight: '500', color: ink }}>{label}</Text>
    </View>
  );
}
