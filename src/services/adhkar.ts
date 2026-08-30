// Service layer for the Adhkar / Goals / Tasbeeh / Progress domain.
// Backed by `adhkar_goals` and `tasbeeh_sessions` (see supabase/migrations/0003_adhkar.sql).
// RLS on both tables is owner-only (`auth.uid() = user_id`), so every call
// here takes the caller's `userId` explicitly rather than reading it off a
// hook — this file has no React context of its own, screens supply it via
// `useAuth().user.id`.
import { supabase } from '../lib/supabase';

export type AdhkarGoal = {
  id: string;
  title: string;
  target: number;
  frequency: number;
  range: number;
  progress: number;
  completedAt: string | null;
};

type GoalRow = {
  id: string;
  title: string;
  target: number;
  frequency: number;
  range: number;
  progress: number;
  completed_at: string | null;
};

function mapGoal(row: GoalRow): AdhkarGoal {
  return {
    id: row.id,
    title: row.title,
    target: row.target,
    frequency: row.frequency,
    range: row.range,
    progress: row.progress,
    completedAt: row.completed_at,
  };
}

// ---------------------------------------------------------------------------
// adhkar_goals
// ---------------------------------------------------------------------------

export async function createGoal(
  userId: string,
  title: string,
  target: number,
  frequency: number,
  range: number
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('adhkar_goals')
    .insert({ user_id: userId, title, target, frequency, range })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function listGoals(userId: string): Promise<AdhkarGoal[]> {
  const { data, error } = await supabase
    .from('adhkar_goals')
    .select('id, title, target, frequency, range, progress, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapGoal);
}

export async function updateGoalProgress(goalId: string, progress: number): Promise<void> {
  const { error } = await supabase.from('adhkar_goals').update({ progress }).eq('id', goalId);
  if (error) throw error;
}

export async function completeGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('adhkar_goals')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', goalId);
  if (error) throw error;
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase.from('adhkar_goals').delete().eq('id', goalId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// tasbeeh_sessions — one row per user, upserted lazily on first read since
// there is no signup-time trigger that creates it (unlike `profiles`).
// ---------------------------------------------------------------------------

export type TasbeehSession = { count: number; target: number; reps: number };

type SessionRow = { count: number; target: number; reps: number };

async function getOrCreateSessionRow(userId: string): Promise<SessionRow> {
  const { data, error } = await supabase
    .from('tasbeeh_sessions')
    .select('count, target, reps')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('tasbeeh_sessions')
    .insert({ user_id: userId })
    .select('count, target, reps')
    .single();
  if (createError) throw createError;
  return created;
}

export async function getTasbeehSession(userId: string): Promise<TasbeehSession> {
  const row = await getOrCreateSessionRow(userId);
  return { count: row.count, target: row.target, reps: row.reps };
}

// Mirrors AppState.tapTasbeeh: unconditionally reports `completed` once the
// target is reached (not just on the crossing tap) — screens navigate away
// on the first true, so this only matters if a caller keeps tapping past 100.
// Does one read + one write, so callers that need snappy rapid-tap UX should
// track the count locally and use `setTasbeehCount` instead (see TasbeehScreen).
export async function tapTasbeeh(userId: string): Promise<{ count: number; completed: boolean }> {
  const row = await getOrCreateSessionRow(userId);
  const count = row.count + 1;
  const completed = count >= row.target;
  const { error } = await supabase.from('tasbeeh_sessions').update({ count }).eq('user_id', userId);
  if (error) throw error;
  return { count, completed };
}

// Mirrors AppState.plusFive: clamps at target, and only reports `completed`
// on the tap that actually crosses it (so repeated +5 taps after capping out
// don't keep re-firing the goal-complete navigation).
export async function plusFiveTasbeeh(userId: string): Promise<{ count: number; completed: boolean }> {
  const row = await getOrCreateSessionRow(userId);
  const count = Math.min(row.count + 5, row.target);
  const completed = count >= row.target && row.count < row.target;
  const { error } = await supabase.from('tasbeeh_sessions').update({ count }).eq('user_id', userId);
  if (error) throw error;
  return { count, completed };
}

export async function undoTasbeeh(userId: string): Promise<{ count: number }> {
  const row = await getOrCreateSessionRow(userId);
  const count = Math.max(row.count - 1, 0);
  const { error } = await supabase.from('tasbeeh_sessions').update({ count }).eq('user_id', userId);
  if (error) throw error;
  return { count };
}

export async function resetTasbeeh(userId: string): Promise<{ count: number }> {
  const { error } = await supabase.from('tasbeeh_sessions').update({ count: 0 }).eq('user_id', userId);
  if (error) throw error;
  return { count: 0 };
}

// Same effect as resetTasbeeh (AppState's continueCounting also just zeroes
// `count`) — kept as a distinct export so call sites read the same way the
// contract/AppState named them.
export async function continueCounting(userId: string): Promise<{ count: number }> {
  return resetTasbeeh(userId);
}

// Adhkar-session screen's separate completions counter (AppState.dhikrReps),
// capped at 100 to match the original `Math.min(s.dhikrReps + 1, 100)`.
export async function incrementDhikrReps(userId: string): Promise<{ reps: number }> {
  const row = await getOrCreateSessionRow(userId);
  const reps = Math.min(row.reps + 1, 100);
  const { error } = await supabase.from('tasbeeh_sessions').update({ reps }).eq('user_id', userId);
  if (error) throw error;
  return { reps };
}

// Direct, non-read-modify-write persist of an absolute count. Screens that
// already know the next value locally (optimistic tap UI) use this instead
// of the read-then-write helpers above, to avoid a network round trip before
// the dial visibly moves. Kept here rather than inlined so every write still
// goes through one place.
export async function setTasbeehCount(userId: string, count: number): Promise<void> {
  const { error } = await supabase.from('tasbeeh_sessions').update({ count }).eq('user_id', userId);
  if (error) throw error;
}
