// Aggregates the data for the daily insight bottom sheet.
// Intentionally a single awaited call so the sheet can show a skeleton while
// everything loads — no per-card waterfalls.
import { supabase } from '../lib/supabase';
import { listGoals } from './adhkar';
import { listMyCircles, listCommunityGoals } from './community';
import { PRAYER_NAMES, toISODate, type PrayerName } from './prayers';

export type StreakDay = { label: string; hit: boolean };

export type InsightGoal = { id: string; title: string; pct: number; communityLinked: boolean };

export type InsightCircle = {
  id: string;
  name: string;
  memberCount: number;
  inviteCode: string | null;
};

export type DailyInsight = {
  // Greeting
  displayName: string;
  // Streak
  streak: number;
  personalBest: number;
  streakDays: StreakDay[];
  // Today's prayers
  todayPrayed: number;           // 0-5
  todayTotal: number;            // always 5
  prayedNames: PrayerName[];
  // Goals
  activeGoals: InsightGoal[];
  completedToday: number;
  // Dawah network (circles)
  circles: InsightCircle[];
  totalNetworkMembers: number;
  // Community
  communityDhikrTotal: number;
  communityGoalCount: number;
  myContributions: number;       // sum of user's myProgress across all goals
  // Milestones
  milestones: string[];          // earned badge labels, e.g. "7-Day Warrior"
};

// ─── Milestone definitions ────────────────────────────────────────────────────

const STREAK_MILESTONES: [number, string][] = [
  [3,   '3-Day Spark ✦'],
  [7,   '7-Day Warrior ⚔️'],
  [14,  '2-Week Steadfast 🌙'],
  [30,  '30-Day Devoted 🌟'],
  [60,  '60-Day Khushoo 💎'],
  [100, 'Centennial Mujahid 👑'],
];

function earnedMilestones(streak: number): string[] {
  return STREAK_MILESTONES.filter(([n]) => streak >= n).map(([, label]) => label);
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function fetchDailyInsight(userId: string): Promise<DailyInsight> {
  const today = toISODate(new Date());

  // Parallelise all network calls
  const [prayerLog, streakData, goals, circles, communityGoals] = await Promise.allSettled([
    // Today's prayer log
    supabase
      .from('prayer_logs')
      .select('prayer_name, done')
      .eq('user_id', userId)
      .eq('log_date', today),

    // Last 30 days of prayer logs for streak calculation
    supabase
      .from('prayer_logs')
      .select('log_date, done')
      .eq('user_id', userId)
      .eq('done', true)
      .gte('log_date', (() => {
        const d = new Date(); d.setDate(d.getDate() - 29); return toISODate(d);
      })())
      .lte('log_date', today),

    listGoals(userId),
    listMyCircles(userId),
    listCommunityGoals(userId),
  ]);

  // ── Today's prayers ──────────────────────────────────────────────────────────
  const prayedNames: PrayerName[] = [];
  if (prayerLog.status === 'fulfilled' && !prayerLog.value.error) {
    for (const row of prayerLog.value.data ?? []) {
      if (row.done) prayedNames.push(row.prayer_name as PrayerName);
    }
  }

  // ── Streak ───────────────────────────────────────────────────────────────────
  let streak = 0;
  let personalBest = 0;
  const streakDayHits = new Set<string>();

  if (streakData.status === 'fulfilled' && !streakData.value.error) {
    for (const row of streakData.value.data ?? []) {
      streakDayHits.add(row.log_date as string);
    }
    // Count consecutive days ending today
    let consecutive = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (streakDayHits.has(toISODate(d))) {
        consecutive++;
        personalBest = Math.max(personalBest, consecutive);
      } else {
        if (i === 0) { consecutive = 0; } // today not yet logged
        else break;
      }
    }
    streak = consecutive;
    personalBest = Math.max(personalBest, streak);
  }

  const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const streakDays: StreakDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { label: DAY_LETTERS[d.getDay()], hit: streakDayHits.has(toISODate(d)) };
  });

  // ── Goals ────────────────────────────────────────────────────────────────────
  const goalList = goals.status === 'fulfilled' ? goals.value : [];
  const activeGoals: InsightGoal[] = goalList
    .filter((g) => !g.completedAt)
    .slice(0, 4)
    .map((g) => ({
      id: g.id,
      title: g.title,
      pct: g.target > 0 ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0,
      communityLinked: !!g.communityGoalId,
    }));
  const completedToday = goalList.filter((g) => g.completedAt).length;

  // ── Circles ──────────────────────────────────────────────────────────────────
  const circleList = circles.status === 'fulfilled' ? circles.value : [];
  // Fetch invite codes for circles the user owns
  const ownedCircles = circleList.filter((c) => c.role === 'owner').slice(0, 3);
  const insightCircles: InsightCircle[] = await Promise.all(
    ownedCircles.map(async (c) => {
      try {
        const { data } = await supabase
          .from('community_circles')
          .select('invite_code')
          .eq('id', c.id)
          .maybeSingle();
        return { id: c.id, name: c.name, memberCount: c.memberCount, inviteCode: (data as { invite_code: string } | null)?.invite_code ?? null };
      } catch {
        return { id: c.id, name: c.name, memberCount: c.memberCount, inviteCode: null };
      }
    })
  );
  const totalNetworkMembers = circleList.reduce((s, c) => s + c.memberCount, 0);

  // ── Community ────────────────────────────────────────────────────────────────
  const goalData = communityGoals.status === 'fulfilled' ? communityGoals.value : [];
  const communityDhikrTotal = goalData.reduce((s, g) => s + g.totalProgress, 0);
  const myContributions = goalData.reduce((s, g) => s + (g.myProgress ?? 0), 0);

  // ── Milestones ───────────────────────────────────────────────────────────────
  const milestones = earnedMilestones(streak);

  // ── Display name ─────────────────────────────────────────────────────────────
  let displayName = '';
  try {
    const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
    displayName = (data as { display_name: string } | null)?.display_name ?? '';
  } catch { /* fine */ }

  return {
    displayName,
    streak,
    personalBest,
    streakDays,
    todayPrayed: prayedNames.length,
    todayTotal: PRAYER_NAMES.length,
    prayedNames,
    activeGoals,
    completedToday,
    circles: insightCircles,
    totalNetworkMembers,
    communityDhikrTotal,
    communityGoalCount: goalData.length,
    myContributions,
    milestones,
  };
}
