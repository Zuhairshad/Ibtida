// Pure prayer-time calculation module wrapping adhan-js (github.com/
// batoulapps/adhan-js). No Supabase, no React — just coordinates + calc
// method + madhab + a Date in, real Date objects / classifications out.
// Replaces the hardcoded clock strings and done/current/upcoming/sunrise
// state that used to live in `PRAYER_TIMES` (src/state/AppState.tsx).
//
// Verified against the installed `adhan` package's own type defs
// (node_modules/adhan/lib/types/*.d.ts) and README/METHODS.md rather than
// assumed — `CalculationMethod.<Name>()` returns a `CalculationParameters`,
// `Madhab.Shafi`/`Madhab.Hanafi` are its lowercase string constants, and
// `PrayerTimes` outputs real UTC `Date` instances that must be formatted
// with an explicit IANA timezone (never the device's own), per adhan's
// README: "Never assume the user's local device timezone matches the
// calculation coordinates."
import { Coordinates, CalculationMethod, CalculationParameters, Madhab as AdhanMadhab, PrayerTimes as AdhanPrayerTimes, Qibla } from 'adhan';

import type { CalculationMethod as CalcMethodName, Madhab as MadhabName } from '../services/prayerSettings';
import type { PrayerName } from '../services/prayers';

export type PrayerSlotName = PrayerName | 'Sunrise';

export type PrayerTimesOfDay = {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
};

export type PrayerClassification = 'done' | 'current' | 'upcoming';

export type NextPrayerInfo = {
  name: PrayerSlotName;
  at: Date;
  secondsRemaining: number;
};

const CALC_METHOD_FNS: Record<CalcMethodName, () => CalculationParameters> = {
  MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
  Egyptian: CalculationMethod.Egyptian,
  Karachi: CalculationMethod.Karachi,
  UmmAlQura: CalculationMethod.UmmAlQura,
  Dubai: CalculationMethod.Dubai,
  MoonsightingCommittee: CalculationMethod.MoonsightingCommittee,
  NorthAmerica: CalculationMethod.NorthAmerica,
  Kuwait: CalculationMethod.Kuwait,
  Qatar: CalculationMethod.Qatar,
  Singapore: CalculationMethod.Singapore,
  Tehran: CalculationMethod.Tehran,
  Turkey: CalculationMethod.Turkey,
};

/** Given coordinates + calc method + madhab + a JS Date, returns the real
 * fajr/sunrise/dhuhr/asr/maghrib/isha timestamps for that calendar day (the
 * Date's year/month/day are what matter to adhan-js — time-of-day is
 * ignored per its own docs). */
