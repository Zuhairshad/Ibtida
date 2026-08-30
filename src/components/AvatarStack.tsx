import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '../theme/tokens';

type Avatar = { initial: string; bg: string };

export default function AvatarStack({ avatars, size = 30 }: { avatars: Avatar[]; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {avatars.map((a, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: a.bg,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            marginLeft: i === 0 ? 0 : -8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.inkStrong }}>{a.initial}</Text>
        </View>
      ))}
    </View>
  );
}
