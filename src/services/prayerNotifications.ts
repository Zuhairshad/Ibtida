// Motivational prayer-time & dhikr-chain notification scheduler.
//
// SCHEDULING STRATEGY (same as wakeAlarmScheduling.ts):
//   • One DATE-triggered notification per slot per day — prayer times drift
//     daily so DAILY triggers would be off within weeks.
//   • 7-day rolling window; re-schedule on every app foreground (App.tsx).
//   • Identifier prefix "motiv:" lets us cancel only our notifications without
//     touching wake-alarm slots.
//   • iOS hard-cap is 64 pending notifications across all channels. This file
//     schedules up to 5 prayers × 7 days + 3 dhikr × 7 days = 56 — safe even
//     when a few wake-alarm slots are also scheduled.
//
// TAP ROUTING (App.tsx):
//   • data.kind === 'prayer-adhan'  → nav.prayer()
//   • data.kind === 'dhikr-chain'   → nav.tasbeeh()
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { computePrayerTimes } from '../lib/prayerTimes';
import type { PrayerCalcSettings } from './prayerSettings';

export const MOTIV_CHANNEL_ID = 'prayer-motivation';
const ID_PREFIX = 'motiv:';
const SCHEDULE_DAYS = 7;

// ─── Content library ─────────────────────────────────────────────────────────
// Each prayer pool has 7 entries — indexed by day-of-week (0 = Sun) so the
// same prayer feels fresh each day of the week without needing a server.

type Entry = { title: string; body: string };

const FAJR: Entry[] = [
  {
    title: 'الصَّلَاةُ خَيْرٌ مِّنَ النَّوْمِ',
    body: 'Two rak\'ahs of Fajr are better than this world and all it contains. Rise now. — Sahih Muslim 725',
  },
  {
    title: 'فَجَرَ اللَّيْلُ — Dawn has broken',
    body: 'Whoever prays Fajr is under Allah\'s protection for the whole day. Guard this shield. — Sahih Muslim 657',
  },
  {
    title: 'وَقُرْآنَ الْفَجْرِ • Fajr',
    body: 'The Fajr recitation is witnessed by the angels of the night and the angels of the day. — Quran 17:78',
  },
  {
    title: 'يَا أَيُّهَا الْمُزَّمِّلُ — Rise',
    body: 'The Prophet ﷺ woke his household each morning: "Get up and pray." Your blessing begins here.',
  },
  {
    title: 'بَرَكَةُ الصُّبْحِ • Morning blessing',
    body: '"O Allah, bless my Ummah in their early mornings." — Tirmidhi 1212. Be in that blessed hour.',
  },
  {
    title: 'مَوَاقِيتَ الصَّلَاةِ • Fajr now',
    body: 'Prayer has been decreed upon the believers at specified times. — Quran 4:103. This time is Fajr.',
  },
  {
    title: 'قِيَامُ اللَّيْلِ • Before dawn fades',
    body: 'Allah descends to the lowest heaven in the last third of night: "Who will ask Me?" — Sahih Bukhari 1145',
  },
];

const DHUHR: Entry[] = [
  {
    title: 'صَلَاةُ الظُّهْرِ • Dhuhr',
    body: '"Pray as if it is your last prayer." — Ibn Majah 4171. Midday — make it count.',
  },
  {
    title: 'فَأَقِيمُوا الصَّلَاةَ • Establish prayer',
    body: 'Prayer prevents immorality and wrongdoing — and the remembrance of Allah is greater. — Quran 29:45',
  },
  {
    title: 'بَيْنَ الْأَذَانَيْنِ • Your window',
    body: 'Between every adhan and iqama there is a du\'a that is not rejected. Make yours now. — Hadith',
  },
  {
    title: 'مَوَاقِيتَ الصَّلَاةِ • Dhuhr time',
    body: 'The first thing you will be asked about on the Day of Judgment is your prayer. — Tirmidhi 413',
  },
  {
    title: 'سُنَّةُ الظُّهْرِ • Prophet\'s habit',
    body: 'Four rak\'ahs before Dhuhr — the Prophet ﷺ never missed them. A few minutes for eternal reward.',
  },
  {
    title: 'ذِكْرُ اللَّهِ • Remember Allah',
    body: '"Verily, in the remembrance of Allah do hearts find rest." — Quran 13:28. Pray and find peace.',
  },
  {
    title: 'الظُّهْرُ • Midday rak\'ahs',
    body: 'Whoever prays 12 sunnah rak\'ahs daily, Allah builds a house for him in Jannah. — Sahih Muslim 728',
  },
];

