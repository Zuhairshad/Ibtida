import React from 'react';
import { Text } from 'react-native';
import BottomSheetModal from './BottomSheetModal';
import PressableScale from './PressableScale';
import SecondaryButton from './SecondaryButton';
import { colors } from '../theme/tokens';

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
      <Text style={{ fontSize: 20, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.02 }}>{title}</Text>
      <Text style={{ fontSize: 14.5, lineHeight: 23, color: colors.inkMuted, marginTop: 10 }}>{body}</Text>
      <PressableScale
        onPress={onConfirm}
        accessibilityRole="button"
        scaleTo={0.99}
        style={{
          minHeight: 52,
          borderRadius: 16,
          marginTop: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: destructive ? colors.dangerInk : colors.primary,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{confirmLabel}</Text>
      </PressableScale>
      <SecondaryButton label="Cancel" onPress={onCancel} style={{ marginTop: 2 }} />
    </BottomSheetModal>
  );
}
