import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/AuthContext';
import { getAlarmConfig, saveTagToken } from '../../services/wakeAlarm';
import type { PrayerName } from '../../services/prayers';
import { nav } from '../../navigation/navigate';
import { colors, radii } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import SecondaryButton from '../../components/SecondaryButton';
import PrimaryButton from '../../components/PrimaryButton';
import { RowSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import { ChevronLeftIcon } from '../../theme/icons';
import WakeScanScreen from './WakeScanScreen';

type Props = {
  prayerName: PrayerName;
};

type TagTokens = {
  wuduToken: string;
  matToken: string;
};

export default function PrayerMatTagScreen({ prayerName }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [tokens, setTokens] = useState<TagTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [scanning, setScanning] = useState<'wudu' | 'mat' | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAlarmConfig(user.id, prayerName)
      .then((config) => {
        if (!cancelled) setTokens({ wuduToken: config.wuduToken, matToken: config.verificationToken });
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, prayerName, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    setReloadKey((k) => k + 1);
  }, []);

  const onScanned = useCallback(async (value: string) => {
    if (!user || !scanning) return;
    const which = scanning;
    setSaving(true);
    try {
      await saveTagToken(user.id, prayerName, which, value);
      setTokens((prev) =>
        prev
          ? which === 'wudu'
            ? { ...prev, wuduToken: value }
            : { ...prev, matToken: value }
          : prev
      );
      setToast(which === 'wudu' ? 'Sink tag registered.' : 'Prayer mat tag registered.');
    } catch {
      setToast('Could not save — check your connection and try again.');
    } finally {
      setSaving(false);
      setScanning(null);
    }
  }, [user, prayerName, scanning]);

  // Full-screen scanner while registering a tag
  if (scanning) {
    return (
      <WakeScanScreen
        stepLabel={scanning === 'wudu' ? 'Register sink tag' : 'Register mat tag'}
        title={scanning === 'wudu' ? 'Scan your sink sticker' : 'Scan your mat sticker'}
        subtitle={
          scanning === 'wudu'
            ? 'Hold the camera over the QR sticker on your sink.'
            : 'Hold the camera over the QR sticker on your prayer mat.'
        }
        onVerified={onScanned}
        onCancel={() => setScanning(null)}
      />
    );
  }

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
          <RowSkeleton rows={4} />
        ) : error || !tokens ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 14.5, color: colors.inkMuted, textAlign: 'center', marginBottom: 16 }}>Could not load your tags.</Text>
            <SecondaryButton label="Try again" onPress={reload} />
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 14.5, lineHeight: 23, color: colors.inkMuted, marginBottom: 20 }}>
              Stick a small QR sticker on your sink and another on your prayer mat. Then scan each one below to link it to your {prayerName} alarm.
            </Text>

            <TagCard
              label="Sink / Wudu tag"
              instruction="Stick on your sink or bathroom mirror"
              linked={tokens.wuduToken.length > 0}
              onScan={() => setScanning('wudu')}
            />

            <View style={{ marginTop: 16 }}>
              <TagCard
                label="Prayer mat tag"
                instruction="Stick on your prayer mat"
                linked={tokens.matToken.length > 0}
                onScan={() => setScanning('mat')}
              />
            </View>

            <Text style={{ fontSize: 12.5, color: colors.inkFaint, marginTop: 20, lineHeight: 18, textAlign: 'center' }}>
              Any standard QR sticker works — scan the same sticker when your alarm fires.
            </Text>
          </>
        )}
      </ScrollView>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}

// ---------------------------------------------------------------------------
// Tag card — one per verification stage
// ---------------------------------------------------------------------------

type TagCardProps = {
  label: string;
  instruction: string;
  linked: boolean;
  onScan: () => void;
};

function TagCard({ label, instruction, linked, onScan }: TagCardProps) {
  return (
    <View
      style={{
        borderRadius: radii.cardLarge,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.card,
        overflow: 'hidden',
        padding: 18,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.inkStrong }}>{label}</Text>
      <Text style={{ fontSize: 12.5, color: colors.inkFaint, marginTop: 3 }}>{instruction}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 }}>
        <View
          style={{
            flex: 1,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: linked ? 'rgba(52,199,89,0.10)' : colors.bgWash,
            borderWidth: 1,
            borderColor: linked ? 'rgba(52,199,89,0.25)' : colors.cardBorder,
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: linked ? '#1D9A40' : colors.inkMuted }}>
            {linked ? 'Sticker linked' : 'Not yet linked'}
          </Text>
          <Text style={{ fontSize: 11.5, color: colors.inkFaint, marginTop: 2 }}>
            {linked ? 'Scan again to update' : 'Scan your sticker to link it'}
          </Text>
        </View>
        <PrimaryButton label="Scan" onPress={onScan} style={{ alignSelf: 'stretch' }} />
      </View>
    </View>
  );
}
