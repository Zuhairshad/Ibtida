import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { colors } from '../theme/tokens';

// Mini sparkline bar chart used for community dhikr counts / dhikr-per-day.
export default function BarChart({ values, height = 44, color = colors.successStrong, barWidth = 7, gap = 3 }: { values: number[]; height?: number; color?: string; barWidth?: number; gap?: number }) {
  const anims = useRef(values.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      40,
      anims.map((a, i) => Animated.timing(a, { toValue: values[i], duration: 500, useNativeDriver: false }))
    ).start();
  }, [values, anims]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap, height }}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            width: barWidth,
            borderRadius: 2,
            backgroundColor: color,
            height: a.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          }}
        />
      ))}
    </View>
  );
}
