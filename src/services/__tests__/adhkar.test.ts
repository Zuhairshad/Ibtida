import { supabase } from '../../lib/supabase';
import {
  createGoal,
  listGoals,
  updateGoalProgress,
  completeGoal,
  deleteGoal,
  tapTasbeeh,
  plusFiveTasbeeh,
  undoTasbeeh,
  resetTasbeeh,
  setTasbeehCount,
  getTasbeehSession,
} from '../adhkar';

jest.mock('../../lib/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createGoal', () => {
  it('inserts goal and returns id', async () => {
    const b = chainBuilder({ data: { id: 'goal-123' }, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await createGoal('user-1', 'Durood', 100, 0, 0);
    expect(result.id).toBe('goal-123');
  });

  it('also upserts community_goal_members when communityGoalId provided', async () => {
    const b = chainBuilder({ data: { id: 'goal-456' }, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await createGoal('user-1', 'Durood', 100, 0, 0, 'community-goal-1');
    // community_goal_members insert should have been called (from called twice)
    expect(mockSupabase.from).toHaveBeenCalledWith('community_goal_members');
  });

  it('does not touch community_goal_members when no communityGoalId', async () => {
    const b = chainBuilder({ data: { id: 'goal-789' }, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await createGoal('user-1', 'Istighfar', 33, 0, 0);
    const allCalls = (mockSupabase.from as jest.Mock).mock.calls.map((c: string[][]) => c[0]);
    expect(allCalls).not.toContain('community_goal_members');
  });
});

describe('listGoals', () => {
  it('maps rows to AdhkarGoal shape', async () => {
    const rows = [
      { id: 'g1', title: 'Durood', target: 100, frequency: 0, range: 0, progress: 50, completed_at: null, community_goal_id: null },
    ];
    const b = chainBuilder({ data: rows, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const goals = await listGoals('user-1');
    expect(goals).toHaveLength(1);
    expect(goals[0].id).toBe('g1');
    expect(goals[0].progress).toBe(50);
    expect(goals[0].communityGoalId).toBeNull();
  });

  it('returns empty array when no goals', async () => {
    const b = chainBuilder({ data: [], error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const goals = await listGoals('user-1');
    expect(goals).toEqual([]);
  });
});

describe('updateGoalProgress', () => {
  it('updates adhkar_goals progress', async () => {
    const b = chainBuilder({ error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await expect(updateGoalProgress('goal-1', 75)).resolves.toBeUndefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('adhkar_goals');
  });

  it('also updates community_goal_members when userId + communityGoalId provided', async () => {
    const b = chainBuilder({ error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await updateGoalProgress('goal-1', 75, { userId: 'user-1', communityGoalId: 'cg-1' });
    const calls = (mockSupabase.from as jest.Mock).mock.calls.map((c: string[][]) => c[0]);
    expect(calls).toContain('community_goal_members');
  });
});

describe('completeGoal', () => {
  it('sets completed_at on the goal row', async () => {
    const updateMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const b = { update: updateMock, eq: eqMock, select: jest.fn().mockReturnThis() };
    (b as unknown as { then: Function }).then = (r: Function) => r({ error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await completeGoal('goal-1');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ completed_at: expect.any(String) }));
  });
});

describe('deleteGoal', () => {
  it('calls delete on adhkar_goals', async () => {
    const deleteMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const b = { delete: deleteMock, eq: eqMock };
    (b as unknown as { then: Function }).then = (r: Function) => r({ error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await deleteGoal('goal-1');
    expect(deleteMock).toHaveBeenCalled();
  });
});

describe('tapTasbeeh', () => {
  it('increments count by 1 and reports completed when count reaches target', async () => {
    // getOrCreate returns count=99, target=100
    const sessionRow = { count: 99, target: 100, reps: 0 };
    let callNum = 0;
    const b = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() => {
        callNum++;
        return Promise.resolve({ data: callNum === 1 ? sessionRow : null, error: null });
      }),
      single: jest.fn().mockResolvedValue({ data: sessionRow, error: null }),
    };
    (b as unknown as { then: Function }).then = (r: Function) => r({ data: null, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await tapTasbeeh('user-1');
    expect(result.count).toBe(100);
    expect(result.completed).toBe(true);
  });

  it('does not report completed when count < target', async () => {
    const sessionRow = { count: 50, target: 100, reps: 0 };
    const b = {
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: sessionRow, error: null }),
      single: jest.fn().mockResolvedValue({ data: sessionRow, error: null }),
    };
    (b as unknown as { then: Function }).then = (r: Function) => r({ data: null, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await tapTasbeeh('user-1');
    expect(result.count).toBe(51);
    expect(result.completed).toBe(false);
  });
});

describe('plusFiveTasbeeh', () => {
  it('clamps at target', async () => {
    const sessionRow = { count: 98, target: 100, reps: 0 };
    const b = {
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: sessionRow, error: null }),
    };
    (b as unknown as { then: Function }).then = (r: Function) => r({ data: null, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await plusFiveTasbeeh('user-1');
    expect(result.count).toBe(100); // clamped at target
  });
});

describe('undoTasbeeh', () => {
  it('decrements count by 1, minimum 0', async () => {
    const sessionRow = { count: 1, target: 100, reps: 0 };
    const b = {
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: sessionRow, error: null }),
    };
    (b as unknown as { then: Function }).then = (r: Function) => r({ data: null, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await undoTasbeeh('user-1');
    expect(result.count).toBe(0);
  });

  it('does not go below 0', async () => {
    const sessionRow = { count: 0, target: 100, reps: 0 };
    const b = {
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: sessionRow, error: null }),
    };
    (b as unknown as { then: Function }).then = (r: Function) => r({ data: null, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await undoTasbeeh('user-1');
    expect(result.count).toBe(0);
  });
});

describe('resetTasbeeh', () => {
  it('resets count to 0', async () => {
    const b = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (b as unknown as { then: Function }).then = (r: Function) => r({ error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await resetTasbeeh('user-1');
    expect(result.count).toBe(0);
  });
});
