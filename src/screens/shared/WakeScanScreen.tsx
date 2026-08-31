import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { nav } from '../../navigation/navigate';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import PrimaryButton from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';

type Props = {
  /** Called once, with the raw scanned QR payload — the wake-alarm domain's
   * caller is expected to compare this against the prayer's
   * `verification_token` (see `src/services/wakeAlarm.ts`) and, on a match,
   * call `logWakeVerification` itself. This screen only scans; it never
   * imports wakeAlarm.ts or knows what "correct" looks like, so it stays
   * reusable for any future scan-to-verify flow, not just this one. */
  onVerified: (scannedText: string) => void;
  /** Defaults to `nav.back()` — pass this to override (e.g. a modal
   * presentation that should dismiss differently). */
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
};

// Shared, reusable full-screen scanner — not wired into the navigation stack
// here (no route params are settled yet; that's the UI-wiring agent's job
// next phase). Drop it in as a plain component and supply `onVerified`.
export default function WakeScanScreen({
  onVerified,
  onCancel,
  title = "Confirm you're awake",
  subtitle = 'Scan your prayer mat tag to confirm you’re awake.',
}: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  // Guards against onBarcodeScanned firing repeatedly per-frame while the
  // same code stays in view — only the first scan in this screen's lifetime
  // calls onVerified.
  const [scanned, setScanned] = useState(false);

  const handleCancel = onCancel ?? nav.back;

  return (
    <ScreenFade duration={300} style={{ backgroundColor: colors.ink }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale onPress={handleCancel} scaleTo={1} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkOnPrimary, opacity: 0.65 }}>Cancel</Text>
        </PressableScale>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkOnPrimary, opacity: 0.5 }}>Wake check</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.inkOnPrimary, textAlign: 'center' }}>{title}</Text>
        <Text style={{ fontSize: 14.5, lineHeight: 22, color: colors.inkOnPrimary, opacity: 0.6, marginTop: 10, textAlign: 'center', maxWidth: 280 }}>{subtitle}</Text>

        <View
          style={{
            marginTop: 28,
            width: 260,
            height: 260,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.inkMuted,
            backgroundColor: colors.ink,
          }}
        >
          {!permission ? (
            // Permission status hasn't resolved yet.
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.inkOnPrimary, opacity: 0.55, fontSize: 13 }}>Loading camera…</Text>
            </View>
          ) : !permission.granted ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <Text style={{ color: colors.inkOnPrimary, opacity: 0.8, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                Camera access is needed to scan your tag.
              </Text>
              <PrimaryButton label="Allow camera access" onPress={() => requestPermission()} />
            </View>
          ) : (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={
                scanned
                  ? undefined
                  : ({ data }) => {
                      setScanned(true);
                      onVerified(data);
                    }
              }
            />
          )}
        </View>

        <Text style={{ fontSize: 12.5, lineHeight: 20, color: colors.inkOnPrimary, opacity: 0.45, marginTop: 22, textAlign: 'center', maxWidth: 250 }}>
          Line the QR code up inside the frame.
        </Text>
      </View>
    </ScreenFade>
  );
}
