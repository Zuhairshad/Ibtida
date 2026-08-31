import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

type Props = {
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
};

export default function MosqueMotif({ width = 180, height = 116, color = colors.primary, opacity = 0.1 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 180 116" fill="none" opacity={opacity} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M38 99V60c0-18 13-32 29-36 16 4 29 18 29 36v39H38Z" fill={color} />
      <Path d="M49 60c0-11 8-21 18-24 10 3 18 13 18 24H49Z" fill={colors.primaryStrong} />
      <Rect x="108" y="32" width="20" height="67" rx="4" fill={color} />
      <Path d="M104 32h28l-14-20-14 20Z" fill={colors.primaryStrong} />
      <Rect x="134" y="51" width="14" height="48" rx="3" fill={colors.primaryStrong} />
      <Path d="M131 51h20l-10-15-10 15Z" fill={color} />
      <Path d="M58 99V76c0-6 4-10 9-10s9 4 9 10v23H58Z" fill={colors.card} />
      <Circle cx="118" cy="43" r="4" fill={colors.card} />
      <Path d="M20 99h142" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );
}