const ASR: Entry[] = [
  {
    title: 'حَافِظُوا عَلَى الصَّلَوَاتِ • Asr',
    body: '"Guard strictly your prayers, especially the middle prayer (Asr)." — Quran 2:238. It is now.',
  },
  {
    title: 'صَلَاةُ الْعَصْرِ • Asr',
    body: 'He who misses Asr is as if he lost his family and wealth. — Sahih Bukhari 552. Guard this prayer.',
  },
  {
    title: 'الْعَصْرُ • Angel witness',
    body: 'Angels alternate at Fajr and Asr — they will testify about what you did today. — Sahih Bukhari 555',
  },
  {
    title: 'صَلَاةُ الْعَصْرِ • Asr now',
    body: '"Whoever prays before sunrise and before sunset will not enter Hell." — Sahih Muslim 634. Pray Asr.',
  },
  {
    title: 'وَالْعَصْرِ • By the declining day',
    body: '"By the declining day — mankind is in loss, except those who believe and do righteous deeds." — Quran 103',
  },
  {
    title: 'الْعَصْرُ • Sujood now',
    body: 'The angels of night and day meet at Asr — let them find you in prostration. — Sahih Bukhari 555',
  },
  {
    title: 'صَلَاةُ الْعَصْرِ • Most valued',
    body: '"The best deed is prayer at its time." — Sahih Bukhari 527. Asr is at its time — right now.',
  },
];

const MAGHRIB: Entry[] = [
  {
    title: 'صَلَاةُ الْمَغْرِبِ • Sunset prayer',
    body: 'The Prophet ﷺ was swift to pray Maghrib — hasten to Allah at this blessed turning of the day.',
  },
  {
    title: 'الْمَغْرِبُ • Du\'a time',
    body: '"Between adhan and iqama there is a du\'a that is not rejected." — Abu Dawud 521. Make yours now.',
  },
  {
    title: 'أَبْوَابُ الْجَنَّةِ • Gates open',
    body: 'The gates of heaven are open at sunset. Your du\'a rises now. Make the most of this moment.',
  },
  {
    title: 'صَلَاةُ الْمَغْرِبِ • Pray now',
    body: '"When the night advances from this side and the day retreats — it is time to pray." — Quran 17:78',
  },
  {
    title: 'الْمَغْرِبُ • Evening mercy',
    body: '"Rush to remember Allah — that is your shade on the Day there is no shade." — Hadith. Maghrib is now.',
  },
  {
    title: 'وَقْتُ الْمَغْرِبِ • Precious time',
    body: 'Three rak\'ahs of Maghrib. Then sunnah. Then sit and make du\'a before the night fully arrives.',
  },
  {
    title: 'صَلَاةُ الْمَغْرِبِ • Hasten',
    body: '"The Ummah will remain well as long as they hasten to break fast and pray Maghrib." — Ahmad 22756',
  },
];

const ISHA: Entry[] = [
  {
    title: 'صَلَاةُ الْعِشَاءِ • Night prayer',
    body: '"Whoever prays Isha in congregation, it is as if he stood half the night in prayer." — Sahih Muslim 656',
  },
  {
    title: 'الْعِشَاءُ • Close the day right',
    body: '"If people knew the reward of Isha in congregation, they would come even crawling." — Sahih Bukhari 615',
  },
  {
    title: 'أَقْرَبُ مَا يَكُونُ • Closest to Allah',
    body: '"The closest you are to Allah is while in prostration." — Sahih Muslim 482. One more sujood tonight.',
  },
  {
    title: 'صَلَاةُ الْعِشَاءِ • Guard it',
    body: '"Isha and Fajr are the heaviest prayers for hypocrites." Guard what they abandon. — Sahih Bukhari 657',
  },
  {
    title: 'الْعِشَاءُ • Seal the day',
    body: '"Make the last of your deeds each day your prayer." — Ibn Majah. Isha closes the day in worship.',
  },
  {
    title: 'صَلَاةُ الْعِشَاءِ • Final rak\'ahs',
    body: 'The Prophet ﷺ disliked sleeping before Isha. Pray now — then rest with a clean heart.',
  },
  {
    title: 'وِتْرُ اللَّيْلِ • Night\'s gift',
    body: '"Allah loves the one who prays witr after Isha." Seal tonight with witr — 3 rak\'ahs. — Abu Dawud 1416',
  },
];

