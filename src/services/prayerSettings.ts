// Service layer for real prayer-time calculation config. Backed by
// `prayer_calc_settings` (see supabase/migrations/0009_prayer_calc_settings.sql)
// — one row per user holding the location, timezone and adhan-js calculation
// parameters a screen needs to compute actual prayer times client-side
// (replacing any hardcoded/static prayer-time data).
//
// Every function takes `userId` explicitly (callers read it from
// `useAuth().user.id`) since this is a plain module with no React context of
// its own, and RLS only protects rows already in the table — the client
// still has to supply `user_id` on insert/upsert. Mirrors the pattern
// already established in src/services/{prayers,focus,settings}.ts.
import { supabase } from '../lib/supabase';

// Exactly adhan-js's supported `CalculationMethod` names — keep this list in
// sync with whatever adhan-js version the client depends on (see the same
// note in 0009_prayer_calc_settings.sql).
export type CalculationMethod =
  | 'MuslimWorldLeague'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'MoonsightingCommittee'
  | 'NorthAmerica'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Tehran'
  | 'Turkey';

export type Madhab = 'Shafi' | 'Hanafi';

export type PrayerCalcSettings = {
  latitude: number;
  longitude: number;
  timezone: string;
  calculationMethod: CalculationMethod;
  madhab: Madhab;
};

type SettingsRow = {
  latitude: number;
  longitude: number;
  timezone: string;
  calculation_method: CalculationMethod;
  madhab: Madhab;
};

function mapRow(row: SettingsRow): PrayerCalcSettings {
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    calculationMethod: row.calculation_method,
    madhab: row.madhab,
  };
}

/** `null` means the user has never configured a location yet (no row) —
 * callers should prompt for location permission / manual entry in that
 * case, rather than silently defaulting coordinates (unlike, say,
 * `getFocusSettings`, there's no sane default latitude/longitude to seed). */
export async function getPrayerCalcSettings(userId: string): Promise<PrayerCalcSettings | null> {
  const { data, error } = await supabase
    .from('prayer_calc_settings')
    .select('latitude, longitude, timezone, calculation_method, madhab')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data);
}

/** Upserts the full row (onConflict: 'user_id'). Used by the initial setup
 * flow (first-run location + method pick) and by "change location" /
 * "change method" settings screens alike — both just call this with the
 * full merged settings object. */
export async function setPrayerCalcSettings(userId: string, settings: PrayerCalcSettings): Promise<void> {
  const { error } = await supabase.from('prayer_calc_settings').upsert(
    {
      user_id: userId,
      latitude: settings.latitude,
      longitude: settings.longitude,
      timezone: settings.timezone,
      calculation_method: settings.calculationMethod,
      madhab: settings.madhab,
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

// adhan-js's own defaults — used only to seed the fields a partial setter
// below doesn't touch when no row exists yet (matching this table's own
// column defaults, so a first-ever `setLocation` call before the user has
// picked a method still produces a valid, fully-specified row).
const DEFAULT_CALCULATION_METHOD: CalculationMethod = 'MuslimWorldLeague';
const DEFAULT_MADHAB: Madhab = 'Shafi';

/** Convenience partial setters below each do a read-then-upsert against
 * `getPrayerCalcSettings`'s current values (or the adhan-js defaults above
 * if no row exists yet) — mirroring `togglePrayer`'s read-then-write pattern
 * in `prayers.ts`. */
async function currentOrDefaults(userId: string): Promise<PrayerCalcSettings | null> {
  return getPrayerCalcSettings(userId);
}

/** Resolves the IANA timezone for coordinates via reverse geocoding (iOS only;
 * falls back to the supplied `fallbackTimezone`). Keeps timezone in sync with
 * the prayer location rather than the device's system clock. */
async function resolveTimezone(latitude: number, longitude: number, fallbackTimezone: string): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const tz = (results[0] as Record<string, unknown>)?.timezone as string | undefined;
    if (tz && typeof tz === 'string') return tz;
  } catch {
    // ignore — reverseGeocode may not be available in all environments
  }
  return fallbackTimezone;
}

export async function setLocation(userId: string, latitude: number, longitude: number, timezone: string): Promise<void> {
  const resolvedTz = await resolveTimezone(latitude, longitude, timezone);
  const existing = await currentOrDefaults(userId);
  await setPrayerCalcSettings(userId, {
    latitude,
    longitude,
    timezone: resolvedTz,
    calculationMethod: existing?.calculationMethod ?? DEFAULT_CALCULATION_METHOD,
    madhab: existing?.madhab ?? DEFAULT_MADHAB,
  });
}

export async function setCalculationMethod(userId: string, method: CalculationMethod): Promise<void> {
  const existing = await currentOrDefaults(userId);
  if (!existing) {
    throw new Error('Cannot set calculation method before a location has been configured.');
  }
  await setPrayerCalcSettings(userId, { ...existing, calculationMethod: method });
}

export async function setMadhab(userId: string, madhab: Madhab): Promise<void> {
  const existing = await currentOrDefaults(userId);
  if (!existing) {
    throw new Error('Cannot set madhab before a location has been configured.');
  }
  await setPrayerCalcSettings(userId, { ...existing, madhab });
}

// ---------------------------------------------------------------------------
// Kalimat prayer-times integration
// Uses the Kalimat API as the data source for prayer times when a country
// code is available, with the local adhan-js calculation as the fallback.
// ---------------------------------------------------------------------------
import * as Location from 'expo-location';
import { fetchPrayerTimes, type PrayerTimesDay } from '../lib/kalimatApi';

/** Resolves the ISO country code from coordinates via reverse geocoding.
 * Returns null if permission denied or geocoding fails. */
export async function resolveCountryCode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    return results[0]?.isoCountryCode ?? null;
  } catch {
    return null;
  }
}

/** Fetches today's prayer times from the Kalimat API for the given settings.
 * Returns null if the API call fails — callers should fall back to adhan-js. */
export async function getPrayerTimesFromKalimat(
  settings: PrayerCalcSettings,
  date?: string
): Promise<PrayerTimesDay | null> {
  const countryCode = await resolveCountryCode(settings.latitude, settings.longitude);
  if (!countryCode) return null;
  return fetchPrayerTimes(settings.latitude, settings.longitude, countryCode, date);
}
