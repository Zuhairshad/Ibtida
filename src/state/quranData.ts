// Content governance §35/§18/§20: no Quran text is generated here — the
// Arabic body and translation are shown as "pending source" states until a
// licensed Mushaf + translation source is wired in, exactly as the source
// design specifies.
export const SURAHS = [
  { n: 1, name: 'Al-Fatihah', meta: '7 ayat · Makkah', ar: 'الفاتحة' },
  { n: 2, name: 'Al-Baqarah', meta: '286 ayat · Madinah', ar: 'البقرة' },
  { n: 3, name: 'Ali ‘Imran', meta: '200 ayat · Madinah', ar: 'آل عمران' },
  { n: 4, name: 'An-Nisa', meta: '176 ayat · Madinah', ar: 'النساء' },
  { n: 18, name: 'Al-Kahf', meta: '110 ayat · Makkah', ar: 'الكهف' },
  { n: 36, name: 'Ya-Sin', meta: '83 ayat · Makkah', ar: 'يس' },
];

export const JUZ = Array.from({ length: 8 }, (_, i) => ({
  n: i + 1,
  name: `Juz ${i + 1}`,
  meta: i === 0 ? 'Al-Fatihah 1 — Al-Baqarah 141' : `Starts in ${['Al-Baqarah', 'Ali ‘Imran', 'An-Nisa', 'Al-Ma’idah', 'Al-An‘am', 'Al-A‘raf', 'Al-Anfal'][i - 1]}`,
  pct: [100, 100, 64, 0, 0, 0, 0, 0][i],
}));

export const HISTORY = [
  { name: 'Al-Baqarah', meta: 'Ayah 183 · 12 minutes', when: 'Today' },
  { name: 'Al-Kahf', meta: 'Ayah 1–10 · 8 minutes', when: 'Friday' },
  { name: 'Ya-Sin', meta: 'Complete · 21 minutes', when: 'Tuesday' },
];

export const AYAT = [183, 184, 185].map((n) => ({
  n,
  translationState: 'Translation loads from the selected licensed translation.',
  source: 'Translation · pending source selection',
}));
