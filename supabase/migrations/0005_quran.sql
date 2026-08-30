-- 0005_quran.sql
-- Maps AppState.bookmarks (number[] of surah numbers) and AppState.quran
-- ({ arabicSize, showTranslation, night }) reader display prefs.

-- ---------------------------------------------------------------------------
-- quran_bookmarks
-- ---------------------------------------------------------------------------
create table if not exists public.quran_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  surah_number smallint not null check (surah_number between 1 and 114),
  created_at timestamptz not null default now(),
  unique (user_id, surah_number)
);

create index if not exists quran_bookmarks_user_idx on public.quran_bookmarks (user_id);

alter table public.quran_bookmarks enable row level security;

create policy "quran_bookmarks_select_own"
  on public.quran_bookmarks for select
  using (auth.uid() = user_id);

create policy "quran_bookmarks_insert_own"
  on public.quran_bookmarks for insert
  with check (auth.uid() = user_id);

create policy "quran_bookmarks_delete_own"
  on public.quran_bookmarks for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- quran_reader_settings — one row per user.
-- ---------------------------------------------------------------------------
create table if not exists public.quran_reader_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  arabic_size smallint not null default 34 check (arabic_size between 24 and 48),
  show_translation boolean not null default true,
  night_mode boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.quran_reader_settings enable row level security;

create trigger quran_reader_settings_set_updated_at
  before update on public.quran_reader_settings
  for each row execute function public.set_updated_at();

create policy "quran_reader_settings_select_own"
  on public.quran_reader_settings for select
  using (auth.uid() = user_id);

create policy "quran_reader_settings_insert_own"
  on public.quran_reader_settings for insert
  with check (auth.uid() = user_id);

create policy "quran_reader_settings_update_own"
  on public.quran_reader_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "quran_reader_settings_delete_own"
  on public.quran_reader_settings for delete
  using (auth.uid() = user_id);
