// =============================================================================
// onboardingApi.ts — uses plain fetch to avoid supabase-js stripping the
// Authorization header in supabase-js-react-native (known bug).
// =============================================================================

import { supabase } from '@data/supabase';
import { supabaseQuery } from '@data/apiClient';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface OnboardingResponse {
  reply: string;
  questionIndex: number;
  isComplete: boolean;
  error?: string;
  detail?: string;
}

export interface OnboardingStatus {
  completed: boolean;
  /** 0-based index of the next unanswered question */
  currentQuestion: number;
}

export interface OnboardingHistoryItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * Derive the current onboarding step from the user's profile row.
 * Returns { completed, currentQuestion } — mirrors the server-side deriveStep logic.
 */
export async function getOnboardingStatus(): Promise<
  { ok: true; data: OnboardingStatus } | { ok: false; error: string }
> {
  return supabaseQuery<OnboardingStatus>(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { data: null, error: { message: 'Not signed in' } };
    }
    const userId = userData.user.id;

    const { data, error } = await supabase
      .from('profiles')
      .select('name, birth_date, dating_start_date, help_focus, onboarding_completed')
      .eq('id', userId)
      .single();

    if (error) return { data: null, error };
    if (!data) return { data: null, error: { message: 'Profile not found' } };

    const profile = data as {
      name: string | null;
      birth_date: string | null;
      dating_start_date: string | null;
      help_focus: string | null;
      onboarding_completed: boolean;
    };

    if (profile.onboarding_completed) {
      return { data: { completed: true, currentQuestion: 4 }, error: null };
    }

    let currentQuestion = 0;
    if (profile.name) currentQuestion = 1;
    if (profile.birth_date) currentQuestion = 2;
    if (profile.dating_start_date) currentQuestion = 3;
    if (profile.help_focus) currentQuestion = 4;

    return { data: { completed: false, currentQuestion }, error: null };
  });
}

/**
 * Fetch the stored onboarding conversation history for resumability.
 */
export async function fetchOnboardingHistory(
  userId: string,
): Promise<{ ok: true; data: OnboardingHistoryItem[] } | { ok: false; error: string }> {
  return supabaseQuery<OnboardingHistoryItem[]>(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('user_id', userId)
      .eq('conversation_type', 'onboarding')
      .order('created_at', { ascending: true });

    if (error) return { data: null, error };
    return { data: (data ?? []) as OnboardingHistoryItem[], error: null };
  });
}

/**
 * Send a message to the onboarding edge function.
 * Pass an empty string to get the current question (start or resume).
 */
export async function sendOnboardingMessage(
  message: string,
): Promise<{ ok: true; data: OnboardingResponse } | { ok: false; error: string }> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.access_token) {
      return { ok: false, error: 'Not signed in' };
    }

    const token = sessionData.session.access_token;

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/onboarding-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ message }),
      },
    );

    const data = await response.json() as OnboardingResponse;

    console.log('[onboarding] response:', JSON.stringify(data));

    if (!response.ok || data.error) {
      console.error('[onboarding] error:', data.error, data.detail);
      return { ok: false, error: data.error ?? 'Request failed' };
    }

    return { ok: true, data };
  } catch (e) {
    console.error('[onboarding] unexpected error:', e);
    return { ok: false, error: 'Network error' };
  }
}