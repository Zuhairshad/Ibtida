// Service layer for the "Ibadah Lock" app-blocking domain. Backed by
// `blocked_apps`, `emergency_overrides`, and (via re-exported helpers)
// `focus_sessions.goal_id` (see supabase/migrations/0010_ibadah_lock.sql).
// Not a punitive/surveillance feature — `emergency_overrides` is
// own-eyes-only, per that migration's RLS.
//
// Every function takes `userId` explicitly (callers read it from
// `useAuth().user.id`) since this is a plain module with no React context of
// its own, and RLS only protects rows already in the table — the client
// still has to supply `user_id` on insert/upsert. Mirrors the pattern
// already established in src/services/{prayers,adhkar,focus}.ts.
//
// This file only talks to Supabase — actually enforcing the block list on
// device (a foreground-service package-blocklist on Android,
// DeviceActivityMonitor/Family Controls on iOS) is
// modules/expo-ibadah-native/index.ts's job, called separately by the
// screens that use both.
import { supabase } from '../lib/supabase';
import { endFocusSession } from './focus';

export type AppPlatform = 'android' | 'ios';

export type BlockedApp = {
  id: string;
  platform: AppPlatform;
  appIdentifier: string;
  displayName: string | null;
};

type BlockedAppRow = {
  id: string;
  platform: AppPlatform;
  app_identifier: string;
  display_name: string | null;
};

function mapBlockedApp(row: BlockedAppRow): BlockedApp {
  return { id: row.id, platform: row.platform, appIdentifier: row.app_identifier, displayName: row.display_name };
}

// ---------------------------------------------------------------------------
// blocked_apps
// ---------------------------------------------------------------------------

export async function listBlockedApps(userId: string): Promise<BlockedApp[]> {
  const { data, error } = await supabase
    .from('blocked_apps')
    .select('id, platform, app_identifier, display_name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapBlockedApp);
}

/** Upsert on (user_id, platform, app_identifier) so re-picking the same app
 * (e.g. re-running iOS's FamilyActivityPicker, which always hands back every
 * currently-selected token again) never throws a unique-violation; updates
 * `display_name` if a fresher one is supplied (an Android re-pick can
 * surface a label the first pick didn't have, e.g. after the app's own
 * launcher label changes). */
export async function addBlockedApp(
  userId: string,
  platform: AppPlatform,
  appIdentifier: string,
  displayName?: string | null
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('blocked_apps')
    .upsert(
      { user_id: userId, platform, app_identifier: appIdentifier, display_name: displayName ?? null },
      { onConflict: 'user_id,platform,app_identifier' }
    )
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function removeBlockedApp(userId: string, blockedAppId: string): Promise<void> {
  const { error } = await supabase.from('blocked_apps').delete().eq('user_id', userId).eq('id', blockedAppId);
  if (error) throw error;
}

/** Bulk-clear, optionally scoped to one platform (e.g. wiping iOS tokens
 * after the user revokes Screen Time authorization — those tokens are
 * meaningless once authorization is gone, and Android's block list should be
 * unaffected). */
export async function clearBlockedApps(userId: string, platform?: AppPlatform): Promise<void> {
  let query = supabase.from('blocked_apps').delete().eq('user_id', userId);
  if (platform) query = query.eq('platform', platform);
  const { error } = await query;
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// focus_sessions (goal-locked variant) — same table as focus.ts, filtered to
// sessions where goal_id is set.
// ---------------------------------------------------------------------------

export type IbadahLockSession = {
  id: string;
  goalId: string | null;
  startedAt: string;
  endedAt: string | null;
  count: number;
  target: number;
};

/** Same shape as focus.ts's getActiveFocusSession but also selects goal_id —
 * lets the resuming screen know whether the in-progress session is
 * goal-gated (and thus still under app-blocking) after a remount. Not
 * filtered to `goal_id is not null` — a plain (non-locked) session resuming
 * here is still a valid answer, just with `goalId: null`, and the caller can
 * decide whether that means "don't re-arm blocking." */
export async function getActiveLockedSession(userId: string): Promise<IbadahLockSession | null> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('id, goal_id, started_at, count, target, ended_at')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    goalId: data.goal_id,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    count: data.count,
    target: data.target,
  };
}

/** Starts a focus_sessions row with goal_id set — this is the "locked"
 * variant of focus.ts's startFocusSession; app-blocking is active
 * client-side for the duration of this session (enforced by
 * DeviceActivityMonitor / Family Controls on iOS, a foreground-service
 * package-blocklist on Android — outside this file's scope, see
 * modules/expo-ibadah-native). */
export async function startGoalLockedSession(userId: string, goalId: string, target: number): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({ user_id: userId, goal_id: goalId, target, count: 0 })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

/** Ends a locked session (sets ended_at) — same effect as focus.ts's
 * endFocusSession, re-exported here so ibadahLock.ts callers don't need to
 * also import focus.ts for this one call. */
export async function endLockedSession(sessionId: string): Promise<void> {
  return endFocusSession(sessionId);
}

// ---------------------------------------------------------------------------
// emergency_overrides — an append-only, own-eyes-only audit log.
// ---------------------------------------------------------------------------

/** Logs one emergency-unlock use. Called at the moment the user confirms
 * the "break glass" override during a locked session. */
export async function logEmergencyOverride(
  userId: string,
  focusSessionId: string,
  reason?: string | null
): Promise<{ id: string; usedAt: string }> {
  const { data, error } = await supabase
    .from('emergency_overrides')
    .insert({ user_id: userId, focus_session_id: focusSessionId, reason: reason ?? null })
    .select('id, used_at')
    .single();
  if (error) throw error;
  return { id: data.id as string, usedAt: data.used_at as string };
}

export type EmergencyOverrideEntry = {
  id: string;
  focusSessionId: string;
  reason: string | null;
  usedAt: string;
};

/** Inclusive of both ends when given; omit both for full history. Powers
 * "you used emergency unlock N times this week"-style own-eyes-only stats. */
export async function getOverrideHistory(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<EmergencyOverrideEntry[]> {
  let query = supabase
    .from('emergency_overrides')
    .select('id, focus_session_id, reason, used_at')
    .eq('user_id', userId)
    .order('used_at', { ascending: false });
  if (startDate) query = query.gte('used_at', startDate);
  if (endDate) query = query.lte('used_at', endDate);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    focusSessionId: row.focus_session_id as string,
    reason: row.reason as string | null,
    usedAt: row.used_at as string,
  }));
}

/** Convenience count over [sinceISO, now) for the "N times this week" stat
 * without the caller re-deriving it from getOverrideHistory. */
export async function countOverridesSince(userId: string, sinceISO: string): Promise<number> {
  const { count, error } = await supabase
    .from('emergency_overrides')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('used_at', sinceISO);
  if (error) throw error;
  return count ?? 0;
}
