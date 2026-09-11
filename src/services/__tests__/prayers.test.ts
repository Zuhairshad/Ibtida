import { supabase } from '../../lib/supabase';
import {
  emptyPrayerRecord,
  toISODate,
  todayISODate,
  getPrayerLog,
  getPrayerLogRange,
  togglePrayer,
  getAdhanSettings,
  toggleAdhan,
  PRAYER_NAMES,
} from '../prayers';

jest.mock('../../lib/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Shared chainable builder factory for test overrides.
function chainBuilder(resolved: unknown) {
  const terminal = jest.fn().mockResolvedValue(resolved);
  const b: Record<string, jest.Mock> = {};
  const chain = jest.fn().mockReturnValue(b);
  ['select', 'insert', 'upsert', 'update', 'delete', 'eq', 'gte', 'lte', 'in', 'is', 'order'].forEach((m) => {
    b[m] = chain;
  });
  b.single = terminal;
  b.maybeSingle = terminal;
  (b as unknown as { then: Function }).then = (resolve: (v: unknown) => void) => resolve(resolved);
  return b;
}

describe('emptyPrayerRecord', () => {
  it('returns all true when fill=true', () => {
    const r = emptyPrayerRecord(true);
    expect(r).toEqual({ Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true });
  });

  it('returns all false when fill=false', () => {
    const r = emptyPrayerRecord(false);
    expect(r).toEqual({ Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false });
  });
});

describe('toISODate', () => {
  it('formats date without timezone shift', () => {
    // Local midnight March 15 2024 — must not roll back to Mar 14 in UTC+5:30
    const d = new Date(2024, 2, 15, 0, 0, 0);
    expect(toISODate(d)).toBe('2024-03-15');
  });

  it('zero-pads month and day', () => {
    expect(toISODate(new Date(2024, 0, 5))).toBe('2024-01-05');
  });
});

describe('todayISODate', () => {
  it('returns a string matching YYYY-MM-DD format', () => {
    expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('PRAYER_NAMES', () => {
  it('contains exactly 5 canonical names in the correct order', () => {
    expect(PRAYER_NAMES).toEqual(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
  });
});

describe('getPrayerLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all-false record when no rows exist', async () => {
    const b = chainBuilder({ data: [], error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const log = await getPrayerLog('user-1', '2024-03-15');
    expect(log).toEqual({ Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false });
  });

  it('maps database rows correctly', async () => {
    const rows = [
      { prayer_name: 'Fajr', done: true },
      { prayer_name: 'Dhuhr', done: false },
    ];
    const b = chainBuilder({ data: rows, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const log = await getPrayerLog('user-1', '2024-03-15');
    expect(log.Fajr).toBe(true);
    expect(log.Dhuhr).toBe(false);
    expect(log.Asr).toBe(false);
  });

  it('throws when supabase returns an error', async () => {
    const b = chainBuilder({ data: null, error: new Error('db error') });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await expect(getPrayerLog('user-1', '2024-03-15')).rejects.toThrow('db error');
  });
});

describe('getPrayerLogRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty object when no rows', async () => {
    const b = chainBuilder({ data: [], error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const range = await getPrayerLogRange('user-1', '2024-03-14', '2024-03-15');
    expect(range).toEqual({});
  });

  it('groups rows by log_date', async () => {
    const rows = [
      { log_date: '2024-03-14', prayer_name: 'Fajr', done: true },
      { log_date: '2024-03-15', prayer_name: 'Isha', done: true },
    ];
    const b = chainBuilder({ data: rows, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const range = await getPrayerLogRange('user-1', '2024-03-14', '2024-03-15');
    expect(range['2024-03-14'].Fajr).toBe(true);
    expect(range['2024-03-14'].Dhuhr).toBe(false);
    expect(range['2024-03-15'].Isha).toBe(true);
  });
});

describe('togglePrayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('flips false to true when no existing row', async () => {
    // First call (maybeSingle) → no existing row
    // Second call (upsert terminal) → success
    let callCount = 0;
    const b = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ data: null, error: null }); // no row
        return Promise.resolve({ data: null, error: null });
      }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    (b as unknown as { then: Function }).then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await togglePrayer('user-1', 'Fajr', '2024-03-15');
    expect(result).toBe(true);
  });

  it('flips true to false when existing row has done=true', async () => {
    let callCount = 0;
    const b = {
      select: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ data: { done: true }, error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    (b as unknown as { then: Function }).then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await togglePrayer('user-1', 'Fajr', '2024-03-15');
    expect(result).toBe(false);
  });
});

describe('getAdhanSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults all prayers to true when no rows exist', async () => {
    const b = chainBuilder({ data: [], error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const settings = await getAdhanSettings('user-1');
    expect(settings).toEqual({ Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true });
  });

  it('overrides defaults from database rows', async () => {
    const b = chainBuilder({ data: [{ prayer_name: 'Fajr', enabled: false }], error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const settings = await getAdhanSettings('user-1');
    expect(settings.Fajr).toBe(false);
    expect(settings.Dhuhr).toBe(true); // default
  });
});
