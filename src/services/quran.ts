// Service layer for the Quran domain: bookmarks + reader display settings.
// Backed by `quran_bookmarks` and `quran_reader_settings`
// (see supabase/migrations/0005_quran.sql). RLS on both tables is
// owner-only (`auth.uid() = user_id`), so every call here takes the
// caller's `userId` explicitly rather than reading it off a hook — this
// file has no React context of its own, screens supply it via
// `useAuth().user.id`.
//
// CONTENT GOVERNANCE: this file only ever persists bookmarks/prefs — it
// never touches Quran verse or hadith text. `src/state/quranData.ts`'s
// "pending source" placeholders stay exactly as-is; nothing here fetches
// or generates scripture.
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// quran_bookmarks
// ---------------------------------------------------------------------------

export async function listBookmarks(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('quran_bookmarks')
    .select('surah_number')
    .eq('user_id', userId)
    .order('surah_number', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => row.surah_number as number);
}

// Mirrors AppState.toggleBookmark: flips membership and reports the new
// bookmarked state. Does one read + one write (existence check, then
// insert/delete) rather than a blind insert-or-delete, so it never fails
// on the unique (user_id, surah_number) constraint from a double-tap.
export async function toggleBookmark(userId: string, surahNumber: number): Promise<boolean> {
  const { data: existing, error: selectError } = await supabase
    .from('quran_bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('surah_number', surahNumber)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase.from('quran_bookmarks').delete().eq('id', existing.id);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('quran_bookmarks')
    .insert({ user_id: userId, surah_number: surahNumber });
  if (error) throw error;
  return true;
}

// ---------------------------------------------------------------------------
// quran_reader_settings — one row per user, upserted lazily on first read
// since there is no signup-time trigger that creates it (unlike `profiles`).
// ---------------------------------------------------------------------------

export type QuranReaderSettings = { arabicSize: number; showTranslation: boolean; night: boolean };

type SettingsRow = { arabic_size: number; show_translation: boolean; night_mode: boolean };

function clampArabicSize(px: number): number {
  return Math.min(Math.max(Math.round(px), 24), 48);
}

async function getOrCreateSettingsRow(userId: string): Promise<SettingsRow> {
  const { data, error } = await supabase
    .from('quran_reader_settings')
    .select('arabic_size, show_translation, night_mode')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: created, error: createError } = await supabase
    .from('quran_reader_settings')
    .insert({ user_id: userId })
    .select('arabic_size, show_translation, night_mode')
    .single();
  if (createError) throw createError;
  return created;
}

export async function getReaderSettings(userId: string): Promise<QuranReaderSettings> {
  const row = await getOrCreateSettingsRow(userId);
  return { arabicSize: row.arabic_size, showTranslation: row.show_translation, night: row.night_mode };
}

// Clamps to the same 24–48 range as the `quran_reader_settings.arabic_size`
// check constraint (and AppState.setArabicSize before it). Returns the
// clamped value so the caller can sync local UI state to what was persisted.
export async function setArabicSize(userId: string, px: number): Promise<number> {
  await getOrCreateSettingsRow(userId); // ensure the row exists before updating it
  const arabicSize = clampArabicSize(px);
  const { error } = await supabase
    .from('quran_reader_settings')
    .update({ arabic_size: arabicSize })
    .eq('user_id', userId);
  if (error) throw error;
  return arabicSize;
}

export async function toggleTranslation(userId: string): Promise<boolean> {
  const row = await getOrCreateSettingsRow(userId);
  const showTranslation = !row.show_translation;
  const { error } = await supabase
    .from('quran_reader_settings')
    .update({ show_translation: showTranslation })
    .eq('user_id', userId);
  if (error) throw error;
  return showTranslation;
}

export async function toggleNight(userId: string): Promise<boolean> {
  const row = await getOrCreateSettingsRow(userId);
  const night = !row.night_mode;
  const { error } = await supabase
    .from('quran_reader_settings')
    .update({ night_mode: night })
    .eq('user_id', userId);
  if (error) throw error;
  return night;
}
