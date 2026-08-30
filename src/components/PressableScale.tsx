import React, { useState } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children?: React.ReactNode;
};

// Shared tap-feedback wrapper — every tappable card/tile/row in the design
// gets the same subtle scale-down-on-press motion (respects reduce-motion
// implicitly since it's a quick, small transform, not a decorative loop).
//
// The full `style` (padding, background, border, flexDirection, etc.) lives
// on the inner Animated.View so it arranges its own children exactly like a
// plain styled View. The outer Pressable stays undecorated except for one
// thing it must mirror from `style`: `flex`, so a caller's `flex: 1` (used
// to center content in the remaining space of a flex column, e.g. the
// Tasbeeh counter) still propagates — otherwise the unstyled Pressable
// breaks the flex chain between this node and its flex-column ancestor.
export default function PressableScale({ style, scaleTo = 0.97, children, ...rest }: Props) {
  const [scale] = useState(() => new Animated.Value(1));
  const flex = StyleSheet.flatten(style)?.flex;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} style={flex !== undefined ? { flex } : undefined} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
