import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState, PRAYER_TIMES, PrayerName } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import * as PrayerService from '../../services/prayers';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import { RowSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import { PinIcon, QiblaIcon, PrayerIcon, MoonIcon, SunIcon, ChevronRightIcon, CheckIcon, NavCompassIcon } from '../../theme/icons';

const DATES = ['Sun 24', 'Mon 25', 'Tue 26', 'Wed 27', 'Thu 28', 'Fri 29', 'Sat 30'];

export default function PrayerScreen() {
  const { state, toggleQibla, pickDate } = useAppState();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const nextRingProgress = 1 - state.secs / 1436;

  // DATES is a fixed 7-pill display strip (cosmetic, unchanged); the real
  // ISO date each pill reads/writes is derived from the device's current
  // date so prayer_logs gets a real `log_date` regardless of what the
  // static labels say. Index 6 (rightmost pill) is always "today".
  const dateStrings = useMemo(() => {
    const today = new Date();
    return DATES.map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (DATES.length - 1 - i));
      return PrayerService.toISODate(d);
    });
  }, []);
  const selectedDate = dateStrings[state.dateIdx] ?? PrayerService.todayISODate();

  const [logged, setLogged] = useState<Record<PrayerName, boolean> | null>(null);
  // Which date's data `logged` actually reflects — lets "loading" be derived
  // at render time (`loadedDate !== selectedDate`) instead of a separate
  // setState called synchronously inside the fetch effect below.
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const loadingLog = loadedDate !== selectedDate;
  const [busy, setBusy] = useState<Set<PrayerName>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    PrayerService.getPrayerLog(user.id, selectedDate)
      .then((result) => {
        if (cancelled) return;
        setLoadedDate(selectedDate);
        setLogged(result);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadedDate(selectedDate);
        setLogged((l) => l ?? PrayerService.emptyPrayerRecord(false));
        setToastMsg(e instanceof Error ? e.message : 'Could not load your prayer log.');
      });
    return () => {
      cancelled = true;
    };
  }, [user, selectedDate]);

  const handleToggle = useCallback(
    async (name: PrayerName) => {
      if (!user || busy.has(name)) return;
      const prevVal = logged?.[name] ?? false;
      setLogged((l) => (l ? { ...l, [name]: !prevVal } : l));
      setBusy((b) => new Set(b).add(name));
      try {
        const next = await PrayerService.togglePrayer(user.id, name, selectedDate);
        setLogged((l) => (l ? { ...l, [name]: next } : l));
      } catch (e) {
        setLogged((l) => (l ? { ...l, [name]: prevVal } : l));
        setToastMsg(e instanceof Error ? e.message : 'Could not update this prayer log.');
      } finally {
        setBusy((b) => {
          const n = new Set(b);
          n.delete(name);
          return n;
        });
      }
    },
    [user, busy, logged, selectedDate]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <RiseIn style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#1B2430', letterSpacing: -0.025 }}>Prayers</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <PinIcon />
              <Text style={{ fontSize: 12.5, color: colors.inkSecondary }}>Lahore, Pakistan</Text>
            </View>
          </View>
          <PressableScale
            onPress={toggleQibla}
            style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, backgroundColor: '#FFFFFF', minHeight: 44, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 }}
          >
            <QiblaIcon />
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.primary }}>Qibla</Text>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={50} style={{ marginTop: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {DATES.map((d, i) => {
              const [dow, num] = d.split(' ');
              const on = state.dateIdx === i;
              return (
                <PressableScale
                  key={d}
                  onPress={() => pickDate(i)}
                  style={{ width: 50, borderWidth: 1, borderColor: on ? colors.primary : 'rgba(27,36,48,0.08)', borderRadius: 16, paddingVertical: 10, backgroundColor: on ? colors.primary : '#FFFFFF', alignItems: 'center', gap: 6 }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '500', color: on ? '#FFFFFF' : colors.inkSecondary }}>{dow}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#FFFFFF' : '#1B2430' }}>{num}</Text>
                  {i === 3 && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: on ? '#FFFFFF' : colors.primaryFill }} />}
                </PressableScale>
              );
            })}
          </ScrollView>
        </RiseIn>

        {state.qiblaOpen && (
          <RiseIn style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 26, padding: 22, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 20 }}>
              <View style={{ width: 104, height: 104, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 1.5, borderColor: '#E4EAF1' }} />
                <NavCompassIcon size={104} angleDeg={-34} />
                <Text style={{ position: 'absolute', top: 3, fontSize: 10, fontWeight: '700', color: colors.inkSecondary }}>N</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1B2430' }}>Qibla direction</Text>
                <Text style={{ fontSize: 26, fontWeight: '700', color: colors.primary, marginTop: 10 }}>255° W</Text>
                <Text style={{ fontSize: 12, color: '#5C6673', marginTop: 9, lineHeight: 17 }}>From Lahore, Pakistan. Hold the phone flat and turn until the needle points north.</Text>
                <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 8, lineHeight: 15 }}>Compass unavailable in preview — bearing shown from your saved location.</Text>
              </View>
            </View>
          </RiseIn>
        )}

        <RiseIn delay={100} style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ borderWidth: 1, borderColor: 'rgba(27,36,48,0.05)', borderRadius: 26, padding: 22, backgroundColor: '#EFF5FC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59,125,222,0.12)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
                <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.08, textTransform: 'uppercase', color: colors.primary }}>Next Prayer</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 14 }}>
                <Text style={{ fontSize: 30, fontWeight: '700', color: '#1B2430', letterSpacing: -0.025 }}>Asr</Text>
                <Text style={{ fontSize: 17, fontWeight: '500', color: '#5C6673' }}>3:40 pm</Text>
              </View>
              <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 10 }}>
                {Math.floor(state.secs / 60)}m {String(state.secs % 60).padStart(2, '0')}s remaining
              </Text>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.primaryTint, marginTop: 14, width: 148, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: '78%', borderRadius: 3, backgroundColor: colors.primaryFill }} />
              </View>
            </View>
            <ProgressRing size={80} strokeWidth={6} progress={nextRingProgress} trackColor="#E4EAF1" color={colors.primaryFill}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1B2430', textAlign: 'center' }}>
                {String(Math.floor(state.secs / 60)).padStart(2, '0')}:{String(state.secs % 60).padStart(2, '0')}
                {'\n'}
                <Text style={{ fontSize: 9.5, fontWeight: '500', color: colors.inkSecondary }}>Remaining</Text>
              </Text>
            </ProgressRing>
          </View>
        </RiseIn>

        <RiseIn delay={150} style={{ paddingHorizontal: 20, marginTop: 16 }}>
          {loadingLog || !logged ? (
            <RowSkeleton rows={6} />
          ) : (
            <View style={{ gap: 8 }}>
              {PRAYER_TIMES.map((p) => {
                const sunrise = p.state === 'sunrise';
                const current = p.state === 'current';
                const done = !sunrise && !!logged[p.name as PrayerName];
                const isBusy = !sunrise && busy.has(p.name as PrayerName);
                const note = sunrise ? 'Not a prayer time' : done ? 'Logged' : current ? 'Current · 23 min remaining' : p.state === 'done' ? 'Missed · not logged' : 'Upcoming · adhan on';
                const noteInk = current ? '#2F5CA3' : !sunrise && !done && p.state === 'done' ? colors.dangerInk : colors.inkSecondary;
                const Icon = sunrise ? SunIcon : p.name === 'Isha' || p.name === 'Maghrib' ? MoonIcon : PrayerIcon;
                return (
                  <PressableScale
                    key={p.name}
                    onPress={sunrise ? undefined : () => nav.prayerDetail(p.name)}
                    disabled={sunrise}
                    scaleTo={0.985}
                    style={{
                      borderWidth: 1,
                      borderColor: current ? 'rgba(61,115,201,0.25)' : 'rgba(23,32,28,0.05)',
                      borderRadius: 22,
                      paddingVertical: 15,
                      paddingHorizontal: 16,
                      backgroundColor: current ? colors.primaryTint : '#FFFFFF',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 13,
                      minHeight: 48,
                      opacity: isBusy ? 0.6 : 1,
                    }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: p.tint, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={19} color={p.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#1B2430' }}>{p.name}</Text>
                      <Text style={{ fontSize: 12.5, color: noteInk, marginTop: 4 }}>{note}</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: colors.inkStrong }}>{p.time.replace(' AM', ' am').replace(' PM', ' pm')}</Text>
                    {!sunrise &&
                      (done ? (
                        <PressableScale
                          onPress={() => handleToggle(p.name as PrayerName)}
                          disabled={isBusy}
                          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <CheckIcon size={16} />
                        </PressableScale>
                      ) : (
                        <PressableScale
                          onPress={() => handleToggle(p.name as PrayerName)}
                          disabled={isBusy}
                          style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(23,32,28,0.16)', borderStyle: 'dashed', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#5C6673' }}>Log</Text>
                        </PressableScale>
                      ))}
                  </PressableScale>
                );
              })}
            </View>
          )}
        </RiseIn>

        <RiseIn delay={200} style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <PressableScale
            onPress={nav.progress}
            scaleTo={0.985}
            style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 22, padding: 17, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong }}>Qada & missed prayers</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={{ backgroundColor: 'rgba(201,107,107,0.13)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.dangerInk }}>4 outstanding</Text>
              </View>
              <ChevronRightIcon />
            </View>
          </PressableScale>
        </RiseIn>

        <RiseIn delay={250} style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <View style={{ borderRadius: 22, padding: 17, backgroundColor: colors.bgTint }}>
            <Text style={{ fontSize: 12.5, lineHeight: 20, color: '#5C6673' }}>Times are calculated on device (Muslim World League · Hanafi Asr). Missed prayers move to Qada after midnight rather than disappearing.</Text>
          </View>
        </RiseIn>
      </ScrollView>
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </View>
  );
}
