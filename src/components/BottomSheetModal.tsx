import React from 'react';
import { Modal, Pressable, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  bg?: string;
};

// iOS-style bottom sheet: drag handle, swipe-to-dismiss-adjacent scrim tap,
// used for Prayer Detail and other modal presentations.
export default function BottomSheetModal({ visible, onClose, children, bg = '#FFFFFF' }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(23,32,28,0.42)' }} onPress={onClose} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: bg,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 34,
          shadowColor: '#17201C',
          shadowOpacity: 0.3,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: -10 },
        }}
      >
        <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(23,32,28,0.14)', alignSelf: 'center', marginBottom: 20 }} />
        {children}
      </View>
    </Modal>
  );
}
