-- 0010_ibadah_lock.sql
-- "Ibadah Lock" app-blocking: links a focus session to the adhkar goal that
-- unlocks it, tracks which apps a user has configured to block during a
-- locked session, and keeps an own-eyes-only audit log of emergency
-- overrides. NOT a punitive/surveillance feature — emergency_overrides is
-- readable only by the row's own user (e.g. "you used emergency unlock 2
-- times this week"), never exposed to anyone else, same as every other
-- table in this schema.

-- ---------------------------------------------------------------------------
-- focus_sessions.goal_id — links a focus session to the adhkar_goals row
-- whose completion unlocks it. Nullable: plain (non-goal-gated) Ibadah
-- Focus sessions already created by 0007_focus.sql keep goal_id null.
-- on delete set null (not cascade): deleting the goal shouldn't destroy the
-- session's own history/log.
-- ---------------------------------------------------------------------------
alter table public.focus_sessions
  add column if not exists goal_id uuid references public.adhkar_goals (id) on delete set null;

create index if not exists focus_sessions_goal_idx on public.focus_sessions (goal_id);

-- ---------------------------------------------------------------------------
-- blocked_apps — one row per (user, platform, app_identifier): the set of
-- apps a user has configured Ibadah Lock to block.
--
-- app_identifier is an Android package name (e.g. "com.instagram.android")
-- on Android; on iOS it is the opaque base64 ApplicationToken string handed
-- back by Apple's Family Controls picker — Apple's Family Controls
-- framework never exposes a real bundle id or app name to third-party code,
-- the user picks apps via Apple's own system picker and the app only ever
-- receives an opaque token to persist. display_name is therefore nullable:
-- on iOS a human-readable label may not always be available alongside the
-- token, while Android can usually derive one from the package manager.
-- ---------------------------------------------------------------------------
create table if not exists public.blocked_apps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  app_identifier text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, app_identifier)
);

create index if not exists blocked_apps_user_idx on public.blocked_apps (user_id);

alter table public.blocked_apps enable row level security;

create trigger blocked_apps_set_updated_at
  before update on public.blocked_apps
  for each row execute function public.set_updated_at();

create policy "blocked_apps_select_own"
  on public.blocked_apps for select
  using (auth.uid() = user_id);

create policy "blocked_apps_insert_own"
  on public.blocked_apps for insert
  with check (auth.uid() = user_id);

create policy "blocked_apps_update_own"
  on public.blocked_apps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "blocked_apps_delete_own"
  on public.blocked_apps for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- emergency_overrides — an append-only audit log of emergency-unlock use
-- during a goal-locked focus session. No update policy (log rows are never
-- edited in place, only appended and optionally cleared) — same convention
-- as quran_bookmarks in 0005_quran.sql.
-- ---------------------------------------------------------------------------
create table if not exists public.emergency_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  focus_session_id uuid not null references public.focus_sessions (id) on delete cascade,
  reason text,
  used_at timestamptz not null default now()
);

create index if not exists emergency_overrides_user_idx on public.emergency_overrides (user_id);
create index if not exists emergency_overrides_session_idx on public.emergency_overrides (focus_session_id);

alter table public.emergency_overrides enable row level security;

create policy "emergency_overrides_select_own"
  on public.emergency_overrides for select
  using (auth.uid() = user_id);

create policy "emergency_overrides_insert_own"
  on public.emergency_overrides for insert
  with check (auth.uid() = user_id);

create policy "emergency_overrides_delete_own"
  on public.emergency_overrides for delete
  using (auth.uid() = user_id);
