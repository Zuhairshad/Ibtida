import React, { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { colors, shadow } from '../theme/tokens';

// Shared switch used by Prayer detail (adhan), Privacy (notification
// categories) and Focus setup (apps to restrict). Purely presentational —
// the owning row handles the press so the whole row stays a 48px target.
export default function Toggle({ on, disabled }: { on: boolean; disabled?: boolean }) {
  const [anim] = useState(() => new Animated.Value(on ? 1 : 0));

  useEffect(() => {
    Animated.spring(anim, { toValue: on ? 1 : 0, useNativeDriver: false, speed: 20, bounciness: 4 }).start();
  }, [on, anim]);

  return (
    <Animated.View
      style={{
        width: 48,
        height: 29,
        borderRadius: 15,
        opacity: disabled ? 0.5 : 1,
        backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: [colors.inkMuted, colors.success] }),
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.card,
          marginLeft: anim.interpolate({ inputRange: [0, 1], outputRange: [2.5, 21.5] }),
          ...shadow.card,
        }}
      />
    </Animated.View>
  );
}
