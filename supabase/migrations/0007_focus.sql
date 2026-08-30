-- 0007_focus.sql
-- Maps AppState.focusApps (Record<string,boolean>) + focusDuration (index
-- into FOCUS_DURATIONS) config, and models actual Ibadah Focus sessions
-- (AppState.focusCount / focusTarget while a session runs).

-- ---------------------------------------------------------------------------
-- focus_settings — one row per user: which apps are restricted + chosen
-- duration. blocked_apps is a jsonb object mirroring AppState.focusApps,
-- e.g. {"Instagram": true, "TikTok": true, "YouTube": false, "Facebook": true}.
-- ---------------------------------------------------------------------------
create table if not exists public.focus_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  blocked_apps jsonb not null default '{}'::jsonb,
  duration_index smallint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.focus_settings enable row level security;

create trigger focus_settings_set_updated_at
  before update on public.focus_settings
  for each row execute function public.set_updated_at();

create policy "focus_settings_select_own"
  on public.focus_settings for select
  using (auth.uid() = user_id);

create policy "focus_settings_insert_own"
  on public.focus_settings for insert
  with check (auth.uid() = user_id);

create policy "focus_settings_update_own"
  on public.focus_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "focus_settings_delete_own"
  on public.focus_settings for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- focus_sessions — a log of individual Ibadah Focus sessions.
-- ---------------------------------------------------------------------------
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  count integer not null default 0,
  target integer not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists focus_sessions_user_idx on public.focus_sessions (user_id);

alter table public.focus_sessions enable row level security;

create policy "focus_sessions_select_own"
  on public.focus_sessions for select
  using (auth.uid() = user_id);

create policy "focus_sessions_insert_own"
  on public.focus_sessions for insert
  with check (auth.uid() = user_id);

create policy "focus_sessions_update_own"
  on public.focus_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "focus_sessions_delete_own"
  on public.focus_sessions for delete
  using (auth.uid() = user_id);
