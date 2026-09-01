// Service layer for the wake-verified prayer alarm domain. Backed by
// `prayer_alarm_settings` and `wake_verifications` (see
// supabase/migrations/0011_wake_alarm.sql) — a per-user, per-prayer alarm
// config whose `verification_token` is encoded into a QR code the user
// prints/displays on their prayer mat (see
// src/screens/shared/PrayerMatTagScreen.tsx), plus a log of successful wake
// verifications for later streak/stats views (see
// src/screens/shared/WakeScanScreen.tsx for the scan side).
//
// Every function takes `userId` explicitly (callers read it from
// `useAuth().user.id`) since this is a plain module with no React context of
// its own, and RLS only protects rows already in the table — the client
// still has to supply `user_id` on insert/upsert. Mirrors the pattern
// already established in src/services/{prayers,focus,quran}.ts. Actually
// scheduling/firing the alarm natively is
// modules/expo-ibadah-native/index.ts's job (`scheduleWakeAlarm` /
// `cancelWakeAlarm`), called separately by whatever screen owns this
// domain's setup flow — this file only persists config + verification
// history.
import * as Crypto from 'expo-crypto';

import { supabase } from '../lib/supabase';
import type { PrayerName } from './prayers';
import { PRAYER_NAMES } from './prayers';

export type WakeVerificationMethod = 'none' | 'qr_scan' | 'two_stage_qr';

export type PrayerAlarmConfig = {
  prayerName: PrayerName;
  enabled: boolean;
  wakeVerificationMethod: WakeVerificationMethod;
  verificationToken: string;
  wuduToken: string;
};

type AlarmConfigRow = {
  prayer_name: PrayerName;
  enabled: boolean;
  wake_verification_method: WakeVerificationMethod;
  verification_token: string;
  wudu_token: string;
};

function mapConfig(row: AlarmConfigRow): PrayerAlarmConfig {
  return {
    prayerName: row.prayer_name,
    enabled: row.enabled,
    wakeVerificationMethod: row.wake_verification_method,
    verificationToken: row.verification_token,
    wuduToken: row.wudu_token,
  };
}

// ---------------------------------------------------------------------------
// prayer_alarm_settings — one row per (user, prayer), upserted lazily on
// first read per prayer (same get-or-create pattern as tasbeeh_sessions in
// services/adhkar.ts / focus_settings in services/focus.ts). The DB's own
// `verification_token` column default (`replace(gen_random_uuid()::text,
// '-', '')`) gives a brand-new row a usable token immediately, so the
// initial insert here doesn't need to supply one itself.
// ---------------------------------------------------------------------------

async function getOrCreateAlarmConfigRow(userId: string, prayerName: PrayerName): Promise<AlarmConfigRow> {
  const { data, error } = await supabase
    .from('prayer_alarm_settings')
    .select('prayer_name, enabled, wake_verification_method, verification_token, wudu_token')
    .eq('user_id', userId)
    .eq('prayer_name', prayerName)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('prayer_alarm_settings')
    .insert({ user_id: userId, prayer_name: prayerName })
    .select('prayer_name, enabled, wake_verification_method, verification_token, wudu_token')
    .single();
  if (createError) throw createError;
  return created;
}

export async function getAlarmConfig(userId: string, prayerName: PrayerName): Promise<PrayerAlarmConfig> {
  const row = await getOrCreateAlarmConfigRow(userId, prayerName);
  return mapConfig(row);
}

/** All 5 prayers at once, keyed by prayer name — for a settings screen that
 * lists every prayer's alarm row together. Fetches whatever rows already
 * exist in one query, then lazily creates only the missing ones (rather than
 * 5 sequential get-or-create round trips) so a first-ever visit to that
 * settings screen isn't 5x slower than every visit after. */
export async function getAllAlarmConfigs(userId: string): Promise<Record<PrayerName, PrayerAlarmConfig>> {
  const { data, error } = await supabase
    .from('prayer_alarm_settings')
    .select('prayer_name, enabled, wake_verification_method, verification_token, wudu_token')
    .eq('user_id', userId);
  if (error) throw error;

  const byName = new Map<PrayerName, AlarmConfigRow>();
  for (const row of data ?? []) byName.set(row.prayer_name, row);

  const missing = PRAYER_NAMES.filter((name) => !byName.has(name));
  for (const name of missing) {
    byName.set(name, await getOrCreateAlarmConfigRow(userId, name));
  }

  const result = {} as Record<PrayerName, PrayerAlarmConfig>;
  for (const name of PRAYER_NAMES) {
    result[name] = mapConfig(byName.get(name)!);
  }
  return result;
}

export async function setAlarmEnabled(userId: string, prayerName: PrayerName, enabled: boolean): Promise<void> {
  await getOrCreateAlarmConfigRow(userId, prayerName); // ensures a row exists before the update below
  const { error } = await supabase
    .from('prayer_alarm_settings')
    .update({ enabled })
    .eq('user_id', userId)
    .eq('prayer_name', prayerName);
  if (error) throw error;
}

