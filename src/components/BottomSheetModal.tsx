import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { colors, radii, shadow, spacing } from '../theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  bg?: string;
};

// iOS-style bottom sheet: drag handle, swipe-to-dismiss-adjacent scrim tap,
// used for Prayer Detail and other modal presentations.
export default function BottomSheetModal({ visible, onClose, children, bg = colors.card }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: colors.ink, opacity: 0.42 }} onPress={onClose} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: bg,
          borderTopLeftRadius: radii.cardLarge,
          borderTopRightRadius: radii.cardLarge,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxl,
          ...shadow.floating,
        }}
      >
        <View style={{ width: 38, height: 4, borderRadius: radii.pill, backgroundColor: colors.divider, alignSelf: 'center', marginBottom: spacing.lg }} />
        {children}
      </View>
    </Modal>
  );
}
