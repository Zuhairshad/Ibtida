-- 0009_prayer_calc_settings.sql
-- Real prayer-time calculation: one row per user holding the location,
-- timezone and adhan-js calculation parameters needed to compute prayer
-- times client-side (replaces any hardcoded/static prayer-time data).
-- calculation_method values are exactly adhan-js's supported
-- CalculationMethod names — keep this list in sync with whatever adhan-js
-- version the client depends on.

create table if not exists public.prayer_calc_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text not null,
  calculation_method text not null default 'MuslimWorldLeague' check (
    calculation_method in (
      'MuslimWorldLeague',
      'Egyptian',
      'Karachi',
      'UmmAlQura',
      'Dubai',
      'MoonsightingCommittee',
      'NorthAmerica',
      'Kuwait',
      'Qatar',
      'Singapore',
      'Tehran',
      'Turkey'
    )
  ),
  madhab text not null default 'Shafi' check (madhab in ('Shafi', 'Hanafi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prayer_calc_settings enable row level security;

create trigger prayer_calc_settings_set_updated_at
  before update on public.prayer_calc_settings
  for each row execute function public.set_updated_at();

create policy "prayer_calc_settings_select_own"
  on public.prayer_calc_settings for select
  using (auth.uid() = user_id);

create policy "prayer_calc_settings_insert_own"
  on public.prayer_calc_settings for insert
  with check (auth.uid() = user_id);

create policy "prayer_calc_settings_update_own"
  on public.prayer_calc_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "prayer_calc_settings_delete_own"
  on public.prayer_calc_settings for delete
  using (auth.uid() = user_id);