export async function setWakeVerificationMethod(
  userId: string,
  prayerName: PrayerName,
  method: WakeVerificationMethod
): Promise<void> {
  await getOrCreateAlarmConfigRow(userId, prayerName); // ensures a row exists before the update below
  const { error } = await supabase
    .from('prayer_alarm_settings')
    .update({ wake_verification_method: method })
    .eq('user_id', userId)
    .eq('prayer_name', prayerName);
  if (error) throw error;
}

/** Generates a fresh app-side random token via expo-crypto's
 * getRandomBytesAsync (32 bytes, hex-encoded — 64 hex chars, comfortably
 * distinct from the DB's own 32-hex-char fallback default so either source
 * is trivially recognizable in logs if that ever matters), persists it, and
 * returns it so the caller can immediately re-render the QR code. Overwrites
 * any existing token for that (user, prayer) — old printed QR codes stop
 * working, by design (matches "regenerate" semantics for a lost/compromised
 * code). */
export async function regenerateVerificationToken(userId: string, prayerName: PrayerName): Promise<string> {
  await getOrCreateAlarmConfigRow(userId, prayerName); // ensures a row exists before the update below

  const bytes = await Crypto.getRandomBytesAsync(32);
  let token = '';
  for (const b of bytes) token += b.toString(16).padStart(2, '0');

  const { error } = await supabase
    .from('prayer_alarm_settings')
    .update({ verification_token: token })
    .eq('user_id', userId)
    .eq('prayer_name', prayerName);
  if (error) throw error;
  return token;
}

/** Same as `regenerateVerificationToken` but for the wudu (sink) token.
 * Generates a fresh random token, persists it, and returns it so the caller
 * can immediately re-render the wudu QR code. Old printed wudu tags stop
 * working immediately, by design. */
export async function regenerateWuduToken(userId: string, prayerName: PrayerName): Promise<string> {
  await getOrCreateAlarmConfigRow(userId, prayerName); // ensures a row exists before the update below

  const bytes = await Crypto.getRandomBytesAsync(32);
  let token = '';
  for (const b of bytes) token += b.toString(16).padStart(2, '0');

  const { error } = await supabase
    .from('prayer_alarm_settings')
    .update({ wudu_token: token })
    .eq('user_id', userId)
    .eq('prayer_name', prayerName);
  if (error) throw error;
  return token;
}

// ---------------------------------------------------------------------------
// wake_verifications — an append-only log of successful wake verifications.
// ---------------------------------------------------------------------------

/** Called after a successful QR scan at wake time. Upserts on
 * (user_id, prayer_name, alarm_date) with `ignoreDuplicates: true` — a
 * second scan the same day is a harmless no-op (`ON CONFLICT DO NOTHING`),
 * not a duplicate log row. Deliberately NOT a plain upsert (`DO UPDATE`):
 * `wake_verifications` has no update RLS policy (append-only log, see
 * 0011_wake_alarm.sql), and Postgres RLS applies the UPDATE policy to the
 * ON CONFLICT DO UPDATE path of an INSERT — a plain upsert would 403 on the
 * second scan of the same day instead of no-op'ing. */
export async function logWakeVerification(
  userId: string,
  prayerName: PrayerName,
  alarmDate: string,
  method: string
): Promise<void> {
  const { error } = await supabase
    .from('wake_verifications')
    .upsert(
      { user_id: userId, prayer_name: prayerName, alarm_date: alarmDate, method, verified_at: new Date().toISOString() },
      { onConflict: 'user_id,prayer_name,alarm_date', ignoreDuplicates: true }
    );
  if (error) throw error;
}

/** Upserts a `wudu_scanned_at` timestamp on the wake_verifications row for
 * the given (user, prayer, date). Called when the user successfully scans the
 * sink/wudu tag in stage 1 of the two-stage flow — before the mat scan in
 * stage 2. Uses `DO UPDATE` on the wudu_scanned_at field only so it doesn't
 * trample the `verified_at` set by `logWakeVerification` (stage 2). */
export async function logWuduScan(userId: string, prayerName: PrayerName, alarmDate: string): Promise<void> {
  const { error } = await supabase.from('wake_verifications').upsert(
    {
      user_id: userId,
      prayer_name: prayerName,
      alarm_date: alarmDate,
      wudu_scanned_at: new Date().toISOString(),
      method: 'two_stage_qr',
    },
    { onConflict: 'user_id,prayer_name,alarm_date' }
  );
  if (error) throw error;
}

export type WakeVerificationEntry = {
  prayerName: PrayerName;
  alarmDate: string;
  verifiedAt: string;
  method: string;
};

/** Inclusive date range — feeds a future streak/stats view (not built yet,
 * per task scope). */
export async function getWakeVerificationHistory(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WakeVerificationEntry[]> {
  const { data, error } = await supabase
    .from('wake_verifications')
    .select('prayer_name, alarm_date, verified_at, method')
    .eq('user_id', userId)
    .gte('alarm_date', startDate)
    .lte('alarm_date', endDate)
    .order('alarm_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    prayerName: row.prayer_name as PrayerName,
    alarmDate: row.alarm_date as string,
    verifiedAt: row.verified_at as string,
    method: row.method as string,
  }));
}
