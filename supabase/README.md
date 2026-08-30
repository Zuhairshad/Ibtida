# Supabase backend

This directory holds the SQL migrations that define Ibtida's Supabase
backend — the single source of truth for everything the app currently
keeps only in memory (`src/state/AppState.tsx`).

## This agent/session never applies these migrations

Nothing here has been run against a live project, and no live Supabase
project was contacted while writing it. These are local scaffolding only.
**The project owner applies them**, using whichever of these they prefer:

### Option A — Supabase CLI (recommended)

```sh
# once, from the repo root:
supabase login
supabase link --project-ref <your-project-ref>

# apply every migration in supabase/migrations/, in order:
supabase db push
```

### Option B — SQL editor

Open the Supabase Dashboard → SQL Editor for your project, and paste in
each file under `migrations/` in filename order (`0001_...sql`,
`0002_...sql`, ...). Each file is idempotent-ish (`create table if not
exists`, `drop trigger if exists` before `create trigger`) but they are
NOT re-runnable after data exists if you re-run `create policy` — drop
conflicting policies first if you need to re-apply one by hand.

## Migration order

| File | Adds |
|---|---|
| `0001_profiles.sql` | `profiles`, `handle_new_user` trigger on `auth.users`, shared `set_updated_at()` helper |
| `0002_prayers.sql` | `prayer_name` enum, `prayer_logs`, `adhan_settings` |
| `0003_adhkar.sql` | `adhkar_goals`, `tasbeeh_sessions` |
| `0004_settings.sql` | `privacy_settings`, `notification_settings` |
| `0005_quran.sql` | `quran_bookmarks`, `quran_reader_settings` |
| `0006_community.sql` | `community_circles`, `circle_members`, `community_goals`, `community_goal_members` |
| `0007_focus.sql` | `focus_settings`, `focus_sessions` |

## Row Level Security

Every table has RLS enabled. Every table is **owner-only** (`auth.uid() =
user_id`, or `= id` for `profiles`) for select/insert/update/delete,
**except** the four community/circle tables in `0006_community.sql`,
where circle members can read shared circle data (each other's roster
entries, circle-scoped community goals, and other members' participation
rows) while every write is still scoped to `auth.uid()`. See the header
comment in `0006_community.sql` for the exact policy reasoning, and the
BACKEND CONTRACT this migration set shipped with for a full policy-by-table
summary.

## Known follow-up (not implemented here)

`privacy_settings` lets a user set `'Profile visibility'` to `Circles` or
`Friends`, implying other users should sometimes be able to read a
profile. `profiles` is currently strict owner-only regardless of that
setting — wiring RLS to read a user's own `privacy_settings` row is left
for a later migration once the community feature set is built out, to
avoid guessing at product behavior here.

## Environment variables

The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
(see `.env.example` at the repo root and `src/lib/supabase.ts`). These are
Expo's convention for client-exposed env vars — anything prefixed
`EXPO_PUBLIC_` is inlined into the built JS bundle, so only ever put the
public **anon** key there, never a service role key.