// Dhikr chain: 3 slots per day, 7 rotating entries each
type DhikrSlot = 'morning' | 'midday' | 'evening';

const DHIKR: Record<DhikrSlot, Entry[]> = {
  morning: [
    {
      title: 'أَذْكَارُ الصَّبَاحِ • Morning dhikr',
      body: '"Whoever says SubhanAllah 100 times at dawn — 100 trees are planted for him in Jannah." — Sahih Muslim 2693',
    },
    {
      title: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
      body: 'Say SubhanAllahi wa bihamdihi 100 times — your sins are forgiven even if like sea foam. — Sahih Bukhari 6405',
    },
    {
      title: 'اللهُ أَكْبَرُ • Allah is Greatest',
      body: '"Two words light on the tongue, heavy on the scale, beloved to the Most Merciful: SubhanAllahil Azeem." — Sahih Bukhari 6682',
    },
    {
      title: 'أَذْكَارُ الصَّبَاحِ • Shield yourself',
      body: '"Whoever says Ayatul Kursi in the morning — a guardian from Allah protects him until evening." — Nasai',
    },
    {
      title: 'بِسْمِ اللهِ • Start with Allah',
      body: '"Any matter of importance not begun with Bismillah is cut off from blessings." Begin today with His name.',
    },
    {
      title: 'حَسْبِيَ اللهُ • Allah suffices',
      body: '"Hasbunallah wa ni\'mal wakeel" — Ibrahim ﷺ said this as he was thrown into fire. Allah suffices you.',
    },
    {
      title: 'أَذْكَارُ الصَّبَاحِ • Rise with dhikr',
      body: 'A tongue wet with Allah\'s remembrance was the Prophet\'s ﷺ morning. Make it yours — starting now.',
    },
  ],
  midday: [
    {
      title: 'الْحَمْدُ لِلَّهِ • Alhamdulillah',
      body: '"Alhamdulillah fills the scale." — Sahih Muslim 223. Say it now — fill your scale with gratitude.',
    },
    {
      title: 'لَا إِلَٰهَ إِلَّا اللَّهُ • Core of faith',
      body: '"The best dhikr is La ilaha illallah." — Tirmidhi 3383. One breath, maximum weight on the scale.',
    },
    {
      title: 'أَسْتَغْفِرُ اللهَ • Seek forgiveness',
      body: '"I seek Allah\'s forgiveness 100 times a day." — Sahih Muslim 2702. The Prophet ﷺ did it. So should you.',
    },
    {
      title: 'ذِكْرُ اللَّهِ • Keep your heart alive',
      body: '"Dead are the hearts of those who do not remember Allah." — Ibn al-Qayyim. Recite now.',
    },
    {
      title: 'سُبْحَانَ اللهِ • Glory be',
      body: '"A tree is planted in Jannah for every SubhanAllah you say." — Tirmidhi 3464. Plant yours now.',
    },
    {
      title: 'رَبِّ اشْرَحْ لِي صَدْرِي • Expand my chest',
      body: '"My Lord, expand my chest, ease my task, untie the knot from my tongue." — Quran 20:25. Say it now.',
    },
    {
      title: 'صَلَّى اللهُ عَلَيْهِ • Durood',
      body: '"Whoever sends blessings on me once, Allah sends 10 blessings on him." — Sahih Muslim 408. Do it now.',
    },
  ],
  evening: [
    {
      title: 'أَذْكَارُ الْمَسَاءِ • Evening adhkar',
      body: '"Whoever says SubhanAllahi wa bihamdihi 100 times in evening — no one will have better deeds." — Muslim 2692',
    },
    {
      title: 'تَوْبَةٌ قَبْلَ النَّوْمِ • Repent',
      body: '"Allah spreads His hand at night to accept the repentance of those who sinned by day." — Muslim 2759',
    },
    {
      title: 'اللَّهُمَّ بِكَ أَمْسَيْنَا',
      body: '"O Allah, by You we enter evening, by You we enter morning, by You we live and die." Recite this now.',
    },
    {
      title: 'آيَةُ الْكُرْسِيِّ • Ayatul Kursi',
      body: '"Whoever recites Ayatul Kursi before sleeping — a guardian from Allah protects him till morning." — Bukhari 2311',
    },
    {
      title: 'سُبْحَانَ اللهِ ٣٣ • Evening tasbih',
      body: 'SubhanAllah 33 × Alhamdulillah 33 × AllahuAkbar 34 = wiped sins, filled scales. Do it now.',
    },
    {
      title: 'وَتَزَوَّدُوا • Take provision',
      body: '"Take provision — the best provision is taqwa." — Quran 2:197. Close this day in obedience.',
    },
    {
      title: 'رَبَّنَا لَا تُؤَاخِذْنَا • Before sleep',
      body: '"Our Lord, do not take us to account if we forget or err." — Quran 2:286. Say this before you sleep.',
    },
  ],
};

