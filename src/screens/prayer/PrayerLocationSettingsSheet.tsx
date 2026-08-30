// Minimal "Location & calculation method" settings surface (task item 7) —
// lets a user see/change their saved coordinates, calculation method and
// madhab after first-run, not just once at setup. Presented as an in-place
// bottom sheet (like PrayerDetailScreen/ConfirmSheet) rather than a new
// stack route, so it needs no change to App.tsx's navigator. Opened from a
// row on PrivacyScreen.
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as Location from 'expo-location';

import * as PrayerSettingsService from '../../services/prayerSettings';
import type { CalculationMethod, Madhab, PrayerCalcSettings } from '../../services/prayerSettings';
import { formatCoordinates } from '../../lib/prayerTimes';
import { colors } from '../../theme/tokens';
import BottomSheetModal from '../../components/BottomSheetModal';
import PressableScale from '../../components/PressableScale';
import SecondaryButton from '../../components/SecondaryButton';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';

const METHODS: { value: CalculationMethod; label: string }[] = [
  { value: 'MuslimWorldLeague', label: 'Muslim World League' },
  { value: 'Egyptian', label: 'Egyptian General Authority' },
  { value: 'Karachi', label: 'University of Islamic Sciences, Karachi' },
  { value: 'UmmAlQura', label: 'Umm al-Qura, Makkah' },
  { value: 'Dubai', label: 'Dubai' },
  { value: 'MoonsightingCommittee', label: 'Moonsighting Committee' },
  { value: 'NorthAmerica', label: 'ISNA (North America)' },
  { value: 'Kuwait', label: 'Kuwait' },
  { value: 'Qatar', label: 'Qatar' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Tehran', label: 'Tehran' },
  { value: 'Turkey', label: 'Turkey (Diyanet approximation)' },
];

const MADHABS: { value: Madhab; label: string; sub: string }[] = [
  { value: 'Shafi', label: 'Shafi’i', sub: 'Earlier Asr time' },
  { value: 'Hanafi', label: 'Hanafi', sub: 'Later Asr time' },
];

type Props = {
  visible: boolean;
  userId: string;
  onClose: () => void;
};

export default function PrayerLocationSettingsSheet({ visible, userId, onClose }: Props) {
  const [settings, setSettings] = useState<PrayerCalcSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const s = await PrayerSettingsService.getPrayerCalcSettings(userId);
        if (!cancelled) {
          setSettings(s);
          setLoading(false);
        }
      } catch (e) {
        if (cancelled) return;
        setLoading(false);
        setToastMsg(e instanceof Error ? e.message : 'Could not load your prayer settings.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  const onRedetect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setToastMsg('Location permission is required to update your coordinates.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await PrayerSettingsService.setLocation(userId, position.coords.latitude, position.coords.longitude, timezone);
      setSettings(await PrayerSettingsService.getPrayerCalcSettings(userId));
      setToastMsg('Location updated.');
    } catch (e) {
      setToastMsg(e instanceof Error ? e.message : 'Could not detect your location.');
    } finally {
      setBusy(false);
    }
  };

  const onPickMethod = async (method: CalculationMethod) => {
    if (busy || !settings || settings.calculationMethod === method) return;
    const previous = settings;
    setSettings({ ...settings, calculationMethod: method });
    setBusy(true);
    try {
      await PrayerSettingsService.setCalculationMethod(userId, method);
    } catch (e) {
      setSettings(previous);
      setToastMsg(e instanceof Error ? e.message : 'Could not save that method.');
    } finally {
      setBusy(false);
    }
  };

  const onPickMadhab = async (madhab: Madhab) => {
    if (busy || !settings || settings.madhab === madhab) return;
    const previous = settings;
    setSettings({ ...settings, madhab });
    setBusy(true);
    try {
      await PrayerSettingsService.setMadhab(userId, madhab);
    } catch (e) {
      setSettings(previous);
      setToastMsg(e instanceof Error ? e.message : 'Could not save that madhab.');
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <BottomSheetModal visible onClose={onClose}>
      <Text style={{ fontSize: 20, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.02 }}>Location & calculation method</Text>
      <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 8, lineHeight: 20 }}>Used to calculate your real prayer times and Qibla direction.</Text>

      {loading ? (
        <View style={{ gap: 10, marginTop: 18 }}>
          <SkeletonBlock width="100%" height={52} radius={16} />
          <SkeletonBlock width="100%" height={200} radius={16} />
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 420, marginTop: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.08, textTransform: 'uppercase', color: colors.inkSecondary }}>Location</Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkStrong, marginTop: 6 }}>{settings ? formatCoordinates(settings.latitude, settings.longitude) : 'Not set'}</Text>
              {settings && <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 4 }}>{settings.timezone}</Text>}
            </View>
            <PressableScale
              onPress={onRedetect}
              disabled={busy}
              style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.primary }}>Re-detect</Text>
            </PressableScale>
          </View>

          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginTop: 20, marginBottom: 10 }}>Madhab (Asr time)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MADHABS.map((m) => {
              const on = settings?.madhab === m.value;
              return (
                <PressableScale
                  key={m.value}
                  onPress={() => onPickMadhab(m.value)}
                  disabled={busy || !settings}
                  style={{ flex: 1, minHeight: 56, borderRadius: 14, borderWidth: on ? 0 : 1, borderColor: colors.cardBorder, backgroundColor: on ? colors.primary : '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: on ? '#FFFFFF' : colors.inkStrong }}>{m.label}</Text>
                  <Text style={{ fontSize: 11, color: on ? 'rgba(255,255,255,0.8)' : colors.inkSecondary, marginTop: 2 }}>{m.sub}</Text>
                </PressableScale>
              );
            })}
          </View>

          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.1, textTransform: 'uppercase', color: colors.inkSecondary, marginTop: 20, marginBottom: 10 }}>Calculation method</Text>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            {METHODS.map((m, i) => {
              const on = settings?.calculationMethod === m.value;
              return (
                <PressableScale
                  key={m.value}
                  onPress={() => onPickMethod(m.value)}
                  disabled={busy || !settings}
                  style={{
                    minHeight: 48,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: i === METHODS.length - 1 ? 0 : 1,
                    borderColor: colors.divider,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: on ? colors.primaryTint : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: on ? '600' : '500', color: on ? colors.primary : colors.inkStrong, flex: 1 }}>{m.label}</Text>
                  {on && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
                </PressableScale>
              );
            })}
          </View>
        </ScrollView>
      )}

      <SecondaryButton label="Close" onPress={onClose} style={{ marginTop: 14 }} />
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </BottomSheetModal>
  );
}
