// Kalimat API client — semantic search for Quran, Hadith, and Azkar.
// Docs: https://api.kalimat.dev/docs  (OpenAPI: /api/v2/openapi.json)
// Auth: X-Api-Key header
const BASE = 'https://api.kalimat.dev/api/v2';
const KEY = process.env.EXPO_PUBLIC_KALIMAT_API_KEY ?? '';

function headers() {
  return { 'X-Api-Key': KEY, 'Content-Type': 'application/json' };
}

export type ContentType = 'quran' | 'sunnah' | 'azkar';
export type HadithGrade = 'sahih' | 'hasan' | 'daif';
export type HadithBook = 'bukhari' | 'muslim' | 'abudaud' | 'tirmizi' | 'nasai' | 'ibnmaja';

export type SearchResultType =
  | 'quran_chapter'
  | 'quran_verse'
  | 'quran_range'
  | 'quran_page'
  | 'quran_juz'
  | 'hadith'
  | 'zikr';

export type SearchResult = {
  id: string;
  type: SearchResultType;
  text?: string;
  textHighlighted?: string;
  translatedText?: string;
  translatedTextHighlighted?: string;
  isTransliteration?: boolean;
  // Hadith-only (when getMetadata=true)
  matnAr?: string;
  matnEn?: string;
  isnadEn?: string;
  gradeEn?: string;
  gradeAr?: string;
  sourceBook?: string;
  sourceBookAr?: string;
  hadithNumber?: number;
  chapterEnglish?: string;
  sectionEnglish?: string;
  // Zikr-only
  title?: string;
  englishTitle?: string;
};

export type SearchResponse = {
  data: { results: SearchResult[] };
  meta?: { version: string };
};

export type PrayerTimesDay = {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  imsak?: string;
  midnight?: string;
};

export type PrayerTimesResponse = {
  data: {
    city?: string;
    country?: string;
    times: PrayerTimesDay | PrayerTimesDay[];
  };
};

// ---------------------------------------------------------------------------
// Semantic search — Quran, Hadith, or Azkar
// ---------------------------------------------------------------------------

export async function search(
  query: string,
  options: {
    contentType?: ContentType;
    numResults?: number;
    getText?: boolean;
    getMetadata?: boolean;
    hadithGrade?: HadithGrade;
    hadithSourceBook?: HadithBook;
  } = {}
): Promise<SearchResult[]> {
  const {
    contentType,
    numResults = 10,
    getText = true,
    getMetadata = false,
    hadithGrade,
    hadithSourceBook,
  } = options;

  const params = new URLSearchParams({
    query,
    numResults: String(numResults),
    getText: String(getText),
    getMetadata: String(getMetadata),
  });
  if (contentType) params.set('contentType', contentType);
  if (hadithGrade) params.set('hadithGrade', hadithGrade);
  if (hadithSourceBook) params.set('hadithSourceBook', hadithSourceBook);

  const res = await fetch(`${BASE}/search?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`Kalimat search failed: ${res.status}`);
  const json: SearchResponse = await res.json();
  return json.data?.results ?? [];
}

// ---------------------------------------------------------------------------
// Quick search — autocomplete, <100ms, Quran only
// ---------------------------------------------------------------------------

export async function quickSearch(
  query: string,
  options: { navigationalResultsNumber?: number; versesResultsNumber?: number } = {}
): Promise<SearchResult[]> {
  const { navigationalResultsNumber = 3, versesResultsNumber = 5 } = options;
  const params = new URLSearchParams({
    query,
    getText: 'true',
    navigationalResultsNumber: String(navigationalResultsNumber),
    versesResultsNumber: String(versesResultsNumber),
  });
  const res = await fetch(`${BASE}/quick-search?${params}`, { headers: headers() });
  if (!res.ok) throw new Error(`Kalimat quick-search failed: ${res.status}`);
  const json: SearchResponse = await res.json();
  return json.data?.results ?? [];
}

// ---------------------------------------------------------------------------
// Prayer times — returns today's prayer times for a lat/lng location
// ---------------------------------------------------------------------------

export async function fetchPrayerTimes(
  lat: number,
  lng: number,
  countryCode: string,
  date?: string
): Promise<PrayerTimesDay | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    countryCode,
  });
  if (date) params.set('date', date);

  const res = await fetch(`${BASE}/prayer-times?${params}`, { headers: headers() });
  if (!res.ok) return null;
  const json: PrayerTimesResponse = await res.json();
  const times = json.data?.times;
  if (!times) return null;
  return Array.isArray(times) ? times[0] ?? null : times;
}
