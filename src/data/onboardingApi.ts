import { apiFetch } from '@data/apiClient';
import { supabase } from '@data/supabase';

// ─── Response Shapes ─────────────────────────────────────────────────────────

export interface OnboardingStatusResponse {
  completed: boolean;
  currentQuestion: number;
}

export interface OnboardingMessageResponse {
  reply: string;
  questionIndex: number;
  isComplete: boolean;
}

export interface OnboardingHistoryItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ─── API Functions ────────────────────────────────────────────────────────────

/** GET /onboarding/status — check whether this user has completed onboarding. */
export async function getOnboardingStatus(): Promise<ApiResult<OnboardingStatusResponse>> {
  return apiFetch<OnboardingStatusResponse>('/onboarding/status');
}

/**
 * POST /onboarding/message — send the user's message to the AI.
 * An empty string triggers the initial greeting from the AI.
 */
export async function sendOnboardingMessage(
  message: string,
): Promise<ApiResult<OnboardingMessageResponse>> {
  return apiFetch<OnboardingMessageResponse>('/onboarding/message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/**
 * Fetch conversation history from `public.messages` for a given user.
 * Used to resume mid-onboarding sessions.
 * Input: validated userId (never derived from untrusted sources).
 */
export async function fetchOnboardingHistory(
  userId: string,
): Promise<ApiResult<OnboardingHistoryItem[]>> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('user_id', userId)
      .eq('conversation_type', 'onboarding')
      .order('created_at', { ascending: true });

    if (error) return { ok: false, error: 'Failed to load conversation history.' };
    if (!data) return { ok: true, data: [] };

    // Validate and sanitize role field — only trust known values from the DB schema
    const validated: OnboardingHistoryItem[] = data
      .filter(
        (item): item is { id: string; role: string; content: string; created_at: string } =>
          typeof item.id === 'string' &&
          typeof item.role === 'string' &&
          typeof item.content === 'string' &&
          typeof item.created_at === 'string',
      )
      .map((item) => ({
        id: item.id,
        role: item.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: item.content,
        created_at: item.created_at,
      }));

    return { ok: true, data: validated };
  } catch {
    return { ok: false, error: 'Failed to load conversation history.' };
  }
}
