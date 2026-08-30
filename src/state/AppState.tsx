// Ported from the Component `state` + `renderVals()` logic in Ibadah v5.dc.html.
// Navigation itself is handled by React Navigation; this context owns everything
// that was plain app state in the prototype (logging, counters, toggles, timers).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export type PrayerDef = {
  name: PrayerName | 'Sunrise';
  short: string;
  time: string;
  state: 'done' | 'sunrise' | 'current' | 'upcoming';
  color: string;
  tint: string;
};

export const PRAYER_TIMES: PrayerDef[] = [
  { name: 'Fajr', short: 'Fajr', time: '4:10 AM', state: 'done', color: '#4A7FC1', tint: '#DDEAF4' },
  { name: 'Sunrise', short: 'Sunrise', time: '5:35 AM', state: 'sunrise', color: '#C9902E', tint: '#FBF2DC' },
  { name: 'Dhuhr', short: 'Dhuhr', time: '12:05 PM', state: 'done', color: '#D9822E', tint: '#FBEBDA' },
  { name: 'Asr', short: 'Asr', time: '3:40 PM', state: 'current', color: '#5EAA78', tint: '#E3F3EA' },
  { name: 'Maghrib', short: 'Maghrib', time: '6:33 PM', state: 'upcoming', color: '#C0563F', tint: '#F7DEDE' },
  { name: 'Isha', short: 'Isha', time: '7:57 PM', state: 'upcoming', color: '#2F4B6E', tint: '#DCE3EC' },
];

const TASBEEH_TARGET = 100;
const FOCUS_TARGET = 100;

type State = {
  logged: Record<PrayerName, boolean>;
  count: number;
  focusCount: number;
  dhikrReps: number;
  intents: boolean[];
  newTarget: number;
  freq: number;
  range: number;
  commTab: number;
  quranTab: number;
  adhkarMode: number;
  logMode: number;
  joined: boolean[];
  dateIdx: number;
  qiblaOpen: boolean;
  secs: number;
  impact: number;
  booting: boolean;
};

const initialState: State = {
  logged: { Fajr: false, Dhuhr: false, Asr: true, Maghrib: false, Isha: false },
  count: 33,
  focusCount: 73,
  dhikrReps: 6,
  intents: [true, true, false, false, false],
  newTarget: 100,
  freq: 0,
  range: 2,
  commTab: 0,
  quranTab: 0,
  adhkarMode: 0,
  logMode: 1,
  joined: [true, false, false],
  dateIdx: 3,
  qiblaOpen: false,
  secs: 1436,
  impact: 2847391,
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
  togglePrayer: (name: PrayerName) => void;
  markAsr: () => void;
  tapTasbeeh: () => boolean; // returns true if goal just completed
  plusFive: () => void;
  undoTasbeeh: () => void;
  resetTasbeeh: () => void;
  continueCounting: () => void;
  tapFocus: () => void;
  tapDhikr: () => void;
  toggleQibla: () => void;
  pickDate: (i: number) => void;
  setLogMode: (i: number) => void;
  setAdhkarMode: (i: number) => void;
  setCommTab: (i: number) => void;
  setQuranTab: (i: number) => void;
  setRange: (i: number) => void;
  setFreq: (i: number) => void;
  targetUp: () => void;
  targetDown: () => void;
  toggleIntent: (i: number) => void;
  joinCommunityGoal: (i: number) => void;
  runHomeIntro: () => void;
  tasbeehTarget: number;
  focusTarget: number;
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

  const runHomeIntro = useCallback(() => {
    if (bootT.current) clearTimeout(bootT.current);
    if (countT.current) clearInterval(countT.current);
    const target = 2847391;
    setState((s) => ({ ...s, booting: true, impact: 0 }));
    bootT.current = setTimeout(() => setState((s) => ({ ...s, booting: false })), 850);
    const start = Date.now();
    const dur = 1600;
    countT.current = setInterval(() => {
      const t = Math.min((Date.now() - start) / dur, 1);
      const val = Math.round(target * (1 - Math.pow(1 - t, 3)));
      setState((s) => ({ ...s, impact: val }));
      if (t >= 1 && countT.current) {
        clearInterval(countT.current);
        setState((s) => ({ ...s, impact: target }));
      }
    }, 24);
  }, []);

  useEffect(() => {
    runHomeIntro();
    return () => {
      if (bootT.current) clearTimeout(bootT.current);
      if (countT.current) clearInterval(countT.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePrayer = useCallback((name: PrayerName) => {
    setState((s) => {
      const next = !s.logged[name];
      buzz(next ? [8, 30, 14] : 5);
      return { ...s, logged: { ...s.logged, [name]: next } };
    });
  }, []);

  const markAsr = useCallback(() => {
    buzz([8, 30, 14]);
    setState((s) => ({ ...s, logged: { ...s.logged, Asr: true } }));
  }, []);

  const tapTasbeeh = useCallback((): boolean => {
    let completed = false;
    setState((s) => {
      const n = s.count + 1;
      if (n >= TASBEEH_TARGET) completed = true;
      return { ...s, count: n };
    });
    buzz(6);
    return completed;
  }, []);

  const plusFive = useCallback(() => setState((s) => ({ ...s, count: Math.min(s.count + 5, TASBEEH_TARGET) })), []);
  const undoTasbeeh = useCallback(() => setState((s) => ({ ...s, count: Math.max(s.count - 1, 0) })), []);
  const resetTasbeeh = useCallback(() => setState((s) => ({ ...s, count: 0 })), []);
  const continueCounting = useCallback(() => setState((s) => ({ ...s, count: 0 })), []);

  const tapFocus = useCallback(() => {
    buzz(6);
    setState((s) => ({ ...s, focusCount: Math.min(s.focusCount + 1, FOCUS_TARGET) }));
  }, []);

  const tapDhikr = useCallback(() => {
    buzz(6);
    setState((s) => ({ ...s, dhikrReps: Math.min(s.dhikrReps + 1, 100) }));
  }, []);

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
  const setRange = useCallback((i: number) => setState((s) => ({ ...s, range: i })), []);
  const setFreq = useCallback((i: number) => setState((s) => ({ ...s, freq: i })), []);
  const targetUp = useCallback(() => setState((s) => ({ ...s, newTarget: s.newTarget + 10 })), []);
  const targetDown = useCallback(() => setState((s) => ({ ...s, newTarget: Math.max(s.newTarget - 10, 10) })), []);
  const toggleIntent = useCallback((i: number) => {
    setState((s) => {
      const n = s.intents.slice();
      n[i] = !n[i];
      return { ...s, intents: n };
    });
  }, []);
  const joinCommunityGoal = useCallback((i: number) => {
    buzz([8, 30, 14]);
    setState((s) => {
      const n = s.joined.slice();
      n[i] = true;
      return { ...s, joined: n };
    });
  }, []);

  const value: Ctx = {
    state,
    togglePrayer,
    markAsr,
    tapTasbeeh,
    plusFive,
    undoTasbeeh,
    resetTasbeeh,
    continueCounting,
    tapFocus,
    tapDhikr,
    toggleQibla,
    pickDate,
    setLogMode,
    setAdhkarMode,
    setCommTab,
    setQuranTab,
    setRange,
    setFreq,
    targetUp,
    targetDown,
    toggleIntent,
    joinCommunityGoal,
    runHomeIntro,
    tasbeehTarget: TASBEEH_TARGET,
    focusTarget: FOCUS_TARGET,
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
