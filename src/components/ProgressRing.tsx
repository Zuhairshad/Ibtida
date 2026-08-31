import React, { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  strokeWidth: number;
  progress: number; // 0..1
  trackColor?: string;
  color?: string;
  children?: React.ReactNode;
  animate?: boolean;
};

// Circular progress ring — the workhorse visualization used for daily
// completion %, next-prayer countdown, tasbeeh counter, goal progress and
// Quran reading progress across the app.
export default function ProgressRing({ size, strokeWidth, progress, trackColor = colors.primaryTint, color = colors.primary, children, animate = true }: Props) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(Math.max(progress, 0), 1),
      duration: animate ? 900 : 0,
      useNativeDriver: false,
    }).start();
  }, [progress, animate, anim]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      {children}
    </View>
  );
}
