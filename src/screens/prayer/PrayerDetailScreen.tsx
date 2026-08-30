import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigation/types';
import { useAppState, PRAYER_TIMES, PrayerName } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import * as PrayerService from '../../services/prayers';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import BottomSheetModal from '../../components/BottomSheetModal';
import PressableScale from '../../components/PressableScale';
import Toggle from '../../components/Toggle';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import { SkeletonBlock } from '../../components/Skeleton';
import Toast from '../../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'PrayerDetail'>;

const LOG_MODES = ['Missed', 'On time', "In jama’ah"];

// This sheet has no date param (route only carries `prayerName`) — it always
// reads/writes today's log, same as AppState's old single "today" snapshot.
const today = PrayerService.todayISODate();

export default function PrayerDetailScreen({ route }: Props) {
  const { prayerName } = route.params;
  const { state, setLogMode } = useAppState();
  const { user } = useAuth();

  const prayer = PRAYER_TIMES.find((p) => p.name === prayerName) ?? PRAYER_TIMES[3];
  const name = prayer.name as PrayerName;

  const [isLogged, setIsLogged] = useState(false);
  const [adhanOn, setAdhanOn] = useState(true);
  const [marking, setMarking] = useState(false);
  const [adhanBusy, setAdhanBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // Which prayer's data has actually loaded — lets "loading" be derived at
  // render time (`loadedName !== name`) instead of a separate setState called
  // synchronously inside the fetch effect below.
  const [loadedName, setLoadedName] = useState<PrayerName | null>(null);
  const loading = loadedName !== name;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([PrayerService.getPrayerLog(user.id, today), PrayerService.getAdhanSettings(user.id)])
      .then(([log, adhan]) => {
        if (cancelled) return;
        setLoadedName(name);
        setIsLogged(!!log[name]);
        setAdhanOn(!!adhan[name]);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadedName(name);
        setToastMsg(e instanceof Error ? e.message : 'Could not load this prayer.');
      });
    return () => {
      cancelled = true;
    };
  }, [user, name]);

  // Status badge reflects this prayer's real state, not a hardcoded "Current".
  const status = isLogged
    ? { label: 'Logged', bg: colors.successTint, ink: '#2F6B45' }
    : prayer.state === 'current'
      ? { label: 'Current', bg: colors.primaryTint, ink: '#1F3E63' }
      : prayer.state === 'done'
        ? { label: 'Missed', bg: 'rgba(201,107,107,0.13)', ink: colors.dangerInk }
        : { label: 'Upcoming', bg: colors.bgTint, ink: colors.inkMuted };

  const onMark = async () => {
    if (!user || marking) return;
    setMarking(true);
    try {
      const next = await PrayerService.togglePrayer(user.id, name, today);
      setIsLogged(next);
      nav.back();
    } catch (e) {
      setToastMsg(e instanceof Error ? e.message : 'Could not update this prayer log.');
    } finally {
      setMarking(false);
    }
  };

  const onToggleAdhan = async () => {
    if (!user || adhanBusy) return;
    const prev = adhanOn;
    setAdhanOn(!prev);
    setAdhanBusy(true);
    try {
      const next = await PrayerService.toggleAdhan(user.id, name);
      setAdhanOn(next);
    } catch (e) {
      setAdhanOn(prev);
      setToastMsg(e instanceof Error ? e.message : 'Could not update adhan notification.');
    } finally {
      setAdhanBusy(false);
    }
  };

  return (
    <BottomSheetModal visible onClose={nav.back}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.02 }}>{prayer.name}</Text>
          <Text style={{ fontSize: 14, color: colors.inkMuted, marginTop: 8 }}>
            {prayer.time} · ends {prayer.endsAt}
          </Text>
        </View>
        {loading ? (
          <SkeletonBlock width={64} height={30} radius={12} />
        ) : (
          <View style={{ backgroundColor: status.bg, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: status.ink }}>{status.label}</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
        {LOG_MODES.map((label, i) => {
          const on = state.logMode === i;
          return (
            <PressableScale
              key={label}
              scaleTo={1}
              onPress={() => setLogMode(i)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Log as ${label}`}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: 14,
                backgroundColor: on ? colors.primary : '#FFFFFF',
                borderWidth: on ? 0 : 1,
                borderColor: 'rgba(23,32,28,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: on ? '600' : '500', color: on ? '#FFFFFF' : colors.inkMuted }}>{label}</Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={{ marginTop: 10, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, backgroundColor: '#FFFFFF', padding: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary }}>Optional note</Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: colors.inkSecondary, marginTop: 10 }}>
          {isLogged ? 'Prayed at the masjid with Yusuf’s father.' : 'Add a note after you log this prayer.'}
        </Text>
      </View>

      <PressableScale
        onPress={onToggleAdhan}
        disabled={loading || adhanBusy}
        scaleTo={0.99}
        accessibilityRole="switch"
        accessibilityState={{ checked: adhanOn }}
        accessibilityLabel="Adhan notification"
        style={{
          marginTop: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: 20,
          backgroundColor: '#FFFFFF',
          paddingVertical: 15,
          paddingHorizontal: 16,
          opacity: loading || adhanBusy ? 0.6 : 1,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkStrong }}>Adhan notification</Text>
        <Toggle on={adhanOn} />
      </PressableScale>

      <PrimaryButton label={isLogged ? 'Remove log' : 'Mark as prayed'} onPress={onMark} disabled={loading} loading={marking} style={{ marginTop: 16 }} />
      <SecondaryButton label="Cancel" onPress={nav.back} style={{ marginTop: 2 }} />
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </BottomSheetModal>
  );
}
