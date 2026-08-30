-- 0006_community.sql
-- Maps AppState.circleNames (string[] of joined circles) and
-- AppState.joined (boolean[], which community goals were joined).
--
-- These are the ONLY tables in this schema that are not strictly
-- owner-only: circle members can read data shared within a circle they
-- belong to (fellow members, circle-scoped community goals, and other
-- members' participation in those goals). Writes stay scoped to the
-- acting user (auth.uid()) throughout — nobody can write rows on another
-- user's behalf, only read shared circle context.
--
-- All four tables are created first, then RLS is enabled and policies are
-- added — several policies below reference sibling tables (e.g.
-- community_circles' SELECT policy queries circle_members), which requires
-- every table to already exist before any such policy is created.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.community_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  privacy text not null default 'Private' check (privacy in ('Invite only', 'Private', 'Public')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- join table (a circle's roster)
create table if not exists public.circle_members (
  circle_id uuid not null references public.community_circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index if not exists circle_members_user_idx on public.circle_members (user_id);

-- global goals (circle_id null, e.g. "10 Million Durood") or circle-scoped
-- goals (circle_id set, e.g. a circle's own Fajr challenge)
create table if not exists public.community_goals (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references public.community_circles (id) on delete cascade,
  name text not null,
  target numeric not null check (target > 0),
  unit text,
  ends_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists community_goals_circle_idx on public.community_goals (circle_id);

-- tracks which users joined which community goal (AppState.joined) plus
-- each member's own contribution/progress
create table if not exists public.community_goal_members (
  goal_id uuid not null references public.community_goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  progress numeric not null default 0,
  joined_at timestamptz not null default now(),
  primary key (goal_id, user_id)
);

create index if not exists community_goal_members_user_idx on public.community_goal_members (user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.community_circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.community_goals enable row level security;
alter table public.community_goal_members enable row level security;

-- community_circles: readable by the creator and by anyone already a member.
create policy "community_circles_select_member_or_owner"
  on public.community_circles for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.circle_members m
      where m.circle_id = community_circles.id and m.user_id = auth.uid()
    )
  );

create policy "community_circles_insert_own"
  on public.community_circles for insert
  with check (auth.uid() = created_by);

create policy "community_circles_update_owner"
  on public.community_circles for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "community_circles_delete_owner"
  on public.community_circles for delete
  using (auth.uid() = created_by);

-- circle_members: any member of a circle can see the rest of its roster.
create policy "circle_members_select_fellow_member"
  on public.circle_members for select
  using (
    exists (
      select 1 from public.circle_members m2
      where m2.circle_id = circle_members.circle_id and m2.user_id = auth.uid()
    )
  );

-- Users can join themselves; a circle's owner can add members directly.
create policy "circle_members_insert_self_or_owner"
  on public.circle_members for insert
  with check (
    auth.uid() = user_id
    or auth.uid() = (
      select created_by from public.community_circles c where c.id = circle_id
    )
  );

-- Only the circle owner changes roles.
create policy "circle_members_update_owner"
  on public.circle_members for update
  using (
    auth.uid() = (select created_by from public.community_circles c where c.id = circle_id)
  )
  with check (
    auth.uid() = (select created_by from public.community_circles c where c.id = circle_id)
  );

-- Members can leave on their own; the owner can remove others.
create policy "circle_members_delete_self_or_owner"
  on public.circle_members for delete
  using (
    auth.uid() = user_id
    or auth.uid() = (select created_by from public.community_circles c where c.id = circle_id)
  );

-- community_goals: global goals (circle_id is null) are readable by any
-- signed-in user; circle-scoped goals are readable only by that circle's
-- members.
create policy "community_goals_select_global_or_member"
  on public.community_goals for select
  using (
    circle_id is null
    or exists (
      select 1 from public.circle_members m
      where m.circle_id = community_goals.circle_id and m.user_id = auth.uid()
    )
  );

create policy "community_goals_insert_own"
  on public.community_goals for insert
  with check (
    auth.uid() = created_by
    and (
      circle_id is null
      or exists (
        select 1 from public.circle_members m
        where m.circle_id = community_goals.circle_id and m.user_id = auth.uid()
      )
    )
  );

create policy "community_goals_update_owner"
  on public.community_goals for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "community_goals_delete_owner"
  on public.community_goals for delete
  using (auth.uid() = created_by);

-- community_goal_members: a user always sees their own participation row;
-- they also see other participants' rows for global goals and for goals
-- scoped to a circle they belong to (so e.g. a circle leaderboard/participant
-- count can render).
create policy "community_goal_members_select_visible"
  on public.community_goal_members for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.community_goals g
      where g.id = community_goal_members.goal_id
        and (
          g.circle_id is null
          or exists (
            select 1 from public.circle_members m
            where m.circle_id = g.circle_id and m.user_id = auth.uid()
          )
        )
    )
  );

create policy "community_goal_members_insert_own"
  on public.community_goal_members for insert
  with check (auth.uid() = user_id);

create policy "community_goal_members_update_own"
  on public.community_goal_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "community_goal_members_delete_own"
  on public.community_goal_members for delete
  using (auth.uid() = user_id);
