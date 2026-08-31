import React from 'react';
import { Text } from 'react-native';
import BottomSheetModal from './BottomSheetModal';
import PressableScale from './PressableScale';
import SecondaryButton from './SecondaryButton';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// In-app confirmation sheet for consequential actions (delete account, leave
// circle, end focus early). Uses the app's own sheet chrome rather than a
// platform Alert so it looks the same everywhere and stays keyboard/AT
// reachable on web.
export default function ConfirmSheet({ visible, title, body, confirmLabel, destructive, onConfirm, onCancel }: Props) {
  if (!visible) return null;
  return (
    <BottomSheetModal visible onClose={onCancel}>
      <Text style={{ ...type.h2, color: colors.ink }}>{title}</Text>
      <Text style={{ ...type.body, lineHeight: 23, color: colors.inkSecondary, marginTop: spacing.sm }}>{body}</Text>
      <PressableScale
        onPress={onConfirm}
        accessibilityRole="button"
        scaleTo={0.99}
        style={{
          minHeight: 52,
          borderRadius: radii.button,
          marginTop: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: destructive ? colors.danger : colors.primary,
        }}
      >
        <Text style={{ ...type.bodyStrong, color: colors.inkOnPrimary }}>{confirmLabel}</Text>
      </PressableScale>
      <SecondaryButton label="Cancel" onPress={onCancel} style={{ marginTop: 2 }} />
    </BottomSheetModal>
  );
}
