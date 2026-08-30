-- 0001_profiles.sql
-- Foundation: profile row per auth user, auto-created on signup, plus a
-- shared `set_updated_at` trigger helper reused by later migrations.

-- ---------------------------------------------------------------------------
-- Shared helper: keeps an `updated_at` column current on every UPDATE.
-- Reused by prayer_logs, adhan_settings, adhkar_goals, tasbeeh_sessions,
-- privacy_settings, notification_settings, quran_reader_settings and
-- focus_settings in later migrations.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Private by default: a user can only see/edit their own profile row.
-- NOTE for later agents: PRIVACY_OPTIONS['Profile visibility'] (Private /
-- Circles / Friends) implies richer cross-user visibility should eventually
-- read this setting from privacy_settings — that policy is intentionally
-- NOT implemented here (would need a privacy_settings join) and is left as a
-- documented follow-up in supabase/README.md.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- handle_new_user: standard Supabase pattern — a trigger on auth.users that
-- inserts the matching profiles row the moment a user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
