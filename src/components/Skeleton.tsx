import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, View } from 'react-native';

// Shimmering loading placeholder — every screen that fetches data gets a
// real skeleton variant here, never a bare "Loading..." spinner.
export function SkeletonBlock({ width, height, radius = 12, style }: { width: DimensionValue; height: number; radius?: number; style?: object }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: '#EEF0F3', opacity }, style]} />;
}

export function HomeSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 58 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <SkeletonBlock width={46} height={46} radius={23} />
        <View style={{ flex: 1, gap: 9 }}>
          <SkeletonBlock width="62%" height={15} />
          <SkeletonBlock width="40%" height={11} />
        </View>
      </View>
      <SkeletonBlock width="100%" height={196} radius={22} style={{ marginTop: 20 }} />
      <SkeletonBlock width="100%" height={78} radius={22} style={{ marginTop: 14 }} />
      <SkeletonBlock width="100%" height={144} radius={22} style={{ marginTop: 22 }} />
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 12 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <SkeletonBlock key={n} width="100%" height={76} radius={15} style={{ flex: 1 }} />
        ))}
      </View>
    </View>
  );
}

export function RowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <SkeletonBlock width={44} height={44} radius={14} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBlock width={`${50 + ((i * 13) % 30)}%`} height={12} />
            <SkeletonBlock width={`${30 + ((i * 9) % 25)}%`} height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}
