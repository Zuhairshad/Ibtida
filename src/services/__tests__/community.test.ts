import { supabase } from '../../lib/supabase';
import {
  listMyCircles,
  createCircle,
  joinCircle,
  joinCommunityGoal,
  updateMyGoalProgress,
  listCommunityGoals,
  listCircleGoals,
  createCircleGoal,
} from '../community';

jest.mock('../../lib/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

function chainBuilder(resolved: unknown) {
  const terminal = jest.fn().mockResolvedValue(resolved);
  const b: Record<string, jest.Mock> = {};
  const selfReturn = jest.fn().mockReturnValue(b);
  ['select', 'insert', 'upsert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'in', 'is', 'order'].forEach((m) => {
    b[m] = selfReturn;
  });
  b.single = terminal;
  b.maybeSingle = terminal;
  (b as unknown as { then: Function }).then = (resolve: (v: unknown) => void) => resolve(resolved);
  return b;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createCircle', () => {
  it('inserts circle and adds creator as owner member', async () => {
    const b = chainBuilder({ data: { id: 'circle-1' }, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await createCircle('user-1', 'My Circle', 'Invite only');
    expect(result.id).toBe('circle-1');
    const calls = (mockSupabase.from as jest.Mock).mock.calls.map((c: string[][]) => c[0]);
    expect(calls).toContain('community_circles');
    expect(calls).toContain('circle_members');
  });
});

describe('joinCircle', () => {
  it('upserts a member row (idempotent)', async () => {
    const upsertMock = jest.fn().mockReturnThis();
    const b = { upsert: upsertMock, eq: jest.fn().mockResolvedValue({ error: null }) };
    (b as unknown as { then: Function }).then = (r: Function) => r({ error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await joinCircle('user-1', 'circle-1');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ circle_id: 'circle-1', user_id: 'user-1', role: 'member' }),
      expect.objectContaining({ ignoreDuplicates: true })
    );
  });
});

describe('joinCommunityGoal', () => {
  it('upserts with progress=0 and ignoreDuplicates', async () => {
    const upsertMock = jest.fn().mockReturnThis();
    const b = { upsert: upsertMock, eq: jest.fn().mockResolvedValue({ error: null }) };
    (b as unknown as { then: Function }).then = (r: Function) => r({ error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await joinCommunityGoal('user-1', 'goal-1');
    expect(upsertMock).toHaveBeenCalledWith(
      { goal_id: 'goal-1', user_id: 'user-1', progress: 0 },
      { onConflict: 'goal_id,user_id', ignoreDuplicates: true }
    );
  });
});

describe('updateMyGoalProgress', () => {
  it('updates community_goal_members progress for the user+goal', async () => {
    const updateMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const finalEq = jest.fn().mockResolvedValue({ error: null });
    const b = { update: updateMock, eq: eqMock };
    eqMock.mockReturnValueOnce(b).mockReturnValue({ eq: finalEq });
    (b as unknown as { then: Function }).then = (r: Function) => r({ error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    await updateMyGoalProgress('user-1', 'goal-1', 500);
    expect(updateMock).toHaveBeenCalledWith({ progress: 500 });
  });
});

describe('listCommunityGoals', () => {
  it('returns empty array when no goals', async () => {
    const b = chainBuilder({ data: [], error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const goals = await listCommunityGoals('user-1');
    expect(goals).toEqual([]);
  });

  it('aggregates participant count and total progress from member rows', async () => {
    // First call returns goals, second returns members
    let callCount = 0;
    const goalRows = [{ id: 'g1', name: 'Durood', target: 10000, unit: 'times', ends_at: null, circle_id: null }];
    const memberRows = [
      { goal_id: 'g1', user_id: 'user-1', progress: 500 },
      { goal_id: 'g1', user_id: 'user-2', progress: 300 },
    ];
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++;
      const data = table === 'community_goals' ? goalRows : memberRows;
      return chainBuilder({ data, error: null }) as unknown as ReturnType<typeof supabase.from>;
    });
    const goals = await listCommunityGoals('user-1');
    expect(goals).toHaveLength(1);
    expect(goals[0].participantCount).toBe(2);
    expect(goals[0].totalProgress).toBe(800);
    expect(goals[0].myProgress).toBe(500);
    expect(goals[0].joined).toBe(true);
  });

  it('marks joined=false when user has no member row', async () => {
    const goalRows = [{ id: 'g1', name: 'Durood', target: 10000, unit: null, ends_at: null, circle_id: null }];
    const memberRows = [{ goal_id: 'g1', user_id: 'user-other', progress: 100 }];
    mockSupabase.from.mockImplementation((table: string) => {
      const data = table === 'community_goals' ? goalRows : memberRows;
      return chainBuilder({ data, error: null }) as unknown as ReturnType<typeof supabase.from>;
    });
    const goals = await listCommunityGoals('user-1');
    expect(goals[0].joined).toBe(false);
    expect(goals[0].myProgress).toBe(0);
    expect(goals[0].participantCount).toBe(1);
    expect(goals[0].totalProgress).toBe(100);
  });
});

describe('listCircleGoals', () => {
  it('maps goals with aggregated member progress', async () => {
    const rows = [
      {
        id: 'cg-1',
        name: 'Quran Khatam',
        target: 30,
        unit: 'paras',
        community_goal_members: [
          { progress: 10 },
          { progress: 5 },
        ],
      },
    ];
    const b = chainBuilder({ data: rows, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const goals = await listCircleGoals('circle-1');
    expect(goals).toHaveLength(1);
    expect(goals[0].totalProgress).toBe(15);
    expect(goals[0].participantCount).toBe(2);
  });
});

describe('createCircleGoal', () => {
  it('inserts goal with correct circle_id and returns id', async () => {
    const b = chainBuilder({ data: { id: 'cg-new' }, error: null });
    mockSupabase.from.mockReturnValue(b as unknown as ReturnType<typeof supabase.from>);
    const result = await createCircleGoal('circle-1', 'user-1', 'Durood', 10000, 'times');
    expect(result.id).toBe('cg-new');
  });
});
