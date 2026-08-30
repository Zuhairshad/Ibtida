// Service layer for the Profile / Privacy / Notifications domain. Backed by
// `profiles`, `privacy_settings` and `notification_settings`
// (see supabase/migrations/0001_profiles.sql and 0004_settings.sql),
// replacing AppState.privacy / AppState.notifications (and the static
// "Yusuf Rahman" placeholder) for this domain's persistent truth.
//
// Every function takes `userId` explicitly (callers read it from
// `useAuth().user.id`) since this is a plain module with no React context of
// its own, and RLS only protects rows already in the table — the client
// still has to supply `user_id` on insert/upsert. Mirrors the pattern
// already established in src/services/prayers.ts and quran.ts.
import { supabase } from '../lib/supabase';
import { PRIVACY_OPTIONS, NOTIFICATION_CATEGORIES } from '../state/AppState';

// ---------------------------------------------------------------------------
// profiles — read-only here; no screen in this domain edits display_name/
// avatar_url yet, so no update function is exposed (ProfileScreen shows the
// authenticated user's email straight from useAuth().user.email).
// ---------------------------------------------------------------------------

export type Profile = { displayName: string | null; avatarUrl: string | null };

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return { displayName: data?.display_name ?? null, avatarUrl: data?.avatar_url ?? null };
}

// ---------------------------------------------------------------------------
// privacy_settings — one row per (user_id, key). Missing rows default to
// `PRIVACY_OPTIONS[key][0]`, matching AppState's old "private by default"
// seed values (every key's initial value in AppState.initialState.privacy is
// in fact its option list's first entry).
// ---------------------------------------------------------------------------

export async function getPrivacySettings(userId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('privacy_settings').select('key, value').eq('user_id', userId);
  if (error) throw error;

  const result: Record<string, string> = {};
  for (const key of Object.keys(PRIVACY_OPTIONS)) {
    result[key] = PRIVACY_OPTIONS[key][0];
  }
  for (const row of data ?? []) {
    result[row.key] = row.value;
  }
  return result;
}

/** Cycles one privacy key to its next option (wrapping) and returns the new
 * value — mirrors AppState.cyclePrivacy(key)'s semantics exactly. */
export async function cyclePrivacy(userId: string, key: string): Promise<string> {
  const opts = PRIVACY_OPTIONS[key];
  if (!opts) throw new Error(`Unknown privacy setting: ${key}`);

  const { data: existing, error: selErr } = await supabase
    .from('privacy_settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();
  if (selErr) throw selErr;

  const current = existing?.value ?? opts[0];
  const idx = opts.indexOf(current);
  const next = opts[(idx === -1 ? 0 : idx + 1) % opts.length];

  const { error } = await supabase
    .from('privacy_settings')
    .upsert({ user_id: userId, key, value: next }, { onConflict: 'user_id,key' });
  if (error) throw error;
  return next;
}

// ---------------------------------------------------------------------------
// notification_settings — one row per (user_id, key). Missing rows default
// to `true`, matching the table's own `enabled boolean not null default
// true` column default (same convention as adhan_settings/getAdhanSettings
// in prayers.ts).
// ---------------------------------------------------------------------------

export async function getNotificationSettings(userId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.from('notification_settings').select('key, enabled').eq('user_id', userId);
  if (error) throw error;

  const result: Record<string, boolean> = {};
  for (const cat of NOTIFICATION_CATEGORIES) result[cat] = true;
  for (const row of data ?? []) result[row.key] = row.enabled;
  return result;
}

export async function toggleNotification(userId: string, key: string): Promise<boolean> {
  const { data: existing, error: selErr } = await supabase
    .from('notification_settings')
    .select('enabled')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();
  if (selErr) throw selErr;

  const current = existing?.enabled ?? true;
  const next = !current;
  const { error } = await supabase
    .from('notification_settings')
    .upsert({ user_id: userId, key, enabled: next }, { onConflict: 'user_id,key' });
  if (error) throw error;
  return next;
}
