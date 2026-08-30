// Ported from the Component `state` + `renderVals()` logic in Ibadah v5.dc.html.
// Navigation itself is handled by React Navigation; this context now only owns
// what's genuinely ephemeral UI state — everything that has a real Supabase
// table behind it (prayer logs/adhan, adhkar goals/tasbeeh, quran bookmarks/
// reader settings, privacy/notifications, community circles/goals, focus
// settings/sessions) was migrated out to `src/services/*.ts` + local screen
// state by the domain agents; see each screen for its own fetch/mutate logic.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export type PrayerDef = {
  name: PrayerName | 'Sunrise';
  short: string;
  time: string;
  /** When this prayer's window closes — shown in the detail sheet. */
  endsAt: string;
  state: 'done' | 'sunrise' | 'current' | 'upcoming';
  color: string;
  tint: string;
};

export const PRAYER_TIMES: PrayerDef[] = [
  { name: 'Fajr', short: 'Fajr', time: '4:10 AM', endsAt: '5:35 AM', state: 'done', color: '#4A7FC1', tint: '#DDEAF4' },
  { name: 'Sunrise', short: 'Sunrise', time: '5:35 AM', endsAt: '12:05 PM', state: 'sunrise', color: '#C9902E', tint: '#FBF2DC' },
  { name: 'Dhuhr', short: 'Dhuhr', time: '12:05 PM', endsAt: '3:40 PM', state: 'done', color: '#D9822E', tint: '#FBEBDA' },
  { name: 'Asr', short: 'Asr', time: '3:40 PM', endsAt: '6:33 PM', state: 'current', color: '#5EAA78', tint: '#E3F3EA' },
  { name: 'Maghrib', short: 'Maghrib', time: '6:33 PM', endsAt: '7:57 PM', state: 'upcoming', color: '#C0563F', tint: '#F7DEDE' },
  { name: 'Isha', short: 'Isha', time: '7:57 PM', endsAt: '4:10 AM', state: 'upcoming', color: '#2F4B6E', tint: '#DCE3EC' },
];

const IMPACT_TARGET = 2847391;

// Pure constant lookup tables — still consumed directly by screens
// (PrivacyScreen, NotificationsScreen's copy, FocusSetupScreen) even though
// the *values* behind each key now live in Supabase (privacy_settings /
// notification_settings / focus_settings), not in this context's State.
export const PRIVACY_OPTIONS: Record<string, string[]> = {
  'Profile visibility': ['Private', 'Circles', 'Friends'],
  'Activity visibility': ['Private', 'Circles', 'Public'],
  'Community participation': ['On', 'Off'],
  'Goal visibility': ['Circles', 'Private', 'Public'],
  Location: ['While in use', 'Never'],
  Analytics: ['Off', 'On'],
};

export const NOTIFICATION_CATEGORIES = ['Prayer', 'Adhkar', 'Goals', 'Quran', 'Focus', 'Community'];

export const FOCUS_DURATIONS = ['Until goal completed', '15 minutes', '30 minutes', '1 hour'];

type State = {
  /** Onboarding intention toggles (IntentionsScreen) — local to that one screen's session, never persisted. */
  intents: boolean[];
  /** Community tab strip selection (CommunityScreen). */
  commTab: number;
  /** Quran tab strip selection (QuranScreen). */
  quranTab: number;
  /** Adhkar screen's mode toggle. */
  adhkarMode: number;
  /** Prayer detail sheet's log-mode toggle. */
  logMode: number;
  /** Date pill strip selection (PrayerScreen) — mapped to a real ISO date by the screen itself. */
  dateIdx: number;
  qiblaOpen: boolean;
  /** 1s countdown to next prayer, decorative on Home/PrayerScreen. */
  secs: number;
  /** Animated Community Impact counter on Home, eases up on mount/re-entry. */
  impact: number;
  /** Home's entrance-skeleton flag. */
  booting: boolean;
};

