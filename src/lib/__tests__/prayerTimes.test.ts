import {
  computePrayerTimes,
  classifyPrayerTimes,
  classifyPrayersForDate,
  getNextPrayer,
  getNextSalah,
  getPrayerCountdownWindow,
  qiblaBearing,
  formatBearing,
  formatCoordinates,
  formatPrayerTime,
  parseISODateLocal,
  secondsUntil,
} from '../prayerTimes';

// Karachi, Pakistan — a real city with known prayer times for validation.
const KARACHI = { lat: 24.8607, lon: 67.0011 };
const MECCA = { lat: 21.4225, lon: 39.8262 };
const LONDON = { lat: 51.5074, lon: -0.1278 };
const METHOD = 'Karachi' as const;
const MADHAB = 'Hanafi' as const;

// A stable reference date: 2024-03-15 (a known non-DST, non-special Friday).
const REF_DATE = new Date(2024, 2, 15); // local midnight March 15 2024

describe('computePrayerTimes', () => {
  it('returns 6 Date objects for Karachi', () => {
    const times = computePrayerTimes(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, REF_DATE);
    expect(times).toHaveProperty('fajr');
    expect(times).toHaveProperty('sunrise');
    expect(times).toHaveProperty('dhuhr');
    expect(times).toHaveProperty('asr');
    expect(times).toHaveProperty('maghrib');
    expect(times).toHaveProperty('isha');
    for (const key of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      expect(times[key as keyof typeof times]).toBeInstanceOf(Date);
    }
  });

  it('returns times in chronological order (fajr < sunrise < dhuhr < asr < maghrib < isha)', () => {
    const t = computePrayerTimes(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, REF_DATE);
    expect(t.fajr.getTime()).toBeLessThan(t.sunrise.getTime());
    expect(t.sunrise.getTime()).toBeLessThan(t.dhuhr.getTime());
    expect(t.dhuhr.getTime()).toBeLessThan(t.asr.getTime());
    expect(t.asr.getTime()).toBeLessThan(t.maghrib.getTime());
    expect(t.maghrib.getTime()).toBeLessThan(t.isha.getTime());
  });

  it('returns different times for Karachi vs London on the same date', () => {
    const karachi = computePrayerTimes(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, REF_DATE);
    const london = computePrayerTimes(LONDON.lat, LONDON.lon, METHOD, MADHAB, REF_DATE);
    expect(karachi.fajr.getTime()).not.toBe(london.fajr.getTime());
  });

  it('Hanafi Asr is later than Shafi Asr (juristic difference)', () => {
    const hanafi = computePrayerTimes(KARACHI.lat, KARACHI.lon, 'MuslimWorldLeague', 'Hanafi', REF_DATE);
    const shafi = computePrayerTimes(KARACHI.lat, KARACHI.lon, 'MuslimWorldLeague', 'Shafi', REF_DATE);
    expect(hanafi.asr.getTime()).toBeGreaterThan(shafi.asr.getTime());
  });
});

describe('classifyPrayerTimes', () => {
  const t = computePrayerTimes(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, REF_DATE);

  it('classifies all prayers as upcoming when now is before Fajr', () => {
    // 1 minute before Fajr
    const beforeFajr = new Date(t.fajr.getTime() - 60_000);
    const c = classifyPrayerTimes(t, beforeFajr);
    expect(c.Fajr).toBe('upcoming');
    expect(c.Sunrise).toBe('upcoming');
    expect(c.Dhuhr).toBe('upcoming');
    expect(c.Asr).toBe('upcoming');
    expect(c.Maghrib).toBe('upcoming');
    expect(c.Isha).toBe('upcoming');
  });

  it('classifies Fajr as current when now is exactly at Fajr', () => {
    const atFajr = new Date(t.fajr.getTime());
    const c = classifyPrayerTimes(t, atFajr);
    expect(c.Fajr).toBe('current');
    expect(c.Sunrise).toBe('upcoming');
    expect(c.Dhuhr).toBe('upcoming');
  });

  it('classifies Fajr as done and Sunrise as current after Sunrise starts', () => {
    const afterSunrise = new Date(t.sunrise.getTime() + 1000);
    const c = classifyPrayerTimes(t, afterSunrise);
    expect(c.Fajr).toBe('done');
    expect(c.Sunrise).toBe('current');
    expect(c.Dhuhr).toBe('upcoming');
  });

  it('classifies Isha as current without nextDayFajr (never moves to done)', () => {
    const afterIsha = new Date(t.isha.getTime() + 3_600_000); // 1 hr after Isha
    const c = classifyPrayerTimes(t, afterIsha);
    expect(c.Isha).toBe('current');
  });

  it('classifies Isha as done when nextDayFajr is provided and now is past it', () => {
    const nextDay = new Date(REF_DATE);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayTimes = computePrayerTimes(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, nextDay);
    const afterNextFajr = new Date(nextDayTimes.fajr.getTime() + 60_000);
    const c = classifyPrayerTimes(t, afterNextFajr, nextDayTimes.fajr);
    expect(c.Isha).toBe('done');
  });

  it('classifies exactly at prayer boundary (1ms before next) as current', () => {
    const justBeforeDhuhr = new Date(t.dhuhr.getTime() - 1);
    const c = classifyPrayerTimes(t, justBeforeDhuhr);
    expect(c.Sunrise).toBe('current');
    expect(c.Dhuhr).toBe('upcoming');
  });
});

