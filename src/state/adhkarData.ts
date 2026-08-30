// Static content ported from Ibadah v5.dc.html's `categories` array.
// Per §35 (content governance): never invent Quran/hadith text — these are
// counts/labels only, the actual dhikr body lives in AdhkarSessionScreen and
// is the one short, well-attested phrase the prototype ships with.
export const CATEGORIES = [
  { name: 'Morning', ar: 'أذكار الصباح', n: 18, mins: 7, pct: 100 },
  { name: 'Evening', ar: 'أذكار المساء', n: 20, mins: 8, pct: 30 },
  { name: 'After Salah', ar: 'بعد الصلاة', n: 9, mins: 3, pct: 66 },
  { name: 'Protection', ar: 'الحفظ', n: 7, mins: 3, pct: 0 },
  { name: 'Forgiveness', ar: 'الاستغفار', n: 6, mins: 2, pct: 0 },
  { name: 'Gratitude', ar: 'الشكر', n: 5, mins: 2, pct: 40 },
  { name: 'Before Sleep', ar: 'قبل النوم', n: 8, mins: 4, pct: 0 },
  { name: 'Travel', ar: 'السفر', n: 5, mins: 2, pct: 0 },
];

export const GOALS = [
  { name: 'Durood Sharif', freq: '100 daily', remind: '8:00 PM', streak: 7, pct: 33, progress: '33 / 100', week: [1, 1, 1, 1, 0, 1, 1] },
  { name: 'Morning Adhkar', freq: 'Every day', remind: '7:00 AM', streak: 12, pct: 100, progress: 'Done', week: [1, 1, 1, 1, 1, 1, 1] },
];

export const PROGRESS_STATS = [
  { value: '129', label: 'Prayers logged' },
  { value: '18,340', label: 'Dhikr counted' },
  { value: '41', label: 'Quran pages' },
  { value: '26', label: 'Adhkar sessions' },
];

export const PROGRESS_BARS = [38, 52, 44, 61, 70, 48, 33, 58, 77, 66, 82, 59, 74, 91];

export const PROGRESS_HEAT = Array.from({ length: 84 }, (_, i) => {
  const r = (i * 37) % 11;
  const full = r > 3;
  const part = !full && (r === 2 || r === 3);
  return { full, part };
});
