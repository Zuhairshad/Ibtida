import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '../../state/AuthContext';
import { getAlarmConfig, regenerateVerificationToken } from '../../services/wakeAlarm';
import type { PrayerName } from '../../services/prayers';
import { nav } from '../../navigation/navigate';
import { colors, radii, shadow } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SecondaryButton from '../../components/SecondaryButton';
import ConfirmSheet from '../../components/ConfirmSheet';
import { RowSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { ChevronLeftIcon } from '../../theme/icons';

type Props = {
  /** Which prayer's alarm this tag verifies — a household prints one tag per
   * prayer they've enabled wake-verification for (see
   * `src/services/wakeAlarm.ts`'s `getAllAlarmConfigs`). */
  prayerName: PrayerName;
};

// Shared, reusable "print/display this on your prayer mat" screen — not
// wired into the navigation stack here (no route yet; that's the UI-wiring
// agent's job next phase). Drop it in with `<PrayerMatTagScreen prayerName="Fajr" />`.
export default function PrayerMatTagScreen({ prayerName }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Fetches on mount and whenever `reloadKey` bumps (the "Try again" button
  // below bumps it after first resetting loading/error state itself — an
  // effect body should only read state, never set it synchronously, so the
  // retry trigger lives in `load` instead of here).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAlarmConfig(user.id, prayerName)
      .then((config) => {
        if (!cancelled) setToken(config.verificationToken);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, prayerName, reloadKey]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    setReloadKey((k) => k + 1);
  }, []);

  const onRegenerate = () => {
    if (!user) return;
    setConfirmRegenerate(false);
    setRegenerating(true);
    regenerateVerificationToken(user.id, prayerName)
      .then((fresh) => {
        setToken(fresh);
        setToast('New tag generated — reprint it before your next alarm.');
      })
      .catch(() => setToast('Could not generate a new tag. Try again.'))
      .finally(() => setRegenerating(false));
  };

  return (
    <ScreenFade duration={300} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}>
      <View style={{ paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <PressableScale onPress={nav.back} scaleTo={1} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 }}>
          <ChevronLeftIcon />
        </PressableScale>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{prayerName} wake tag</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <RowSkeleton rows={3} />
        ) : error || !token ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 14.5, color: colors.inkMuted, textAlign: 'center', marginBottom: 16 }}>Could not load your tag.</Text>
            <SecondaryButton label="Try again" onPress={load} />
          </View>
        ) : (
          <>
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 28,
                borderRadius: radii.cardLarge,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
                ...shadow.card,
              }}
            >
              <View style={{ padding: 16, borderRadius: radii.card, backgroundColor: colors.card }}>
                <QRCode value={token} size={200} color={colors.ink} backgroundColor={colors.card} ecl="M" />
              </View>
              <Text style={{ fontSize: 13, color: colors.inkMuted, marginTop: 14, letterSpacing: 0.4 }}>{token.slice(0, 8).toUpperCase()}</Text>
            </View>

            <Text style={{ fontSize: 14.5, lineHeight: 23, color: colors.inkMuted, marginTop: 20 }}>
              Print this code and keep it on your prayer mat. When your {prayerName} alarm sounds, scanning it is how you confirm you’re
              actually up — not just tapping snooze from bed.
            </Text>

            <View style={{ marginTop: 22, borderRadius: radii.card, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bg, padding: 16 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkSecondary, textTransform: 'uppercase', letterSpacing: 0.1 }}>
                Lost or compromised tag?
              </Text>
              <Text style={{ fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 6 }}>
                Generating a new one immediately retires this code — reprint before your next alarm.
              </Text>
              <SecondaryButton
                label={regenerating ? 'Generating…' : 'Generate a new tag'}
                onPress={regenerating ? undefined : () => setConfirmRegenerate(true)}
                style={{ marginTop: 12, alignSelf: 'flex-start' }}
              />
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={confirmRegenerate}
        title="Generate a new tag?"
        body="Your printed code will stop working immediately. You'll need to print the new one before your next alarm."
        confirmLabel="Generate new tag"
        destructive
        onConfirm={onRegenerate}
        onCancel={() => setConfirmRegenerate(false)}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
