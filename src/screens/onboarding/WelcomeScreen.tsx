import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';

import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  return (
    <ScreenFade duration={450} style={{ backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: insets.bottom + 40, paddingTop: insets.top + 20 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(217,190,134,0.4)', opacity: glowOpacity, transform: [{ scale: glowScale }] }} />
        <Svg width={152} height={152} viewBox="0 0 152 152" fill="none">
          <Circle cx={76} cy={76} r={62} stroke="#3D73C9" />
          <Circle cx={76} cy={76} r={44} stroke="#5EAA78" />
          <Rect x={32} y={32} width={88} height={88} rx={10} stroke="rgba(22,50,62,0.55)" transform="rotate(45 76 76)" />
          <Circle cx={76} cy={76} r={6.5} fill="#3D73C9" />
        </Svg>
      </View>
      <Text style={{ fontSize: 34, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.03, lineHeight: 39 }}>Small steps.{'\n'}Consistent worship.</Text>
      <Text style={{ fontSize: 16, lineHeight: 25, color: colors.inkMuted, marginTop: 12, marginBottom: 28, maxWidth: 300 }}>A quiet record of your prayer, dhikr and reading. Everything private by default.</Text>
      <PrimaryButton label="Begin" onPress={nav.intentions} />
      <SecondaryButton label="I already have an account" onPress={nav.home} style={{ marginTop: 4 }} />
    </ScreenFade>
  );
}
