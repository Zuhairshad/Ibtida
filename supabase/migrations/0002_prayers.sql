-- 0002_prayers.sql
-- Maps AppState.logged (per-prayer done/undone for "today") and
-- AppState.adhan (per-prayer adhan notification toggle).

create type public.prayer_name as enum ('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha');

-- ---------------------------------------------------------------------------
-- prayer_logs — one row per user, per calendar date, per prayer.
-- ---------------------------------------------------------------------------
create table if not exists public.prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  prayer_name public.prayer_name not null,
  done boolean not null default false,
  logged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date, prayer_name)
);

create index if not exists prayer_logs_user_date_idx
  on public.prayer_logs (user_id, log_date);

alter table public.prayer_logs enable row level security;

create trigger prayer_logs_set_updated_at
  before update on public.prayer_logs
  for each row execute function public.set_updated_at();

create policy "prayer_logs_select_own"
  on public.prayer_logs for select
  using (auth.uid() = user_id);

create policy "prayer_logs_insert_own"
  on public.prayer_logs for insert
  with check (auth.uid() = user_id);

create policy "prayer_logs_update_own"
  on public.prayer_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "prayer_logs_delete_own"
  on public.prayer_logs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- adhan_settings — one row per user, per prayer (enabled/disabled).
-- ---------------------------------------------------------------------------
create table if not exists public.adhan_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  prayer_name public.prayer_name not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, prayer_name)
);

alter table public.adhan_settings enable row level security;

create trigger adhan_settings_set_updated_at
  before update on public.adhan_settings
  for each row execute function public.set_updated_at();

create policy "adhan_settings_select_own"
  on public.adhan_settings for select
  using (auth.uid() = user_id);

create policy "adhan_settings_insert_own"
  on public.adhan_settings for insert
  with check (auth.uid() = user_id);

create policy "adhan_settings_update_own"
  on public.adhan_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "adhan_settings_delete_own"
  on public.adhan_settings for delete
  using (auth.uid() = user_id);