export function computePrayerTimes(latitude: number, longitude: number, calculationMethod: CalcMethodName, madhab: MadhabName, date: Date): PrayerTimesOfDay {
  const coordinates = new Coordinates(latitude, longitude);
  const methodFn = CALC_METHOD_FNS[calculationMethod] ?? CalculationMethod.MuslimWorldLeague;
  const params = methodFn();
  params.madhab = madhab === 'Hanafi' ? AdhanMadhab.Hanafi : AdhanMadhab.Shafi;
  const times = new AdhanPrayerTimes(coordinates, date, params);
  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

function orderedSlots(times: PrayerTimesOfDay): { name: PrayerSlotName; at: Date }[] {
  return [
    { name: 'Fajr', at: times.fajr },
    { name: 'Sunrise', at: times.sunrise },
    { name: 'Dhuhr', at: times.dhuhr },
    { name: 'Asr', at: times.asr },
    { name: 'Maghrib', at: times.maghrib },
    { name: 'Isha', at: times.isha },
  ];
}

/** Classifies each of the 5 prayers + Sunrise into 'done' | 'current' |
 * 'upcoming' by comparing against `now`. A slot is 'current' between its own
 * start and the *next* slot's start; 'upcoming' if it hasn't started yet;
 * 'done' once the next slot's start has passed. This is a *time-window*
 * classification, distinct from whether the user has logged the prayer as
 * prayed (see services/prayers.ts's `done` boolean) — a prayer can be
 * classified 'current' or 'done' and still be unlogged.
 *
 * `nextDayFajr` closes Isha's window correctly (the next boundary is
 * tomorrow's Fajr, not anything in `times`) — pass tomorrow's
 * `computePrayerTimes(...).fajr` for an accurate Isha classification after
 * midnight; omitted, Isha is treated as 'current' for as long as `now` is
 * on/after its start (never reported 'done'). */
export function classifyPrayerTimes(times: PrayerTimesOfDay, now: Date = new Date(), nextDayFajr?: Date): Record<PrayerSlotName, PrayerClassification> {
  const slots = orderedSlots(times);
  const result = {} as Record<PrayerSlotName, PrayerClassification>;
  for (let i = 0; i < slots.length; i++) {
    const { name, at } = slots[i];
    const nextAt = i + 1 < slots.length ? slots[i + 1].at : (nextDayFajr ?? null);
    if (now.getTime() < at.getTime()) {
      result[name] = 'upcoming';
    } else if (nextAt === null || now.getTime() < nextAt.getTime()) {
      result[name] = 'current';
    } else {
      result[name] = 'done';
    }
  }
  return result;
}

/** Convenience wrapper: computes `date`'s prayer times *and* the following
 * day's Fajr (so Isha's window closes correctly) and classifies in one
 * call — what PrayerScreen/HomeScreen actually want. */
export function classifyPrayersForDate(
  latitude: number,
  longitude: number,
  calculationMethod: CalcMethodName,
  madhab: MadhabName,
  date: Date,
  now: Date = new Date()
): Record<PrayerSlotName, PrayerClassification> {
  const times = computePrayerTimes(latitude, longitude, calculationMethod, madhab, date);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayFajr = computePrayerTimes(latitude, longitude, calculationMethod, madhab, nextDay).fajr;
  return classifyPrayerTimes(times, now, nextDayFajr);
}

export function secondsUntil(at: Date, now: Date = new Date()): number {
  return Math.max(0, Math.round((at.getTime() - now.getTime()) / 1000));
}

/** Finds the next upcoming prayer (crossing midnight into tomorrow's Fajr
 * if `now` is already past today's Isha) — feeds the "Next Prayer" card and
 * the countdown ring's target on both Home and PrayerScreen. */
export function getNextPrayer(latitude: number, longitude: number, calculationMethod: CalcMethodName, madhab: MadhabName, now: Date = new Date()): NextPrayerInfo {
  const today = computePrayerTimes(latitude, longitude, calculationMethod, madhab, now);
  for (const slot of orderedSlots(today)) {
    if (now.getTime() < slot.at.getTime()) {
      return { name: slot.name, at: slot.at, secondsRemaining: secondsUntil(slot.at, now) };
    }
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFajr = computePrayerTimes(latitude, longitude, calculationMethod, madhab, tomorrow).fajr;
  return { name: 'Fajr', at: tomorrowFajr, secondsRemaining: secondsUntil(tomorrowFajr, now) };
}

/** Same as `getNextPrayer` but skips Sunrise (not a prayer) — this is what
 * the "Next Prayer" card on Home/PrayerScreen actually wants to name. */
export function getNextSalah(latitude: number, longitude: number, calculationMethod: CalcMethodName, madhab: MadhabName, now: Date = new Date()): NextPrayerInfo & { name: PrayerName } {
  let candidate = getNextPrayer(latitude, longitude, calculationMethod, madhab, now);
  while (candidate.name === 'Sunrise') {
    candidate = getNextPrayer(latitude, longitude, calculationMethod, madhab, new Date(candidate.at.getTime() + 1000));
  }
  return candidate as NextPrayerInfo & { name: PrayerName };
}

const SALAH_ORDER: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function salahTime(times: PrayerTimesOfDay, name: PrayerName): Date {
  if (name === 'Fajr') return times.fajr;
  if (name === 'Dhuhr') return times.dhuhr;
  if (name === 'Asr') return times.asr;
  if (name === 'Maghrib') return times.maghrib;
  return times.isha;
}

export type PrayerCountdownWindow = {
  name: PrayerName;
  start: Date;
  end: Date;
  secondsRemaining: number;
  totalSeconds: number;
};

/** Feeds the "Next Prayer" progress ring: the next salah, plus the *previous*
 * salah's time so the ring can show real elapsed-fraction-of-window progress
 * instead of a fixed made-up total. */
export function getPrayerCountdownWindow(latitude: number, longitude: number, calculationMethod: CalcMethodName, madhab: MadhabName, now: Date = new Date()): PrayerCountdownWindow {
  const next = getNextSalah(latitude, longitude, calculationMethod, madhab, now);
  const nextIdx = SALAH_ORDER.indexOf(next.name);
  let start: Date;
  if (nextIdx > 0) {
    const sameDayTimes = computePrayerTimes(latitude, longitude, calculationMethod, madhab, next.at);
    start = salahTime(sameDayTimes, SALAH_ORDER[nextIdx - 1]);
  } else {
    const prevDay = new Date(next.at);
    prevDay.setDate(prevDay.getDate() - 1);
    start = computePrayerTimes(latitude, longitude, calculationMethod, madhab, prevDay).isha;
  }
  const totalSeconds = Math.max(1, Math.round((next.at.getTime() - start.getTime()) / 1000));
  return { name: next.name, start, end: next.at, secondsRemaining: secondsUntil(next.at, now), totalSeconds };
}

/** Formats a prayer Date in the saved location's IANA timezone (never the
 * device's own — adhan's own README warning) as e.g. "4:10 AM". */
export function formatPrayerTime(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone }).format(at);
}

/** Real great-circle bearing (degrees from true North) to the Kaaba from a
 * saved location — adhan-js ships this directly (Qibla()), so no need to
 * hand-roll the spherical-trigonometry formula ourselves. */
export function qiblaBearing(latitude: number, longitude: number): number {
  return Qibla(new Coordinates(latitude, longitude));
}

/** Parses a `toISODate`-style `YYYY-MM-DD` string (see services/prayers.ts)
 * into a local-midnight Date — deliberately not `new Date(iso)`, which
 * parses as UTC midnight and can shift a day near a timezone boundary. */
export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Compact "31.52°N, 74.36°E" label for a saved location — used in place of
 * a hardcoded city name (this app has no reverse-geocoding step; it only
 * ever asks the device for raw coordinates). */
export function formatCoordinates(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(2)}°${latDir}, ${Math.abs(longitude).toFixed(2)}°${lonDir}`;
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** 8-point compass abbreviation for a bearing in degrees, e.g. "255° W" for
 * the Qibla card (matches the old hardcoded display's format exactly). */
export function formatBearing(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 45) % 8;
  return `${Math.round(normalized)}° ${COMPASS_POINTS[idx]}`;
}
