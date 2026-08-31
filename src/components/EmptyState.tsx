import React from 'react';
import { Text, View } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

// Every module's "nothing here yet" moment — illustration + short copy +
// primary action. Required for: no goals, no bookmarks, no circles, no
// prayer history yet.
export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.divider,
        borderRadius: radii.card,
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
      }}
    >
      <View style={{ width: 52, height: 52, borderRadius: radii.control, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.standard }}>{icon}</View>
      <Text style={{ ...type.h3, color: colors.ink, textAlign: 'center' }}>{title}</Text>
      <Text style={{ ...type.caption, color: colors.inkSecondary, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 }}>{subtitle}</Text>
      {!!actionLabel && (
        <View
          style={{
            marginTop: spacing.standard,
          }}
        >
          <PrimaryButton label={actionLabel} onPress={onAction} style={{ paddingHorizontal: spacing.xl, minHeight: 48 }} />
        </View>
      )}
    </View>
  );
}
