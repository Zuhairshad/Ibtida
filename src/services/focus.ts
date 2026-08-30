// Ibadah Focus domain service — backs FocusSetupScreen and FocusActiveScreen
// with Supabase (`focus_settings`, `focus_sessions`; see
// supabase/migrations/0007_focus.sql), replacing AppState.focusApps /
// focusDuration / focusCount and their mutators (toggleFocusApp,
// cycleFocusDuration, tapFocus) for this domain's persistent truth.
//
// Every function takes `userId` (or a row id already scoped to that user)
// explicitly — this is a plain module with no React context of its own,
// screens supply it via `useAuth().user.id`. RLS on both tables is
// owner-only (`auth.uid() = user_id`), but the client still has to supply
// `user_id` itself on insert/upsert.
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// focus_settings — one row per user (blocked apps + chosen duration index).
// No signup-time trigger creates this row (unlike `profiles`), so it's
// upserted lazily on first read, same pattern as tasbeeh_sessions in
// services/adhkar.ts.
// ---------------------------------------------------------------------------

export type FocusSettings = {
  blockedApps: Record<string, boolean>;
  durationIndex: number;
};

type SettingsRow = { blocked_apps: Record<string, boolean>; duration_index: number };

async function getOrCreateSettingsRow(userId: string, defaultBlockedApps: Record<string, boolean>): Promise<SettingsRow> {
  const { data, error } = await supabase
    .from('focus_settings')
    .select('blocked_apps, duration_index')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('focus_settings')
    .insert({ user_id: userId, blocked_apps: defaultBlockedApps, duration_index: 0 })
    .select('blocked_apps, duration_index')
    .single();
  if (createError) throw createError;
  return created;
}

/** `defaultBlockedApps` seeds the row only the first time a user is ever
 * read (e.g. `{ Instagram: true, TikTok: true, YouTube: true, Facebook: true }`
 * to match the old AppState.initialState default) — ignored on every
 * subsequent call once a row exists. */
export async function getFocusSettings(userId: string, defaultBlockedApps: Record<string, boolean> = {}): Promise<FocusSettings> {
  const row = await getOrCreateSettingsRow(userId, defaultBlockedApps);
  return { blockedApps: row.blocked_apps ?? {}, durationIndex: row.duration_index };
}

/** Flips one app's restricted flag and returns the new value. Read-then-write
 * (not a single atomic RPC) — acceptable since RLS means the only real race
 * is the same signed-in user double-tapping the same chip. */
export async function toggleFocusApp(
  userId: string,
  appName: string,
  defaultBlockedApps: Record<string, boolean> = {}
): Promise<boolean> {
  const row = await getOrCreateSettingsRow(userId, defaultBlockedApps);
  const next = !row.blocked_apps?.[appName];
  const nextApps = { ...row.blocked_apps, [appName]: next };
  const { error } = await supabase.from('focus_settings').update({ blocked_apps: nextApps }).eq('user_id', userId);
  if (error) throw error;
  return next;
}

/** Cycles duration_index forward by one, wrapping at `optionsCount` (the
 * caller's FOCUS_DURATIONS.length) — mirrors AppState's
 * `(s.focusDuration + 1) % FOCUS_DURATIONS.length`. Returns the new index. */
export async function cycleFocusDuration(userId: string, optionsCount: number): Promise<number> {
  const row = await getOrCreateSettingsRow(userId, {});
  const next = (row.duration_index + 1) % optionsCount;
  const { error } = await supabase.from('focus_settings').update({ duration_index: next }).eq('user_id', userId);
  if (error) throw error;
  return next;
}

// ---------------------------------------------------------------------------
// focus_sessions — a log of individual Ibadah Focus sessions. One row is
// created when a session starts (FocusActiveScreen mount) and closed
// (ended_at set) when the user ends it, whether by reaching the goal or by
// backing out early via the "End focus early?" confirm sheet.
// ---------------------------------------------------------------------------

export type FocusSession = {
  id: string;
  count: number;
  target: number;
  endedAt: string | null;
};

/** The caller's most recent not-yet-ended session, if any — lets
 * FocusActiveScreen resume in place after a remount instead of always
 * starting a fresh session at 0. */
export async function getActiveFocusSession(userId: string): Promise<FocusSession | null> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('id, count, target, ended_at')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, count: data.count, target: data.target, endedAt: data.ended_at };
}

export async function startFocusSession(userId: string, target: number): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({ user_id: userId, target, count: 0 })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

/** Increments count by one, clamped at the session's own target, and
 * returns the new count — mirrors AppState's `Math.min(s.focusCount + 1, FOCUS_TARGET)`. */
export async function tapFocusSession(sessionId: string): Promise<{ count: number }> {
  const { data, error } = await supabase.from('focus_sessions').select('count, target').eq('id', sessionId).single();
  if (error) throw error;
  const count = Math.min(data.count + 1, data.target);
  const { error: updateError } = await supabase.from('focus_sessions').update({ count }).eq('id', sessionId);
  if (updateError) throw updateError;
  return { count };
}

export async function endFocusSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('focus_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}
