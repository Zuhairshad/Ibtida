import React, { useEffect, useState } from 'react';
import { Animated, DimensionValue, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';

// Shimmering loading placeholder — every screen that fetches data gets a
// real skeleton variant here, never a bare "Loading..." spinner.
export function SkeletonBlock({ width, height, radius = radii.control, style }: { width: DimensionValue; height: number; radius?: number; style?: object }) {
  const [opacity] = useState(() => new Animated.Value(0.5));

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

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.primaryTint, opacity }, style]} />;
}

export function HomeSkeleton() {
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: 58 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <SkeletonBlock width={46} height={46} radius={23} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <SkeletonBlock width="62%" height={15} />
          <SkeletonBlock width="40%" height={11} />
        </View>
      </View>
      <SkeletonBlock width="100%" height={196} radius={radii.card} style={{ marginTop: spacing.lg }} />
      <SkeletonBlock width="100%" height={78} radius={radii.card} style={{ marginTop: spacing.md }} />
      <SkeletonBlock width="100%" height={144} radius={radii.card} style={{ marginTop: spacing.lg }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
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
