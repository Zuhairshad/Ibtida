import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '../../state/AuthContext';
import { getAlarmConfig, regenerateVerificationToken, regenerateWuduToken } from '../../services/wakeAlarm';
import type { PrayerName } from '../../services/prayers';
import { nav } from '../../navigation/navigate';
import { colors, radii } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SecondaryButton from '../../components/SecondaryButton';
import ConfirmSheet from '../../components/ConfirmSheet';
import { RowSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { ChevronLeftIcon } from '../../theme/icons';

type Props = {
  /** Which prayer's alarm these tags verify — a household prints one set of
   * tags per prayer they've enabled wake-verification for (see
   * `src/services/wakeAlarm.ts`'s `getAllAlarmConfigs`). */
  prayerName: PrayerName;
};

type Tokens = {
  wuduToken: string;
  verificationToken: string;
};

export default function PrayerMatTagScreen({ prayerName }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [confirmRegenerateWudu, setConfirmRegenerateWudu] = useState(false);
  const [confirmRegenerateMat, setConfirmRegenerateMat] = useState(false);
  const [regeneratingWudu, setRegeneratingWudu] = useState(false);
  const [regeneratingMat, setRegeneratingMat] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAlarmConfig(user.id, prayerName)
      .then((config) => {
        if (!cancelled) setTokens({ wuduToken: config.wuduToken, verificationToken: config.verificationToken });
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

  const onRegenerateWudu = () => {
    if (!user) return;
    setConfirmRegenerateWudu(false);
    setRegeneratingWudu(true);
    regenerateWuduToken(user.id, prayerName)
      .then((fresh) => {
        setTokens((prev) => (prev ? { ...prev, wuduToken: fresh } : prev));
        setToast('New sink tag generated — reprint it before your next alarm.');
      })
      .catch(() => setToast('Could not generate a new tag. Try again.'))
      .finally(() => setRegeneratingWudu(false));
  };

  const onRegenerateMat = () => {
    if (!user) return;
    setConfirmRegenerateMat(false);
    setRegeneratingMat(true);
    regenerateVerificationToken(user.id, prayerName)
      .then((fresh) => {
        setTokens((prev) => (prev ? { ...prev, verificationToken: fresh } : prev));
        setToast('New prayer mat tag generated — reprint it before your next alarm.');
      })
      .catch(() => setToast('Could not generate a new tag. Try again.'))
      .finally(() => setRegeneratingMat(false));
  };

  return (
    <ScreenFade duration={300} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}>
      <View style={{ paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <PressableScale onPress={nav.back} scaleTo={1} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 }}>
          <ChevronLeftIcon />
        </PressableScale>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.inkStrong }}>{prayerName} wake tags</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <RowSkeleton rows={6} />
        ) : error || !tokens ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 14.5, color: colors.inkMuted, textAlign: 'center', marginBottom: 16 }}>Could not load your tags.</Text>
            <SecondaryButton label="Try again" onPress={load} />
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 14.5, lineHeight: 23, color: colors.inkMuted, marginBottom: 20 }}>
              Print both codes. Scan the sink tag when you wake up, then scan the mat tag after completing your prayer.
            </Text>

            {/* --- Sink / Wudu tag --- */}
            <TagCard
              label="Sink / Wudu tag"
              instruction="Stick this on your sink"
              token={tokens.wuduToken}
              regenerating={regeneratingWudu}
              onRegenerate={() => setConfirmRegenerateWudu(true)}
            />

            {/* --- Prayer mat tag --- */}
            <View style={{ marginTop: 20 }}>
              <TagCard
                label="Prayer mat tag"
                instruction="Stick this on your prayer mat"
                token={tokens.verificationToken}
                regenerating={regeneratingMat}
                onRegenerate={() => setConfirmRegenerateMat(true)}
              />
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={confirmRegenerateWudu}
        title="Generate a new sink tag?"
        body="Your printed sink code will stop working immediately. You'll need to print the new one before your next alarm."
        confirmLabel="Generate new tag"
        destructive
        onConfirm={onRegenerateWudu}
        onCancel={() => setConfirmRegenerateWudu(false)}
      />

      <ConfirmSheet
        visible={confirmRegenerateMat}
        title="Generate a new prayer mat tag?"
        body="Your printed mat code will stop working immediately. You'll need to print the new one before your next alarm."
        confirmLabel="Generate new tag"
        destructive
        onConfirm={onRegenerateMat}
        onCancel={() => setConfirmRegenerateMat(false)}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}

// ---------------------------------------------------------------------------
// Internal sub-component for a single QR tag card
// ---------------------------------------------------------------------------

type TagCardProps = {
  label: string;
  instruction: string;
  token: string;
  regenerating: boolean;
  onRegenerate: () => void;
};

function TagCard({ label, instruction, token, regenerating, onRegenerate }: TagCardProps) {
  return (
    <View
      style={{
        borderRadius: radii.cardLarge,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
    >
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkSecondary, marginBottom: 4 }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.inkFaint, marginBottom: 16 }}>{instruction}</Text>
        <View style={{ padding: 12, borderRadius: radii.card, backgroundColor: '#FFFFFF' }}>
          <QRCode value={token} size={160} color={colors.inkStrong} backgroundColor="#FFFFFF" ecl="M" />
        </View>
        <Text style={{ fontSize: 12, color: colors.inkFaint, marginTop: 12, letterSpacing: 0.4 }}>{token.slice(0, 8).toUpperCase()}</Text>
      </View>

      <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: radii.card, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.bgWash, padding: 14 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkSecondary, textTransform: 'uppercase', letterSpacing: 0.1 }}>
          Lost or compromised tag?
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 4 }}>
          Generating a new one immediately retires this code — reprint before your next alarm.
        </Text>
        <SecondaryButton
          label={regenerating ? 'Generating…' : 'Generate a new tag'}
          onPress={regenerating ? undefined : onRegenerate}
          style={{ marginTop: 10, alignSelf: 'flex-start' }}
        />
      </View>
    </View>
  );
}