describe('classifyPrayersForDate', () => {
  it('returns an object with all 6 prayer slot names', () => {
    const c = classifyPrayersForDate(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, REF_DATE, REF_DATE);
    expect(Object.keys(c)).toEqual(expect.arrayContaining(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']));
  });
});

describe('getNextPrayer', () => {
  it('returns a future prayer when called before Fajr', () => {
    const t = computePrayerTimes(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, REF_DATE);
    const beforeFajr = new Date(t.fajr.getTime() - 60_000);
    const next = getNextPrayer(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, beforeFajr);
    expect(next.name).toBe('Fajr');
    expect(next.at.getTime()).toBeGreaterThan(beforeFajr.getTime());
  });

  it('returns tomorrow Fajr when now is after Isha', () => {
    const t = computePrayerTimes(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, REF_DATE);
    const afterIsha = new Date(t.isha.getTime() + 7_200_000); // 2 hrs after Isha
    const next = getNextPrayer(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, afterIsha);
    expect(next.name).toBe('Fajr');
    expect(next.at.getTime()).toBeGreaterThan(afterIsha.getTime());
  });
});

describe('getNextSalah', () => {
  it('skips Sunrise — never returns Sunrise as the next Salah', () => {
    const t = computePrayerTimes(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, REF_DATE);
    // Just after Fajr (next raw prayer would be Sunrise)
    const afterFajr = new Date(t.fajr.getTime() + 60_000);
    const next = getNextSalah(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, afterFajr);
    expect(next.name).not.toBe('Sunrise');
    expect(next.name).toBe('Dhuhr');
  });
});

describe('getPrayerCountdownWindow', () => {
  it('returns positive secondsRemaining and totalSeconds when next prayer is in the future', () => {
    const t = computePrayerTimes(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, REF_DATE);
    const beforeFajr = new Date(t.fajr.getTime() - 3600_000); // 1 hr before Fajr
    const w = getPrayerCountdownWindow(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, beforeFajr);
    expect(w.secondsRemaining).toBeGreaterThan(0);
    expect(w.totalSeconds).toBeGreaterThan(0);
    expect(w.name).toBe('Fajr');
  });

  it('secondsRemaining decreases as `now` approaches the prayer', () => {
    const t = computePrayerTimes(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, REF_DATE);
    const t1 = new Date(t.dhuhr.getTime() - 3600_000);
    const t2 = new Date(t.dhuhr.getTime() - 1800_000);
    const w1 = getPrayerCountdownWindow(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, t1);
    const w2 = getPrayerCountdownWindow(KARACHI.lat, KARACHI.lon, METHOD, MADHAB, t2);
    expect(w2.secondsRemaining).toBeLessThan(w1.secondsRemaining);
  });
});

describe('qiblaBearing', () => {
  it('Qibla from Mecca itself is a finite number', () => {
    const b = qiblaBearing(MECCA.lat, MECCA.lon);
    expect(typeof b).toBe('number');
    expect(isFinite(b)).toBe(true);
  });

  it('Qibla from Karachi is eastward (roughly 250–290°)', () => {
    // Karachi is to the east of Mecca, so Qibla should be roughly west (~270°)
    // Known: ~262° for Karachi to Mecca
    const b = qiblaBearing(KARACHI.lat, KARACHI.lon);
    expect(b).toBeGreaterThan(240);
    expect(b).toBeLessThan(300);
  });

  it('Qibla from London is roughly SE (100–130°)', () => {
    const b = qiblaBearing(LONDON.lat, LONDON.lon);
    expect(b).toBeGreaterThan(100);
    expect(b).toBeLessThan(140);
  });
});

describe('formatBearing', () => {
  it('formats 0° as "0° N"', () => {
    expect(formatBearing(0)).toBe('0° N');
  });

  it('formats 45° as "45° NE"', () => {
    expect(formatBearing(45)).toBe('45° NE');
  });

  it('formats 180° as "180° S"', () => {
    expect(formatBearing(180)).toBe('180° S');
  });

  it('normalizes bearings > 360', () => {
    expect(formatBearing(360)).toBe('0° N');
    expect(formatBearing(405)).toBe('45° NE');
  });

  it('normalizes negative bearings', () => {
    expect(formatBearing(-45)).toBe('315° NW');
  });
});

describe('formatCoordinates', () => {
  it('formats Karachi correctly', () => {
    expect(formatCoordinates(KARACHI.lat, KARACHI.lon)).toBe('24.86°N, 67.00°E');
  });

  it('uses S/W for negative lat/lon', () => {
    expect(formatCoordinates(-33.87, -70.65)).toBe('33.87°S, 70.65°W');
  });
});

describe('formatPrayerTime', () => {
  it('formats a Date as 12-hour time in a given timezone', () => {
    // Noon UTC on Jan 1 2024
    const d = new Date('2024-01-01T12:00:00Z');
    const formatted = formatPrayerTime(d, 'UTC');
    expect(formatted).toMatch(/12:00 PM/);
  });
});

describe('parseISODateLocal', () => {
  it('parses YYYY-MM-DD as local midnight (not UTC midnight)', () => {
    const d = parseISODateLocal('2024-03-15');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2); // March = 2
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });
});

describe('secondsUntil', () => {
  it('returns 0 when at is in the past', () => {
    const past = new Date(Date.now() - 10_000);
    expect(secondsUntil(past)).toBe(0);
  });

  it('returns correct positive value for future date', () => {
    const now = new Date(2024, 0, 1, 12, 0, 0);
    const future = new Date(2024, 0, 1, 12, 1, 0); // 1 min later
    expect(secondsUntil(future, now)).toBe(60);
  });
});
