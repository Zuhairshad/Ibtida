-- 0003_adhkar.sql
-- Maps AppState's goal-creation form fields (newTarget/freq/range) into
-- persisted adhkar_goals rows, and the Tasbeeh dial + Adhkar-session reps
-- counter (count/dhikrReps) into a single tasbeeh_sessions row per user.
--
-- `frequency` and `range` are stored as the small-int indices the client
-- already uses (see src/state/AppState.tsx / GoalNewScreen.tsx / ProgressScreen.tsx):
--   frequency: 0 = 'Every day', 1 = 'Weekdays', 2 = 'Custom'
--   range:     0 = 'Today', 1 = 'Week', 2 = 'Month', 3 = 'Year'
-- The label arrays are app-owned, not duplicated in SQL, so later agents
-- must keep these indices in sync with GoalNewScreen's FREQS / ProgressScreen's
-- RANGES constants.

-- ---------------------------------------------------------------------------
-- adhkar_goals
-- ---------------------------------------------------------------------------
create table if not exists public.adhkar_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  target integer not null check (target > 0),
  frequency smallint not null default 0,
  range smallint not null default 0,
  progress integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists adhkar_goals_user_idx on public.adhkar_goals (user_id);

alter table public.adhkar_goals enable row level security;

create trigger adhkar_goals_set_updated_at
  before update on public.adhkar_goals
  for each row execute function public.set_updated_at();

create policy "adhkar_goals_select_own"
  on public.adhkar_goals for select
  using (auth.uid() = user_id);

create policy "adhkar_goals_insert_own"
  on public.adhkar_goals for insert
  with check (auth.uid() = user_id);

create policy "adhkar_goals_update_own"
  on public.adhkar_goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "adhkar_goals_delete_own"
  on public.adhkar_goals for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- tasbeeh_sessions — one live row per user. `count`/`target` mirror the
-- Tasbeeh screen dial (AppState.count / tasbeehTarget); `reps` mirrors the
-- Adhkar-session screen's separate completions counter (AppState.dhikrReps).
-- ---------------------------------------------------------------------------
create table if not exists public.tasbeeh_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  count integer not null default 0,
  target integer not null default 100,
  reps integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.tasbeeh_sessions enable row level security;

create trigger tasbeeh_sessions_set_updated_at
  before update on public.tasbeeh_sessions
  for each row execute function public.set_updated_at();

create policy "tasbeeh_sessions_select_own"
  on public.tasbeeh_sessions for select
  using (auth.uid() = user_id);

create policy "tasbeeh_sessions_insert_own"
  on public.tasbeeh_sessions for insert
  with check (auth.uid() = user_id);

create policy "tasbeeh_sessions_update_own"
  on public.tasbeeh_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasbeeh_sessions_delete_own"
  on public.tasbeeh_sessions for delete
  using (auth.uid() = user_id);
