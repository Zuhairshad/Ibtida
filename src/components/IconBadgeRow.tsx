import React from 'react';
import { Text, View } from 'react-native';
import PressableScale from './PressableScale';
import { colors, radii, shadow, spacing, type } from '../theme/tokens';

// The app's workhorse row: leading colored circular icon badge, title +
// subtitle, trailing status/value/chevron. Used for Prayer list, Adhkar
// recommendations, Goals list, Circles list, Profile/Settings rows.
type Props = {
  icon: React.ReactNode;
  badgeBg: string;
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  bg?: string;
  border?: string;
  radius?: number;
};

export default function IconBadgeRow({ icon, badgeBg, title, subtitle, subtitleColor = colors.inkSecondary, trailing, onPress, bg = colors.card, border = colors.cardBorder, radius = radii.card }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      disabled={!onPress}
      style={{
        borderRadius: radius,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: bg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.standard,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 48,
        ...shadow.card,
      }}
    >
      <View style={{ width: 38, height: 38, borderRadius: radii.control, backgroundColor: badgeBg, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...type.h3, color: colors.ink }} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ ...type.caption, color: subtitleColor, marginTop: spacing.xs }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing}
    </PressableScale>
  );
}
