import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

// Matches the prototype's `ibIn` keyframe: fade + rise on screen entry.
export function ScreenFade({ children, style, duration = 300 }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; duration?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }).start();
  }, [anim, duration]);
  return (
    <Animated.View
      style={[
        { flex: 1, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Matches the prototype's `ibRise` keyframe used for staggered section
// entrances (Home, Prayer): a slightly larger rise with a per-section delay.
export function RiseIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle | ViewStyle[] }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
  }, [anim, delay]);
  return (
    <Animated.View
      style={[
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