const initialState: State = {
  intents: [true, true, false, false, false],
  commTab: 0,
  quranTab: 0,
  adhkarMode: 0,
  logMode: 1,
  dateIdx: 3,
  qiblaOpen: false,
  secs: 1436,
  impact: 0,
  booting: true,
};

function buzz(pattern: number | number[] = 8) {
  try {
    const ms = Array.isArray(pattern) ? pattern[0] : pattern;
    if (ms <= 10) Haptics.selectionAsync();
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // haptics unavailable — silently no-op, matches prototype's try/catch
  }
}

type Ctx = {
  state: State;
  toggleQibla: () => void;
  pickDate: (i: number) => void;
  setLogMode: (i: number) => void;
  setAdhkarMode: (i: number) => void;
  setCommTab: (i: number) => void;
  setQuranTab: (i: number) => void;
  toggleIntent: (i: number) => void;
  runHomeIntro: () => void;
};

const AppStateContext = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const countT = useRef<ReturnType<typeof setInterval> | null>(null);
  const bootT = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1s countdown tick, mirrors componentDidMount's tickT
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => ({ ...s, secs: s.secs > 0 ? s.secs - 1 : 0 }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Schedules the Home entrance: dismiss the skeleton after ~850ms and ease
  // the community total up to its real value. Split from `runHomeIntro` so
  // the mount effect can start the timers without a synchronous setState —
  // the initial state already *is* the booting state.
  const startHomeIntro = useCallback(() => {
    if (bootT.current) clearTimeout(bootT.current);
    if (countT.current) clearInterval(countT.current);
    bootT.current = setTimeout(() => setState((s) => ({ ...s, booting: false })), 850);
    const start = Date.now();
    const dur = 1600;
    countT.current = setInterval(() => {
      const t = Math.min((Date.now() - start) / dur, 1);
      const val = Math.round(IMPACT_TARGET * (1 - Math.pow(1 - t, 3)));
      setState((s) => ({ ...s, impact: val }));
      if (t >= 1 && countT.current) {
        clearInterval(countT.current);
        setState((s) => ({ ...s, impact: IMPACT_TARGET }));
      }
    }, 24);
  }, []);

  // Re-entering Home replays the intro from the top.
  const runHomeIntro = useCallback(() => {
    setState((s) => ({ ...s, booting: true, impact: 0 }));
    startHomeIntro();
  }, [startHomeIntro]);

  useEffect(() => {
    startHomeIntro();
    return () => {
      if (bootT.current) clearTimeout(bootT.current);
      if (countT.current) clearInterval(countT.current);
    };
  }, [startHomeIntro]);

  const toggleQibla = useCallback(() => {
    buzz(6);
    setState((s) => ({ ...s, qiblaOpen: !s.qiblaOpen }));
  }, []);

  const pickDate = useCallback((i: number) => {
    buzz(5);
    setState((s) => ({ ...s, dateIdx: i }));
  }, []);

  const setLogMode = useCallback((i: number) => setState((s) => ({ ...s, logMode: i })), []);
  const setAdhkarMode = useCallback((i: number) => setState((s) => ({ ...s, adhkarMode: i })), []);
  const setCommTab = useCallback((i: number) => setState((s) => ({ ...s, commTab: i })), []);
  const setQuranTab = useCallback((i: number) => setState((s) => ({ ...s, quranTab: i })), []);
  const toggleIntent = useCallback((i: number) => {
    setState((s) => {
      const n = s.intents.slice();
      n[i] = !n[i];
      return { ...s, intents: n };
    });
  }, []);

  const value: Ctx = {
    state,
    toggleQibla,
    pickDate,
    setLogMode,
    setAdhkarMode,
    setCommTab,
    setQuranTab,
    toggleIntent,
    runHomeIntro,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

export function countdownText(secs: number) {
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s remaining`;
}

export function clockText(secs: number) {
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}
