import type { SupabaseClient } from '@supabase/supabase-js';
import type { LLMProvider } from '../../_shared/llm/types';
import {
  bumpCoupleMessageCount,
  updateCoupleMemory,
} from '../coupleMemory';

function makeProvider(
  completion: string,
): jest.Mocked<LLMProvider> {
  return {
    id: 'groq',
    stream: jest.fn(),
    complete: jest.fn().mockResolvedValue(completion),
  };
}

interface FakeSupabaseDeps {
  supabase: SupabaseClient;
  coupleMemoryUpsert: jest.Mock;
  coupleMemoryUpdate: jest.Mock;
  coupleMemoryInsert: jest.Mock;
  correctionUpdateIn: jest.Mock;
}

function makeSupabase(
  correctionRows: Array<{ id: string; instruction: string }> = [],
): FakeSupabaseDeps {
  const coupleMemoryUpsert = jest.fn().mockResolvedValue({ error: null });
  const coupleMemoryUpdateEq = jest.fn().mockResolvedValue({ error: null });
  const coupleMemoryInsert = jest.fn().mockResolvedValue({ error: null });
  const correctionUpdateIn = jest.fn().mockResolvedValue({ error: null });

  const correctionSelectChain = {
    eq: jest.fn(),
    is: jest.fn(),
    limit: jest.fn().mockResolvedValue({ data: correctionRows }),
  };
  correctionSelectChain.eq.mockImplementation(() => correctionSelectChain);
  correctionSelectChain.is.mockImplementation(() => correctionSelectChain);

  const correctionUpdateChain = {
    in: correctionUpdateIn,
  };

  const coupleMemoryChain = {
    upsert: coupleMemoryUpsert,
    update: jest.fn(() => ({ eq: coupleMemoryUpdateEq })),
    insert: coupleMemoryInsert,
  };

  const memoryCorrectionsChain = {
    select: jest.fn(() => correctionSelectChain),
    update: jest.fn(() => correctionUpdateChain),
  };

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'couple_memory') return coupleMemoryChain;
      if (table === 'memory_corrections') return memoryCorrectionsChain;
      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;

  return {
    supabase,
    coupleMemoryUpsert,
    coupleMemoryUpdate: coupleMemoryUpdateEq,
    coupleMemoryInsert,
    correctionUpdateIn,
  };
}

describe('updateCoupleMemory', () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it('redacts inputs, upserts memory, and marks corrections applied on success', async () => {
    const provider = makeProvider(
      JSON.stringify({
        summary: 'The couple is rebuilding trust through regular check-ins.',
        traits: {
          shared_values: 'Honesty',
          communication_style: 'Direct and calm',
          recurring_topics: '',
          shared_goals: 'Weekly date night',
          rituals: '',
          shared_wins: '',
        },
      }),
    );
    const { supabase, coupleMemoryUpsert, correctionUpdateIn } = makeSupabase([
      { id: 'corr-1', instruction: 'Remove alex@example.com and +45 99 88 77 66 from memory.' },
    ]);

    await updateCoupleMemory({
      supabase,
      provider,
      model: 'test-model',
      coupleId: 'couple-1',
      existingMemory: null,
      rawTurns: [
        { speaker: 'A', text: 'My email is alex@example.com.' },
        { speaker: 'B', text: 'Please call me at +45 99 88 77 66.' },
      ],
      nameA: 'Alex',
      nameB: 'Jamie',
    });

    expect(provider.complete).toHaveBeenCalledTimes(1);
    const prompt = provider.complete.mock.calls[0][0][1]?.content ?? '';
    expect(prompt).toContain('[redacted]');
    expect(prompt).not.toContain('alex@example.com');
    expect(prompt).not.toContain('+45 99 88 77 66');

    expect(coupleMemoryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        couple_id: 'couple-1',
        summary: 'The couple is rebuilding trust through regular check-ins.',
        message_count: 0,
        traits: expect.objectContaining({
          shared_values: 'Honesty',
          communication_style: 'Direct and calm',
          shared_goals: 'Weekly date night',
        }),
      }),
      { onConflict: 'couple_id' },
    );
    expect(correctionUpdateIn).toHaveBeenCalledWith('id', ['corr-1']);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('fails closed on invalid model output and logs instead of writing unsafe data', async () => {
    const provider = makeProvider(
      JSON.stringify({
        summary: 'Unsafe drift',
        traits: {
          unexpected_key: 'should fail validation',
        },
      }),
    );
    const { supabase, coupleMemoryUpsert, correctionUpdateIn } = makeSupabase([
      { id: 'corr-1', instruction: 'Keep this pending until a valid write happens.' },
    ]);

    await updateCoupleMemory({
      supabase,
      provider,
      model: 'test-model',
      coupleId: 'couple-2',
      existingMemory: null,
      rawTurns: [{ speaker: 'A', text: 'Short safe turn.' }],
      nameA: 'A',
      nameB: 'B',
    });

    expect(coupleMemoryUpsert).not.toHaveBeenCalled();
    expect(correctionUpdateIn).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('couple_memory_update_failed');
    expect(warnSpy.mock.calls[0][0]).toContain('invalid_shape');
  });
});

describe('bumpCoupleMessageCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the existing row when memory already exists', async () => {
    const { supabase, coupleMemoryUpdate, coupleMemoryInsert } = makeSupabase();

    await bumpCoupleMessageCount(supabase, 'couple-3', true, 7, 2);

    expect(coupleMemoryUpdate).toHaveBeenCalledWith('couple_id', 'couple-3');
    expect(coupleMemoryInsert).not.toHaveBeenCalled();
  });

  it('inserts a new row when no memory row exists yet', async () => {
    const { supabase, coupleMemoryInsert, coupleMemoryUpdate } = makeSupabase();

    await bumpCoupleMessageCount(supabase, 'couple-4', false, 0, 3);

    expect(coupleMemoryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        couple_id: 'couple-4',
        summary: '',
        traits: {},
        message_count: 3,
      }),
    );
    expect(coupleMemoryUpdate).not.toHaveBeenCalled();
  });
});
