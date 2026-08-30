import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState, PRAYER_TIMES, PrayerName } from '../../state/AppState';
import { useAuth } from '../../state/AuthContext';
import * as PrayerService from '../../services/prayers';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { RiseIn } from '../../components/ScreenFade';
import { HomeSkeleton } from '../../components/Skeleton';
import Toast from '../../components/Toast';
import PressableScale from '../../components/PressableScale';
import ProgressRing from '../../components/ProgressRing';
import StreakDotRow from '../../components/StreakDotRow';
import BarChart from '../../components/BarChart';
import { BellIcon, PinIcon, ArrowRightIcon, SunriseIcon, SunIcon, DuskIcon, SundownIcon, MoonIcon, CheckIcon, SearchIcon, BookIcon, TimerIcon } from '../../theme/icons';

const TILE_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Fajr: SunriseIcon,
  Dhuhr: SunIcon,
  Asr: DuskIcon,
  Maghrib: SundownIcon,
  Isha: MoonIcon,
};

const STREAK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const TODAY = PrayerService.todayISODate();

export default function HomeScreen() {
  const { state } = useAppState();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [logged, setLogged] = useState<Record<PrayerName, boolean> | null>(null);
  const [busy, setBusy] = useState<Set<PrayerName>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    PrayerService.getPrayerLog(user.id, TODAY)
      .then((result) => {
        if (!cancelled) setLogged(result);
      })
      .catch((e) => {
        if (cancelled) return;
        setLogged((l) => l ?? PrayerService.emptyPrayerRecord(false));
        setToastMsg(e instanceof Error ? e.message : 'Could not load today’s prayers.');
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleTilePress = useCallback(
    async (name: PrayerName) => {
      if (!user || busy.has(name)) return;
      const prevVal = logged?.[name] ?? false;
      setLogged((l) => (l ? { ...l, [name]: !prevVal } : l));
      setBusy((b) => new Set(b).add(name));
      try {
        const next = await PrayerService.togglePrayer(user.id, name, TODAY);
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
    [user, busy, logged]
  );

  const dailyPrayers = PRAYER_TIMES.filter((p) => p.state !== 'sunrise');
  const doneCount = logged ? dailyPrayers.filter((p) => logged[p.name as PrayerName]).length : 0;
  const dayPct = Math.round((doneCount / 5) * 100);
  const impactText = state.impact.toLocaleString('en-US');

  if (state.booting || !logged) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <HomeSkeleton />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Greeting header */}
        <RiseIn style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
            <PressableScale onPress={nav.profile} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#D8E6F5', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#3E6191' }}>UA</Text>
            </PressableScale>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#1B2430', letterSpacing: -0.01 }} numberOfLines={1}>
                Assalam-o-Alaikum {'\u{1F44B}'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <PinIcon />
                <Text style={{ fontSize: 12.5, color: colors.inkSecondary }}>Lahore, Pakistan</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <PressableScale
              onPress={nav.search}
              accessibilityRole="button"
              accessibilityLabel="Search"
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
            >
              <SearchIcon size={19} color="#5B6472" />
            </PressableScale>
            <PressableScale
              onPress={nav.notifications}
              accessibilityRole="button"
              accessibilityLabel="Notifications, unread"
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
            >
              <BellIcon />
              <View style={{ position: 'absolute', top: 2, right: 3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5484D', borderWidth: 1.5, borderColor: '#FFFFFF' }} />
            </PressableScale>
          </View>
        </RiseIn>

        {/* Hadith quote card */}
        <RiseIn delay={50} style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: '#EFF4FA' }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
              <Svg width={22} height={18} viewBox="0 0 22 18">
                <Path
                  d="M8.4 1.5C4.6 3 2 6 2 9.8c0 3.4 2 5.7 4.8 5.7 2.4 0 4.2-1.7 4.2-4 0-2.2-1.5-3.8-3.6-3.8-.4 0-.8 0-1 .1.5-2 2-3.6 4-4.6zM20.4 1.5C16.6 3 14 6 14 9.8c0 3.4 2 5.7 4.8 5.7 2.4 0 4.2-1.7 4.2-4 0-2.2-1.5-3.8-3.6-3.8-.4 0-.8 0-1 .1.5-2 2-3.6 4-4.6z"
                  fill="#A9C0DC"
                />
              </Svg>
              <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', fontSize: 19, lineHeight: 38, color: '#3E6FA8', textAlign: 'center', marginTop: 14, writingDirection: 'rtl' }}>
                مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 22, color: '#3B4653', textAlign: 'center', marginTop: 16 }}>
                The Prophet <Text style={{ fontFamily: 'NotoNaskhArabic_500Medium', color: '#3E6FA8' }}>{'ﷺ'}</Text> said: “Whoever guides someone to goodness will have a reward similar to
                the one who acts upon it.”
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.inkSecondary, textAlign: 'center', marginTop: 14 }}>(Sahih Muslim, Book of Leadership, Hadith 1893)</Text>
            </View>
            <View style={{ height: 40 }} />
          </View>
        </RiseIn>

        {/* Invite banner */}
        <RiseIn delay={100} style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <PressableScale
            onPress={nav.community}
            scaleTo={0.985}
            style={{
              borderWidth: 1,
              borderColor: 'rgba(107,79,160,0.14)',
              borderRadius: 22,
              padding: 17,
              backgroundColor: '#EEEEFB',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#DFD6F7', alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
                <Circle cx={9} cy={8.6} r={3.1} fill="#6B4FA0" />
                <Path d="M3.6 19c0-3 2.4-5 5.4-5s5.4 2 5.4 5z" fill="#6B4FA0" />
                <Circle cx={16.6} cy={9.4} r={2.5} fill="#8C6FC4" />
                <Path d="M13.6 19c0-2.6 1.6-4.3 3.6-4.3s3.4 1.7 3.4 4.3z" fill="#8C6FC4" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#3E3266' }}>One Million Musallis</Text>
              <Text style={{ fontSize: 12.5, color: '#5E5880', marginTop: 5, lineHeight: 17 }}>Invite your loved ones and earn endless rewards.</Text>
            </View>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightIcon />
            </View>
          </PressableScale>
        </RiseIn>

        {/* Today's progress header */}
        <RiseIn delay={150} style={{ paddingHorizontal: 20, marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1B2430', letterSpacing: -0.015 }}>Today’s Progress</Text>
          <PressableScale onPress={nav.progress} style={{ backgroundColor: colors.primaryTint, borderRadius: 11, paddingVertical: 8, paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>View All</Text>
          </PressableScale>
        </RiseIn>

        {/* Progress ring card */}
        <RiseIn delay={200} style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <View style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 22, padding: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <ProgressRing size={104} strokeWidth={11} progress={dayPct / 100} color="#4E8FE0">
              <Text style={{ fontSize: 25, fontWeight: '700', color: '#1B2430', letterSpacing: -0.02 }}>{dayPct}%</Text>
            </ProgressRing>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1B2430' }}>Today’s Prayers</Text>
              <Text style={{ fontSize: 12.5, color: colors.inkSecondary, marginTop: 7 }}>{doneCount} of 5 Completed</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1B2430' }}>Asr 3:40 pm</Text>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#EDF0F4', overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: '78%', borderRadius: 3, backgroundColor: '#4E8FE0' }} />
                </View>
              </View>
              <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 9 }}>
                {Math.floor(state.secs / 60)}m {String(state.secs % 60).padStart(2, '0')}s remaining
              </Text>
            </View>
          </View>
        </RiseIn>

        {/* Prayer tiles */}
        <RiseIn delay={250} style={{ paddingHorizontal: 20, marginTop: 12, flexDirection: 'row', gap: 7 }}>
          {dailyPrayers.map((p) => {
            const name = p.name as PrayerName;
            const done = !!logged[name];
            const current = p.name === 'Asr';
            const Icon = TILE_ICON[p.name] ?? SunIcon;
            return (
              <PressableScale
                key={p.name}
                onPress={() => handleTilePress(name)}
                disabled={busy.has(name)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderWidth: 1,
                  borderColor: current ? 'rgba(76,169,107,0.35)' : colors.cardBorder,
                  borderRadius: 15,
                  paddingVertical: 11,
                  paddingHorizontal: 2,
                  backgroundColor: current ? colors.successTintStrong : '#FFFFFF',
                  alignItems: 'center',
                  gap: 6,
                  opacity: busy.has(name) ? 0.6 : 1,
                }}
              >
                <Icon size={20} color={current ? '#4CA96B' : '#8A93A0'} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#1B2430' }}>{p.short}</Text>
                <Text style={{ fontSize: 12, color: '#5C6673' }}>{p.time.replace(' AM', ' am').replace(' PM', ' pm')}</Text>
                {done ? (
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.successStrong, alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon size={9} />
                  </View>
                ) : (
                  <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#D3D8DE' }} />
                )}
              </PressableScale>
            );
          })}
        </RiseIn>

        {/* Quick actions — §7 requires Quran to be prominent from Home, and
            this is the entry point into the Ibadah Focus flow. */}
        <RiseIn delay={275} style={{ paddingHorizontal: 20, marginTop: 14, flexDirection: 'row', gap: 10 }}>
          {[
            { title: 'Quran', sub: 'Al-Baqarah · 72%', Icon: BookIcon, tint: colors.primaryTint, ink: '#2F5CA3', go: nav.quran },
            { title: 'Ibadah Focus', sub: 'Finish your goal', Icon: TimerIcon, tint: colors.goldTint, ink: colors.goldInk, go: nav.focusSetup },
          ].map((q) => (
            <PressableScale
              key={q.title}
              onPress={q.go}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={`${q.title}. ${q.sub}`}
              style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 22, padding: 16, backgroundColor: '#FFFFFF', gap: 10 }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: q.tint, alignItems: 'center', justifyContent: 'center' }}>
                <q.Icon size={20} color={q.ink} />
              </View>
              <View>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#1B2430' }}>{q.title}</Text>
                <Text style={{ fontSize: 12, color: colors.inkSecondary, marginTop: 4 }}>{q.sub}</Text>
              </View>
            </PressableScale>
          ))}
        </RiseIn>

        {/* Daily Dhikr Streak */}
        <RiseIn delay={300} style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <PressableScale onPress={nav.tasbeeh} scaleTo={0.985} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 22, padding: 18, backgroundColor: '#FFFFFF' }}>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#1B2430' }}>Daily Dhikr Streak</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 14 }}>
              <View>
                <Text style={{ fontSize: 30, fontWeight: '700', color: '#1B2430', letterSpacing: -0.025 }}>7</Text>
                <Text style={{ fontSize: 11.5, color: colors.inkSecondary, marginTop: 6 }}>Days</Text>
              </View>
              <StreakDotRow days={STREAK_LABELS.map((label, i) => ({ label, hit: i < 5 }))} />
            </View>
          </PressableScale>
        </RiseIn>

        {/* Community Impact */}
        <RiseIn delay={350} style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <PressableScale
            onPress={nav.community}
            scaleTo={0.985}
            style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 22, padding: 18, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#1B2430' }}>Community Impact</Text>
              <Text style={{ fontSize: 27, fontWeight: '700', color: '#1B2430', letterSpacing: -0.025, marginTop: 12 }}>{impactText}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 }}>
                <Text style={{ fontSize: 11.5, color: colors.inkSecondary }}>Dhikr counted today</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.successText }}>+18,421 today</Text>
              </View>
            </View>
            <BarChart values={[34, 48, 58, 70, 84, 100]} />
          </PressableScale>
        </RiseIn>
      </ScrollView>
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </View>
  );
}
