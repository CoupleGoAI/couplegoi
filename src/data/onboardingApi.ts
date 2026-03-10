// =============================================================================
// onboardingApi.ts — uses plain fetch to avoid supabase-js stripping the
// Authorization header in supabase-js-react-native (known bug).
// =============================================================================

import { supabase } from '@data/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnboardingResponse {
  reply: string;
  questionIndex: number;
  isComplete: boolean;
  error?: string;
  detail?: string;
}

export interface OnboardingStatus {
  completed: boolean;
  currentQuestion: number;
}

export interface OnboardingHistoryRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ─── Status check (direct DB query) ──────────────────────────────────────────

/**
 * Reads the user's profile to determine onboarding progress.
 * Current question is derived from which profile fields are null.
 */
export async function getOnboardingStatus(): Promise<
  { ok: true; data: OnboardingStatus } | { ok: false; error: string }
> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('onboarding_completed, name, birth_date, dating_start_date, help_focus')
      .single();

    if (error || !profile) {
      return { ok: false, error: error?.message ?? 'No profile found' };
    }

    const p = profile as {
      onboarding_completed: boolean;
      name: string | null;
      birth_date: string | null;
      dating_start_date: string | null;
      help_focus: string | null;
    };

    let currentQuestion = 0;
    if (p.name) currentQuestion = 1;
    if (p.name && p.birth_date) currentQuestion = 2;
    if (p.name && p.birth_date && p.dating_start_date) currentQuestion = 3;
    if (p.name && p.birth_date && p.dating_start_date && p.help_focus) currentQuestion = 4;

    return {
      ok: true,
      data: {
        completed: p.onboarding_completed ?? false,
        currentQuestion,
      },
    };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

// ─── History fetch (direct DB query) ─────────────────────────────────────────

/**
 * Fetches all onboarding conversation messages for a user, ordered by time.
 */
export async function fetchOnboardingHistory(
  userId: string,
): Promise<{ ok: true; data: OnboardingHistoryRow[] } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('user_id', userId)
      .eq('conversation_type', 'onboarding')
      .order('created_at', { ascending: true });

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: (data ?? []) as OnboardingHistoryRow[],
    };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

// ─── Send message (edge function via plain fetch) ────────────────────────────

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

    if (!response.ok || data.error) {
      return { ok: false, error: data.error ?? 'Request failed' };
    }

    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}