-- 0004_settings.sql
-- Maps AppState.privacy (Record<string,string>, each key cycling through
-- PRIVACY_OPTIONS) and AppState.notifications (Record<string,boolean>) into
-- one-row-per-user-per-key tables.
--
-- DESIGN NOTE (documented per task instructions): a key/value row per
-- setting was chosen over a single jsonb column because every mutator
-- (cyclePrivacy(key), toggleNotification(key)) touches exactly one key at a
-- time — this lets the service layer UPSERT a single row instead of
-- read-modify-write-ing a whole jsonb blob, and lets Postgres CHECK
-- constraints validate the key/value pairs.

-- ---------------------------------------------------------------------------
-- privacy_settings
-- ---------------------------------------------------------------------------
create table if not exists public.privacy_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (
    key in (
      'Profile visibility',
      'Activity visibility',
      'Community participation',
      'Goal visibility',
      'Location',
      'Analytics'
    )
  ),
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.privacy_settings enable row level security;

create trigger privacy_settings_set_updated_at
  before update on public.privacy_settings
  for each row execute function public.set_updated_at();

create policy "privacy_settings_select_own"
  on public.privacy_settings for select
  using (auth.uid() = user_id);

create policy "privacy_settings_insert_own"
  on public.privacy_settings for insert
  with check (auth.uid() = user_id);

create policy "privacy_settings_update_own"
  on public.privacy_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "privacy_settings_delete_own"
  on public.privacy_settings for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notification_settings
-- ---------------------------------------------------------------------------
create table if not exists public.notification_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (
    key in ('Prayer', 'Adhkar', 'Goals', 'Quran', 'Focus', 'Community')
  ),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.notification_settings enable row level security;

create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

create policy "notification_settings_select_own"
  on public.notification_settings for select
  using (auth.uid() = user_id);

create policy "notification_settings_insert_own"
  on public.notification_settings for insert
  with check (auth.uid() = user_id);

create policy "notification_settings_update_own"
  on public.notification_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notification_settings_delete_own"
  on public.notification_settings for delete
  using (auth.uid() = user_id);
