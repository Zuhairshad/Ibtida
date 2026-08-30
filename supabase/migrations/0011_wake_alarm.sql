-- 0011_wake_alarm.sql
-- Wake-verified prayer alarm: a per-user, per-prayer alarm config (whose
-- verification_token is encoded into a QR code the user prints/displays on
-- their prayer mat — scanning it at wake time proves physical presence),
-- plus a log of successful wake verifications for later streak/stats views.

-- ---------------------------------------------------------------------------
-- prayer_alarm_settings — one row per (user, prayer). Reuses the existing
-- public.prayer_name enum from 0002_prayers.sql.
--
-- verification_token defaults to gen_random_uuid()-derived text so a row
-- always has a usable token immediately on insert; the app-side setup flow
-- is expected to overwrite it with its own freshly generated token (or
-- explicitly regenerate one later) — see wakeAlarm.ts's
-- regenerateVerificationToken in the CONTRACT. No SQL here attempts true
-- CSPRNG beyond gen_random_uuid(), per task instructions.
-- ---------------------------------------------------------------------------
create table if not exists public.prayer_alarm_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  prayer_name public.prayer_name not null,
  enabled boolean not null default false,
  wake_verification_method text not null default 'none' check (
    wake_verification_method in ('none', 'qr_scan')
  ),
  verification_token text not null default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, prayer_name),
  unique (user_id, verification_token)
);

alter table public.prayer_alarm_settings enable row level security;

create trigger prayer_alarm_settings_set_updated_at
  before update on public.prayer_alarm_settings
  for each row execute function public.set_updated_at();

create policy "prayer_alarm_settings_select_own"
  on public.prayer_alarm_settings for select
  using (auth.uid() = user_id);

create policy "prayer_alarm_settings_insert_own"
  on public.prayer_alarm_settings for insert
  with check (auth.uid() = user_id);

create policy "prayer_alarm_settings_update_own"
  on public.prayer_alarm_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "prayer_alarm_settings_delete_own"
  on public.prayer_alarm_settings for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- wake_verifications — a log of successful wake verifications. One row per
-- (user, prayer, alarm_date): a given prayer alarm can only be verified
-- once per calendar day. No update policy — log rows are append-only, same
-- convention as quran_bookmarks / emergency_overrides.
-- ---------------------------------------------------------------------------
create table if not exists public.wake_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prayer_name public.prayer_name not null,
  alarm_date date not null,
  verified_at timestamptz not null default now(),
  method text not null,
  unique (user_id, prayer_name, alarm_date)
);

create index if not exists wake_verifications_user_date_idx on public.wake_verifications (user_id, alarm_date);

alter table public.wake_verifications enable row level security;

create policy "wake_verifications_select_own"
  on public.wake_verifications for select
  using (auth.uid() = user_id);

create policy "wake_verifications_insert_own"
  on public.wake_verifications for insert
  with check (auth.uid() = user_id);

create policy "wake_verifications_delete_own"
  on public.wake_verifications for delete
  using (auth.uid() = user_id);
