// Prayers domain service — backs PrayerScreen, PrayerDetailScreen, and the
// prayer-ring/status parts of HomeScreen with Supabase (`prayer_logs`,
// `adhan_settings`), replacing AppState.logged / AppState.adhan for this
// domain's persistent truth. Ephemeral UI state (selected date pill, log-mode
// segmented control, qibla card open/closed, the countdown clock) stays in
// AppState / local component state — this file only touches the two tables
// above.
//
// Every function takes `userId` explicitly (the caller reads it from
// `useAuth()`) since this is a plain module with no React context of its own,
// and RLS only protects rows already in the table — the client still has to
// supply `user_id` on insert/upsert.
import { supabase } from '../lib/supabase';

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export const PRAYER_NAMES: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function emptyPrayerRecord(fill: boolean): Record<PrayerName, boolean> {
  return { Fajr: fill, Dhuhr: fill, Asr: fill, Maghrib: fill, Isha: fill };
}

/** Local-calendar-day ISO date (`YYYY-MM-DD`) — deliberately not `toISOString()`,
 * which converts to UTC and can land on the wrong day near midnight. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISODate(): string {
  return toISODate(new Date());
}

export async function getPrayerLog(userId: string, date: string): Promise<Record<PrayerName, boolean>> {
  const { data, error } = await supabase
    .from('prayer_logs')
    .select('prayer_name, done')
    .eq('user_id', userId)
    .eq('log_date', date);
  if (error) throw error;

  const result = emptyPrayerRecord(false);
  for (const row of data ?? []) {
    result[row.prayer_name as PrayerName] = row.done;
  }
  return result;
}

/** Keyed by `log_date` (`YYYY-MM-DD`), inclusive of both ends. Dates with no
 * rows for a given prayer default to `false` (not-logged), same as `getPrayerLog`. */
export async function getPrayerLogRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, Record<PrayerName, boolean>>> {
  const { data, error } = await supabase
    .from('prayer_logs')
    .select('log_date, prayer_name, done')
    .eq('user_id', userId)
    .gte('log_date', startDate)
    .lte('log_date', endDate);
  if (error) throw error;

  const result: Record<string, Record<PrayerName, boolean>> = {};
  for (const row of data ?? []) {
    const d = row.log_date as string;
    if (!result[d]) result[d] = emptyPrayerRecord(false);
    result[d][row.prayer_name as PrayerName] = row.done;
  }
  return result;
}

/** Flips `done` for one prayer on one date and returns the new state.
 * Read-then-write (not a single atomic RPC) — acceptable here since only the
 * signed-in owner can ever touch their own rows (RLS), so the only real race
 * is the same user double-tapping, which the calling screens already guard
 * against with per-row optimistic UI + a busy flag. */
export async function togglePrayer(userId: string, prayerName: PrayerName, date: string): Promise<boolean> {
  const { data: existing, error: selErr } = await supabase
    .from('prayer_logs')
    .select('done')
    .eq('user_id', userId)
    .eq('log_date', date)
    .eq('prayer_name', prayerName)
    .maybeSingle();
  if (selErr) throw selErr;

  const next = !existing?.done;
  const { error } = await supabase
    .from('prayer_logs')
    .upsert(
      { user_id: userId, log_date: date, prayer_name: prayerName, done: next, logged_at: next ? new Date().toISOString() : null },
      { onConflict: 'user_id,log_date,prayer_name' }
    );
  if (error) throw error;
  return next;
}

/** Defaults every prayer to `true` (adhan on) when a user has no rows yet —
 * matches AppState's old `initialState.adhan` default and `adhan_settings`'s
 * `enabled boolean not null default true`. */
export async function getAdhanSettings(userId: string): Promise<Record<PrayerName, boolean>> {
  const { data, error } = await supabase.from('adhan_settings').select('prayer_name, enabled').eq('user_id', userId);
  if (error) throw error;

  const result = emptyPrayerRecord(true);
  for (const row of data ?? []) {
    result[row.prayer_name as PrayerName] = row.enabled;
  }
  return result;
}

export async function toggleAdhan(userId: string, prayerName: PrayerName): Promise<boolean> {
  const { data: existing, error: selErr } = await supabase
    .from('adhan_settings')
    .select('enabled')
    .eq('user_id', userId)
    .eq('prayer_name', prayerName)
    .maybeSingle();
  if (selErr) throw selErr;

  const current = existing?.enabled ?? true;
  const next = !current;
  const { error } = await supabase
    .from('adhan_settings')
    .upsert({ user_id: userId, prayer_name: prayerName, enabled: next }, { onConflict: 'user_id,prayer_name' });
  if (error) throw error;
  return next;
}
