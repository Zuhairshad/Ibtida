import React from 'react';
import { Text, View } from 'react-native';
import { colors, radii, type } from '../theme/tokens';

type Avatar = { initial: string; bg: string };

export default function AvatarStack({ avatars, size = 30 }: { avatars: Avatar[]; size?: number }) {
  const visible = avatars.slice(0, 4);
  const overflow = avatars.length - visible.length;

  return (
    <View style={{ flexDirection: 'row' }}>
      {visible.map((a, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: a.bg,
            borderWidth: 2,
            borderColor: colors.card,
            marginLeft: i === 0 ? 0 : -8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...type.captionStrong, fontSize: 11, color: colors.ink }}>{a.initial}</Text>
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={{
            minWidth: size + 8,
            height: size,
            borderRadius: radii.pill,
            backgroundColor: colors.bg,
            borderWidth: 2,
            borderColor: colors.card,
            marginLeft: -8,
            paddingHorizontal: 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...type.captionStrong, fontSize: 11, color: colors.inkSecondary }}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}