// ─── Public API ───────────────────────────────────────────────────────────────

export type MotivNotifData =
  | { kind: 'prayer-adhan'; prayer: string }
  | { kind: 'dhikr-chain'; slot: DhikrSlot };

export function isMotivNotifData(data: unknown): data is MotivNotifData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'kind' in data &&
    ((data as MotivNotifData).kind === 'prayer-adhan' || (data as MotivNotifData).kind === 'dhikr-chain')
  );
}

export function setupMotivationChannel(): void {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(MOTIV_CHANNEL_ID, {
      name: 'Prayer reminders & dhikr',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }).catch(() => {});
  }
}

export async function cancelPrayerMotivationNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => n.identifier.startsWith(ID_PREFIX));
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function schedulePrayerMotivationNotifications(settings: PrayerCalcSettings): Promise<void> {
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  await cancelPrayerMotivationNotifications();

  const now = new Date();

  type PrayerKey = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
  const PRAYERS: PrayerKey[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const PRAYER_POOL: Record<PrayerKey, Entry[]> = {
    Fajr: FAJR,
    Dhuhr: DHUHR,
    Asr: ASR,
    Maghrib: MAGHRIB,
    Isha: ISHA,
  };
  const PRAYER_TIME_KEY: Record<PrayerKey, keyof ReturnType<typeof computePrayerTimes>> = {
    Fajr: 'fajr',
    Dhuhr: 'dhuhr',
    Asr: 'asr',
    Maghrib: 'maghrib',
    Isha: 'isha',
  };

  for (let d = 0; d < SCHEDULE_DAYS; d++) {
    // Build a local-midnight Date for day offset d
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const dow = day.getDay(); // 0 = Sun, used as content rotation index
    const times = computePrayerTimes(
      settings.latitude,
      settings.longitude,
      settings.calculationMethod,
      settings.madhab,
      day,
    );

    // ── Prayer adhan notifications ──────────────────────────────────────────
    for (const prayer of PRAYERS) {
      const at: Date = times[PRAYER_TIME_KEY[prayer]];
      if (at.getTime() <= now.getTime()) continue;

      const entry = PRAYER_POOL[prayer][dow % PRAYER_POOL[prayer].length];
      const data: MotivNotifData = { kind: 'prayer-adhan', prayer };

      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}prayer:${prayer}:${d}`,
        content: {
          title: entry.title,
          body: entry.body,
          sound: 'default',
          data,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: MOTIV_CHANNEL_ID,
        },
      });
    }

    // ── Dhikr chain notifications ───────────────────────────────────────────
    // Morning: 90 min after Fajr (post-prayer adhkar time)
    const morningAt = new Date(times.fajr.getTime() + 90 * 60 * 1000);
    // Midday: 11:30 AM — fills the gap between Fajr and Dhuhr adhkar
    const middayAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 11, 30);
    // Evening: 60 min before Maghrib — prime time for evening adhkar
    const eveningAt = new Date(times.maghrib.getTime() - 60 * 60 * 1000);

    const dhikrSlots: [Date, DhikrSlot][] = [
      [morningAt, 'morning'],
      [middayAt, 'midday'],
      [eveningAt, 'evening'],
    ];

    for (const [at, slot] of dhikrSlots) {
      if (at.getTime() <= now.getTime()) continue;
      const entry = DHIKR[slot][dow % DHIKR[slot].length];
      const data: MotivNotifData = { kind: 'dhikr-chain', slot };

      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}dhikr:${slot}:${d}`,
        content: {
          title: entry.title,
          body: entry.body,
          sound: 'default',
          data,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: MOTIV_CHANNEL_ID,
        },
      });
    }
  }
}
