import React from 'react';
import { Text, View } from 'react-native';
import PrimaryButtonInline from './SecondaryButton';
import { colors } from '../theme/tokens';

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
        borderColor: 'rgba(23,32,28,0.13)',
        borderRadius: 24,
        paddingVertical: 28,
        paddingHorizontal: 22,
        alignItems: 'center',
      }}
    >
      <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: colors.bgTint, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{icon}</View>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.inkStrong, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>{subtitle}</Text>
      {!!actionLabel && (
        <View
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: 'rgba(23,32,28,0.12)',
            borderRadius: 14,
          }}
        >
          <PrimaryButtonInline label={actionLabel} onPress={onAction} style={{ paddingHorizontal: 22, minHeight: 48 }} textStyle={{ color: colors.inkStrong, fontWeight: '600', fontSize: 14 }} />
        </View>
      )}
    </View>
  );
}
