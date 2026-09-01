// Service layer for the Community & Circles domain.
// Backed by `community_circles`, `circle_members`, `community_goals` and
// `community_goal_members` (see supabase/migrations/0006_community.sql and
// 0008_circle_privacy_friends.sql). RLS on all four is the "sanctioned
// exception" to owner-only: a signed-in user can read fellow circle members
// and circle-scoped goals, but every write still targets only their own row
// (`auth.uid() = user_id` / `= created_by`). This file has no React context
// of its own — every call takes the caller's `userId` explicitly, supplied
// by screens via `useAuth().user.id`.
import { supabase } from '../lib/supabase';

export type CirclePrivacy = 'Invite only' | 'Private' | 'Friends' | 'Public';
export type CircleRole = 'owner' | 'member';

export type MyCircle = {
  id: string;
  name: string;
  privacy: CirclePrivacy;
  role: CircleRole;
  memberCount: number;
};

export type CommunityGoal = {
  id: string;
  name: string;
  target: number;
  unit: string | null;
  endsAt: string | null;
  circleId: string | null;
  /** Distinct users who have joined this goal. */
  participantCount: number;
  /** Sum of every joined member's `progress` — the shared/community total. */
  totalProgress: number;
  /** The calling user's own `progress` row, 0 if they haven't joined. */
  myProgress: number;
  joined: boolean;
};

// ---------------------------------------------------------------------------
// community_circles + circle_members
// ---------------------------------------------------------------------------

type CircleEmbedRow = {
  circle_id: string;
  role: string;
  community_circles: { id: string; name: string; privacy: string } | { id: string; name: string; privacy: string }[] | null;
};

