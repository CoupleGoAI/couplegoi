// Tests for security-critical data layer functions.
// These verify that the client correctly routes through edge functions
// (get-messages, data-export) instead of direct PostgREST queries,
// ensuring encrypted-at-rest messages are never exposed as ciphertext.

import { fetchChatHistory } from '../aiChatApi';
import { fetchCoupleChatHistory } from '../coupleChatApi';
import { exportData } from '../profileApi';
import { invokeEdgeFunction } from '../apiClient';

jest.mock('@/config/runtimeConfig', () => ({
  runtimeConfig: {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
    supabasePublishableDefaultKey: 'publishable-key',
  },
}));

jest.mock('@data/apiClient', () => ({
  invokeEdgeFunction: jest.fn(),
}));

jest.mock('@data/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token', user: { id: 'user-1' } } },
        error: null,
      }),
    },
    functions: { invoke: jest.fn() },
    removeChannel: jest.fn(),
  },
}));

const mockInvoke = invokeEdgeFunction as jest.MockedFunction<typeof invokeEdgeFunction>;

describe('fetchChatHistory (solo)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls get-messages edge function with conversation_type chat', async () => {
    mockInvoke.mockResolvedValueOnce({
      ok: true,
      data: {
        messages: [
          { id: '1', role: 'user', content: 'hello', created_at: '2025-01-01T00:00:00Z' },
          { id: '2', role: 'assistant', content: 'hi there', created_at: '2025-01-01T00:01:00Z' },
        ],
      },
    });

    const result = await fetchChatHistory();
    expect(mockInvoke).toHaveBeenCalledWith('get-messages', {
      conversation_type: 'chat',
      limit: 20,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].text).toBe('hello');
      expect(result.data[1].text).toBe('hi there');
    }
  });

  it('returns error when edge function fails', async () => {
    mockInvoke.mockResolvedValueOnce({ ok: false, error: 'Unauthorized' });
    const result = await fetchChatHistory();
    expect(result.ok).toBe(false);
  });
});

describe('fetchCoupleChatHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls get-messages with couple_chat type and partner_id', async () => {
    mockInvoke.mockResolvedValueOnce({
      ok: true,
      data: {
        messages: [
          { id: '1', role: 'user', content: 'hey', created_at: '2025-01-01T00:00:00Z', user_id: 'user-1' },
        ],
      },
    });

    const partner = { id: 'partner-1', name: 'Alex', avatarUrl: null };
    const result = await fetchCoupleChatHistory('user-1', partner);
    expect(mockInvoke).toHaveBeenCalledWith('get-messages', {
      conversation_type: 'couple_chat',
      partner_id: 'partner-1',
      limit: 20,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].role).toBe('user');
    }
  });

  it('marks partner messages with role=partner', async () => {
    mockInvoke.mockResolvedValueOnce({
      ok: true,
      data: {
        messages: [
          { id: '1', role: 'user', content: 'msg from partner', created_at: '2025-01-01T00:00:00Z', user_id: 'partner-1' },
        ],
      },
    });

    const partner = { id: 'partner-1', name: 'Alex', avatarUrl: null };
    const result = await fetchCoupleChatHistory('user-1', partner);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].role).toBe('partner');
      expect(result.data[0].senderName).toBe('Alex');
    }
  });
});

describe('exportData', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls data-export and returns stringified JSON', async () => {
    mockInvoke.mockResolvedValueOnce({
      ok: true,
      data: { exported_at: '2025-01-01', profile: { name: 'Test' } },
    });

    const result = await exportData();
    expect(mockInvoke).toHaveBeenCalledWith('data-export');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = JSON.parse(result.data) as Record<string, unknown>;
      expect(parsed).toHaveProperty('exported_at');
    }
  });

  it('propagates error from invokeEdgeFunction', async () => {
    mockInvoke.mockResolvedValueOnce({ ok: false, error: 'Unauthorized' });
    const result = await exportData();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Unauthorized');
    }
  });
});
