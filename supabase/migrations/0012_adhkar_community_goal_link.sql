-- 0012_adhkar_community_goal_link.sql
-- Adds an optional community_goal_id FK to adhkar_goals so a personal goal
-- can declare it contributes to one of the seeded global community goals.
-- When this column is set, the app increments the matching
-- community_goal_members.progress row in tandem with personal progress.
-- No new RLS policies needed — community_goals and community_goal_members
-- already have the right policies from 0006_community.sql.

ALTER TABLE public.adhkar_goals
  ADD COLUMN IF NOT EXISTS community_goal_id uuid
    REFERENCES public.community_goals (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS adhkar_goals_community_goal_idx
  ON public.adhkar_goals (community_goal_id)
  WHERE community_goal_id IS NOT NULL;