function firstOf<T>(v: T | T[] | null): T | null {
  if (v === null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** Circles the given user belongs to (owner or member), newest membership first. */
export async function listMyCircles(userId: string): Promise<MyCircle[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select('circle_id, role, community_circles(id, name, privacy)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as CircleEmbedRow[];
  if (rows.length === 0) return [];

  // One extra query to count every member row across all of this user's
  // circles at once, rather than one count-query per circle.
  const circleIds = rows.map((r) => r.circle_id);
  const { data: allMembers, error: countErr } = await supabase
    .from('circle_members')
    .select('circle_id')
    .in('circle_id', circleIds);
  if (countErr) throw countErr;

  const counts = new Map<string, number>();
  (allMembers ?? []).forEach((m: { circle_id: string }) => {
    counts.set(m.circle_id, (counts.get(m.circle_id) ?? 0) + 1);
  });

  const out: MyCircle[] = [];
  for (const r of rows) {
    const circle = firstOf(r.community_circles);
    if (!circle) continue;
    out.push({
      id: circle.id,
      name: circle.name,
      privacy: circle.privacy as CirclePrivacy,
      role: r.role as CircleRole,
      memberCount: counts.get(r.circle_id) ?? 1,
    });
  }
  return out;
}

/** Creates a circle and adds the creator as its `owner` member. */
export async function createCircle(userId: string, name: string, privacy: CirclePrivacy): Promise<{ id: string }> {
  const { data: circle, error } = await supabase
    .from('community_circles')
    .insert({ name, privacy, created_by: userId })
    .select('id')
    .single();
  if (error) throw error;

  const { error: memberErr } = await supabase
    .from('circle_members')
    .insert({ circle_id: circle.id, user_id: userId, role: 'owner' });
  if (memberErr) throw memberErr;

  return { id: circle.id as string };
}

/** Self-joins an existing circle as a plain member. Idempotent. */
export async function joinCircle(userId: string, circleId: string): Promise<void> {
  const { error } = await supabase
    .from('circle_members')
    .upsert({ circle_id: circleId, user_id: userId, role: 'member' }, { onConflict: 'circle_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
}

/** Removes the caller's own membership row. */
export async function leaveCircle(userId: string, circleId: string): Promise<void> {
  const { error } = await supabase.from('circle_members').delete().eq('circle_id', circleId).eq('user_id', userId);
  if (error) throw error;
}

/**
 * Roster of a circle. Deliberately returns only ids/roles/timestamps, not
 * display names or avatars — `profiles` is still strict owner-only (see
 * supabase/README.md's documented follow-up), so this file cannot resolve
 * another member's profile row under current RLS.
 */
export async function listCircleMembers(circleId: string): Promise<{ userId: string; role: CircleRole; joinedAt: string }[]> {
  const { data, error } = await supabase
    .from('circle_members')
    .select('user_id, role, joined_at')
    .eq('circle_id', circleId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: { user_id: string; role: string; joined_at: string }) => ({
    userId: r.user_id,
    role: r.role as CircleRole,
    joinedAt: r.joined_at,
  }));
}

// ---------------------------------------------------------------------------
// community_goals + community_goal_members
// ---------------------------------------------------------------------------

type GoalRow = { id: string; name: string; target: number | string; unit: string | null; ends_at: string | null; circle_id: string | null };
type GoalMemberRow = { goal_id: string; user_id: string; progress: number | string };

/**
 * Lists community goals — global ones (pass no `circleId`, or explicitly
 * `null`) or a specific circle's own goals — along with each goal's
 * participant count, summed community progress, and the calling user's own
 * join state/progress. Ordered by `created_at` ascending so index-based
 * navigation (`nav.communityGoal(i)`, which only carries a numeric `id` per
 * CommunityStackParamList) stays stable between the list and detail screens.
 */
export async function listCommunityGoals(userId: string, circleId: string | null = null): Promise<CommunityGoal[]> {
  let query = supabase
    .from('community_goals')
    .select('id, name, target, unit, ends_at, circle_id')
    .order('created_at', { ascending: true });
  query = circleId === null ? query.is('circle_id', null) : query.eq('circle_id', circleId);

  const { data: goals, error } = await query;
  if (error) throw error;
  const rows = (goals ?? []) as GoalRow[];
  if (rows.length === 0) return [];

  const goalIds = rows.map((g) => g.id);
  const { data: members, error: memberErr } = await supabase
    .from('community_goal_members')
    .select('goal_id, user_id, progress')
    .in('goal_id', goalIds);
  if (memberErr) throw memberErr;

  type Agg = { participantCount: number; totalProgress: number; myProgress: number; joined: boolean };
  const byGoal = new Map<string, Agg>();
  ((members ?? []) as GoalMemberRow[]).forEach((m) => {
    const agg = byGoal.get(m.goal_id) ?? { participantCount: 0, totalProgress: 0, myProgress: 0, joined: false };
    agg.participantCount += 1;
    agg.totalProgress += Number(m.progress) || 0;
    if (m.user_id === userId) {
      agg.joined = true;
      agg.myProgress = Number(m.progress) || 0;
    }
    byGoal.set(m.goal_id, agg);
  });

  return rows.map((g) => {
    const agg = byGoal.get(g.id) ?? { participantCount: 0, totalProgress: 0, myProgress: 0, joined: false };
    return {
      id: g.id,
      name: g.name,
      target: Number(g.target),
      unit: g.unit,
      endsAt: g.ends_at,
      circleId: g.circle_id,
      participantCount: agg.participantCount,
      totalProgress: agg.totalProgress,
      myProgress: agg.myProgress,
      joined: agg.joined,
    };
  });
}

/** Self-joins a community goal at 0 progress. Idempotent. */
export async function joinCommunityGoal(userId: string, goalId: string): Promise<void> {
  const { error } = await supabase
    .from('community_goal_members')
    .upsert({ goal_id: goalId, user_id: userId, progress: 0 }, { onConflict: 'goal_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
}

/** Overwrites the caller's own progress on a goal they've already joined. */
export async function updateMyGoalProgress(userId: string, goalId: string, progress: number): Promise<void> {
  const { error } = await supabase
    .from('community_goal_members')
    .update({ progress })
    .eq('goal_id', goalId)
    .eq('user_id', userId);
  if (error) throw error;
}

/** Every participant's progress on one goal, highest first. */
export async function listGoalParticipants(goalId: string): Promise<{ userId: string; progress: number }[]> {
  const { data, error } = await supabase
    .from('community_goal_members')
    .select('user_id, progress')
    .eq('goal_id', goalId)
    .order('progress', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: { user_id: string; progress: number | string }) => ({ userId: r.user_id, progress: Number(r.progress) }));
}

// ---------------------------------------------------------------------------
// Circle detail, invite, member management, circle-scoped goals
// ---------------------------------------------------------------------------

export type CircleMemberProfile = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: CircleRole;
  joinedAt: string;
};

export type CircleDetail = {
  id: string;
  name: string;
  privacy: CirclePrivacy;
  inviteCode: string;
  createdBy: string;
  members: CircleMemberProfile[];
};

export async function getCircleDetail(circleId: string): Promise<CircleDetail> {
  const [detailRes, profilesRes] = await Promise.all([
    supabase
      .from('community_circles')
      .select('id, name, privacy, invite_code, created_by')
      .eq('id', circleId)
      .single(),
    supabase.rpc('get_circle_member_profiles', { p_circle_id: circleId }),
  ]);
  if (detailRes.error) throw detailRes.error;
  const d = detailRes.data as { id: string; name: string; privacy: string; invite_code: string; created_by: string };
  const profiles = (profilesRes.data ?? []) as {
    user_id: string; display_name: string | null; avatar_url: string | null; role: string; joined_at: string;
  }[];
  return {
    id: d.id,
    name: d.name,
    privacy: d.privacy as CirclePrivacy,
    inviteCode: d.invite_code,
    createdBy: d.created_by,
    members: profiles.map((p) => ({
      userId: p.user_id,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      role: p.role as CircleRole,
      joinedAt: p.joined_at,
    })),
  };
}

export async function joinCircleByCode(userId: string, code: string): Promise<{ circleId: string; circleName: string }> {
  const { data, error } = await supabase.rpc('join_circle_by_code', {
    p_code: code.trim().replace(/.*\/join\//, ''),
    p_user_id: userId,
  });
  if (error) throw error;
  const d = data as { circleId: string; circleName: string };
  return { circleId: d.circleId, circleName: d.circleName };
}

export async function kickMember(circleId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase
    .from('circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', targetUserId);
  if (error) throw error;
}

export async function deleteMembership(circleId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteCircle(circleId: string): Promise<void> {
  const { error } = await supabase
    .from('community_circles')
    .delete()
    .eq('id', circleId);
  if (error) throw error;
}

export type CircleGoal = {
  id: string;
  name: string;
  target: number;
  unit: string | null;
  totalProgress: number;
  participantCount: number;
};

export async function listCircleGoals(circleId: string): Promise<CircleGoal[]> {
  const { data, error } = await supabase
    .from('community_goals')
    .select('id, name, target, unit, community_goal_members(progress)')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((g: { id: string; name: string; target: number; unit: string | null; community_goal_members: { progress: number }[] | null }) => {
    const members = g.community_goal_members ?? [];
    return {
      id: g.id,
      name: g.name,
      target: g.target,
      unit: g.unit,
      totalProgress: members.reduce((s, m) => s + m.progress, 0),
      participantCount: members.length,
    };
  });
}

export async function createCircleGoal(
  circleId: string,
  userId: string,
  name: string,
  target: number,
  unit?: string,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('community_goals')
    .insert({ circle_id: circleId, created_by: userId, name, target, unit: unit || null })
    .select('id')
    .single();
  if (error) throw error;
  return { id: (data as { id: string }).id };
}

export async function regenerateInviteCode(circleId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_circle_invite', { p_circle_id: circleId });
  if (error) throw error;
  return data as string;
}

export async function updateCircle(circleId: string, name: string, privacy: CirclePrivacy): Promise<void> {
  const { error } = await supabase
    .from('community_circles')
    .update({ name, privacy })
    .eq('id', circleId);
  if (error) throw error;
}

export async function contributeToCircleGoal(goalId: string, userId: string, amount: number): Promise<number> {
  const { data, error } = await supabase.rpc('contribute_to_goal', {
    p_goal_id: goalId,
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) throw error;
  return Number(data);
}
