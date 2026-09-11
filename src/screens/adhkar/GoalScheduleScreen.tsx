import React, { useCallback, useState } from 'react';
import {
  Linking,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../../state/AuthContext';
import { listGoals } from '../../services/adhkar';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';
import { ChevronLeftIcon } from '../../theme/icons';

const ARABIC_FONT = 'ScheherazadeNew_500Medium';
const ARABIC_BOLD = 'ScheherazadeNew_700Bold';
const GOLD = '#D4A853';
const GOLD_DARK = '#A07830';

const TITLE_TO_ARABIC: Record<string, string> = {
  'Durood Sharif':       'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
  'Durood Ibrahim':      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
  'SubhanAllah':         'سُبْحَانَ اللهِ',
  'Alhamdulillah':       'الْحَمْدُ لِلَّهِ',
  'AllahuAkbar':         'اللهُ أَكْبَرُ',
  'Astaghfirullah':      'أَسْتَغْفِرُ اللهَ',
  'La ilaha illallah':   'لَا إِلَٰهَ إِلَّا اللَّهُ',
  'Laa ilaaha illallah': 'لَا إِلَٰهَ إِلَّا اللَّهُ',
  'La hawla':            'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
};

const BUILTIN = [
  { key: 'durood',         title: 'Durood Sharif',     arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', goal: 100 },
  { key: 'subhanallah',   title: 'SubhanAllah',        arabic: 'سُبْحَانَ اللهِ',                   goal: 33  },
  { key: 'alhamdulillah', title: 'Alhamdulillah',      arabic: 'الْحَمْدُ لِلَّهِ',                  goal: 33  },
  { key: 'allahuakbar',   title: 'AllahuAkbar',        arabic: 'اللهُ أَكْبَرُ',                     goal: 33  },
  { key: 'astaghfirullah',title: 'Astaghfirullah',     arabic: 'أَسْتَغْفِرُ اللهَ',                 goal: 100 },
  { key: 'lailaha',       title: 'La ilaha illallah',  arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',          goal: 100 },
];

const PRESET_TIMES = [
  { label: '6:00 AM',  hour: 6,  minute: 0 },
  { label: '9:00 AM',  hour: 9,  minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '3:00 PM',  hour: 15, minute: 0 },
  { label: '5:00 PM',  hour: 17, minute: 0 },
  { label: '9:00 PM',  hour: 21, minute: 0 },
];

const DURATION_PRESETS = [
  { label: 'Today only',  getDays: () => 0 },
  { label: '1 week',      getDays: () => 7 },
  { label: 'This month',  getDays: (): number => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate(); } },
  { label: '30 days',     getDays: () => 30 },
  { label: '3 months',    getDays: () => 90 },
];

type DhikrOption = { key: string; title: string; arabic: string; goal: number };

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toGCalDate(d: Date, hour: number, minute: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}${pad(minute)}00`;
}

function buildGCalUrl(title: string, target: number, startDate: Date, endDate: Date, hour: number, minute: number): string {
  const start = toGCalDate(startDate, hour, minute);
  const endH = hour + (minute + 15 >= 60 ? 1 : 0);
  const endM = (minute + 15) % 60;
  const end = toGCalDate(startDate, endH, endM);
  const pad = (n: number) => String(n).padStart(2, '0');
  const until = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}`;
  const recur = `RRULE:FREQ=DAILY;UNTIL=${until}`;

  return (
    'https://www.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(`${title} \u00d7${target}`)}` +
    `&dates=${start}/${end}` +
    `&recur=${encodeURIComponent(recur)}` +
    `&details=${encodeURIComponent(`Daily dhikr reminder\nRecite ${target}\u00d7 ${title} — a daily goal set in Ibtida.`)}`
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function GoalScheduleScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [goalOptions, setGoalOptions] = useState<DhikrOption[]>([]);
  const [selected, setSelected] = useState<DhikrOption>(BUILTIN[0]);
  const [durationIdx, setDurationIdx] = useState(2);
  const [selectedTimes, setSelectedTimes] = useState<Set<number>>(new Set([3, 4])); // 3pm + 5pm default
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      listGoals(user.id)
        .then((goals) => {
          const items: DhikrOption[] = goals
            .filter((g) => !g.completedAt)
            .map((g) => ({
              key: `goal_${g.id}`,
              title: g.title,
              arabic: TITLE_TO_ARABIC[g.title] ?? g.title,
              goal: g.target,
            }));
          setGoalOptions(items);
        })
        .catch(() => {});
    }, [user])
  );

  const endDate = addDays(new Date(), DURATION_PRESETS[durationIdx].getDays());

  const toggleTime = (idx: number) => {
    setSelectedTimes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const onScheduleLocal = async () => {
    if (selectedTimes.size === 0) {
      setToast('Select at least one reminder time.');
      return;
    }
    setSaving(true);
    try {
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) {
        setToast('Notification permission is required. Enable it in Settings.');
        return;
      }
      for (const idx of selectedTimes) {
        const { hour, minute } = PRESET_TIMES[idx];
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `اذكر الله — ${selected.title}`,
            body: `Daily goal: ${selected.goal}× ${selected.title}`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });
      }
      const timeLabels = [...selectedTimes].sort().map((i) => PRESET_TIMES[i].label).join(' & ');
      setToast(`Reminders set at ${timeLabels} daily!`);
    } catch {
      setToast('Could not schedule reminders. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onAddToGCal = () => {
    if (selectedTimes.size === 0) {
      setToast('Select at least one time first.');
      return;
    }
    const times = [...selectedTimes].sort();
    times.forEach((idx, i) => {
      const { hour, minute } = PRESET_TIMES[idx];
      const url = buildGCalUrl(selected.title, selected.goal, new Date(), endDate, hour, minute);
      setTimeout(() => {
        Linking.openURL(url).catch(() => setToast('Could not open Google Calendar.'));
      }, i * 600);
    });
    if (times.length > 1) {
      setToast(`Opening ${times.length} events in Google Calendar…`);
    }
  };

  const allOptions = [...BUILTIN, ...goalOptions];
  const timeLabel = [...selectedTimes].sort().map((i) => PRESET_TIMES[i].label).join(', ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <PressableScale onPress={nav.back} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}>
              <ChevronLeftIcon color={colors.inkMuted} />
            </PressableScale>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.inkStrong, letterSpacing: -0.02 }}>Schedule Dhikr</Text>
              <Text style={{ fontSize: 12.5, color: colors.inkMuted, marginTop: 2 }}>Set daily reminders · sync to calendar</Text>
            </View>
          </View>
          {/* Arabic header card */}
          <LinearGradient
            colors={['#1A0E05', '#2A1A08']}
            style={{ borderRadius: 20, padding: 18, alignItems: 'center', gap: 4 }}
          >
            <Text style={{ fontFamily: ARABIC_BOLD, fontSize: 22, color: GOLD, writingDirection: 'rtl', textAlign: 'center' }}>
              وَاذْكُرُوا اللَّهَ كَثِيرًا
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}40` }} />
              <Text style={{ fontSize: 9, color: `${GOLD}80`, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Remember Allah abundantly — Quran 8:45
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}40` }} />
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 20 }} />

        {/* Step 1: Pick dhikr */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 }}>
            1 · Dhikr
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {allOptions.map((item) => {
              const sel = selected.key === item.key;
              return (
                <PressableScale
                  key={item.key}
                  onPress={() => setSelected(item)}
                  scaleTo={0.96}
                  style={{
                    borderRadius: 18,
                    borderWidth: sel ? 2 : 1,
                    borderColor: sel ? colors.primary : colors.cardBorder,
                    backgroundColor: sel ? colors.primaryTint : colors.card,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                    width: 110,
                  }}
                >
                  <Text style={{ fontFamily: ARABIC_FONT, fontSize: 13, color: colors.ink, writingDirection: 'rtl', textAlign: 'center', marginBottom: 6 }}>
                    {item.arabic}
                  </Text>
                  <Text style={{ fontSize: 10, color: sel ? colors.primary : colors.inkMuted, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 10, color: sel ? colors.primary : colors.inkSecondary, marginTop: 3 }}>
                    ×{item.goal}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>

        {/* Step 2: Duration */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 }}>
            2 · Duration
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DURATION_PRESETS.map((d, i) => {
              const sel = durationIdx === i;
              return (
                <PressableScale
                  key={d.label}
                  onPress={() => setDurationIdx(i)}
                  scaleTo={0.96}
                  style={{
                    borderRadius: 12,
                    borderWidth: sel ? 2 : 1,
                    borderColor: sel ? colors.primary : colors.cardBorder,
                    backgroundColor: sel ? colors.primaryTint : colors.card,
                    paddingHorizontal: 18,
                    paddingVertical: 11,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: sel ? '600' : '400', color: sel ? colors.primary : colors.inkStrong }}>
                    {d.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          <Text style={{ fontSize: 12, color: colors.inkMuted, marginTop: 10 }}>
            Repeats daily until {endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

        {/* Step 3: Reminder times */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 }}>
            3 · Reminder Times
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PRESET_TIMES.map((t, i) => {
              const sel = selectedTimes.has(i);
              return (
                <PressableScale
                  key={t.label}
                  onPress={() => toggleTime(i)}
                  scaleTo={0.96}
                  style={{
                    borderRadius: 12,
                    borderWidth: sel ? 2 : 1,
                    borderColor: sel ? colors.gold : colors.cardBorder,
                    backgroundColor: sel ? colors.goldTint : colors.card,
                    paddingHorizontal: 18,
                    paddingVertical: 11,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {sel && <Text style={{ fontSize: 11 }}>🔔</Text>}
                  <Text style={{ fontSize: 13, fontWeight: sel ? '600' : '400', color: sel ? colors.goldInk : colors.inkStrong }}>
                    {t.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          {selectedTimes.size === 0 && (
            <Text style={{ fontSize: 12, color: colors.danger, marginTop: 8 }}>
              Select at least one reminder time.
            </Text>
          )}
        </View>

        {/* Summary card */}
        {selectedTimes.size > 0 && (
          <View style={{ marginHorizontal: 20, borderRadius: 22, overflow: 'hidden' }}>
            <LinearGradient
              colors={['#2A1A08', '#1A0E04']}
              style={{ padding: 22, gap: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}40` }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: `${GOLD}CC`, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Schedule Summary
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}40` }} />
              </View>

              <Text style={{ fontFamily: ARABIC_BOLD, fontSize: 28, color: GOLD, writingDirection: 'rtl', textAlign: 'center' }}>
                {selected.arabic}
              </Text>

              <Text style={{ fontSize: 15, color: '#FFFFFF', fontWeight: '700', textAlign: 'center' }}>
                {selected.title}
                <Text style={{ fontSize: 13, fontWeight: '400', color: `${GOLD}CC` }}> × {selected.goal}</Text>
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 }}>
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 10, color: `${GOLD}80`, textTransform: 'uppercase', letterSpacing: 0.5 }}>Until</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                    {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <View style={{ width: 1, backgroundColor: `${GOLD}30` }} />
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 10, color: `${GOLD}80`, textTransform: 'uppercase', letterSpacing: 0.5 }}>Remind</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                    {timeLabel}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTAs */}
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: colors.bg,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          gap: 10,
        }}
      >
        {/* Google Calendar */}
        <PressableScale
          onPress={onAddToGCal}
          scaleTo={0.98}
          style={{
            minHeight: 52,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: '#4285F4',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            backgroundColor: '#F8FAFF',
          }}
        >
          <Text style={{ fontSize: 18, lineHeight: 22 }}>📅</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#4285F4' }}>Add to Google Calendar</Text>
        </PressableScale>

        {/* Local notifications */}
        <PressableScale
          onPress={onScheduleLocal}
          scaleTo={0.98}
          style={{
            minHeight: 52,
            borderRadius: 14,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Text style={{ fontSize: 18, lineHeight: 22 }}>🔔</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
            {saving ? 'Scheduling…' : 'Schedule App Reminders'}
          </Text>
        </PressableScale>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
}
