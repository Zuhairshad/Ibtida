// Manual mock for src/lib/supabase.ts — replaces the real Supabase client
// in all unit/integration tests so no network calls are made.
// Each test file can override individual methods via jest.spyOn or by
// reassigning mockResolvedValueOnce on the builder chain below.

type Builder = {
  select: jest.Mock;
  insert: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  in: jest.Mock;
  is: jest.Mock;
  order: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
};

// Creates a chainable builder that returns `{ data: null, error: null }` by
// default at each terminal step. Tests override with .mockResolvedValueOnce.
function makeBuilder(defaults: Record<string, unknown> = {}): Builder {
  const terminal = jest.fn().mockResolvedValue({ data: defaults.data ?? null, error: null });
  const b: Builder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: terminal,
    maybeSingle: terminal,
  };
  // Allow awaiting the builder itself (terminal position without .single)
  (b as unknown as Promise<unknown>).then = (resolve: (v: unknown) => void) =>
    resolve({ data: defaults.data ?? [], error: null });
  return b;
}

export const mockBuilder = makeBuilder();

// Re-export so tests can inspect calls or change return values.
export const supabase = {
  from: jest.fn().mockReturnValue(mockBuilder),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  },
};
