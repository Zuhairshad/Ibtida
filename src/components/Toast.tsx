import React, { useEffect, useState } from 'react';
import { Animated, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadow, spacing, type } from '../theme/tokens';

// Lightweight confirmation toast for actions that complete in place
// (data export requested, circle created, bookmark saved). Auto-dismisses.
export default function Toast({ message, onDismiss, duration = 3200 }: { message: string | null; onDismiss: () => void; duration?: number }) {
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) return;
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onDismiss();
      });
    }, duration);
    return () => clearTimeout(t);
  }, [message, anim, duration, onDismiss]);

  if (!message) return null;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: insets.bottom + 92,
        backgroundColor: colors.ink,
        borderRadius: radii.button,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.standard,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        ...shadow.floating,
      }}
    >
      <Text style={{ ...type.caption, color: colors.inkOnPrimary, lineHeight: 20 }}>{message}</Text>
    </Animated.View>
  );
}
