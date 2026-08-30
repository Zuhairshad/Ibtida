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

export const AYAT = [183, 184, 185].map((n) => ({
  n,
  translationState: 'Translation loads from the selected licensed translation.',
  source: 'Translation · pending source selection',
}));
