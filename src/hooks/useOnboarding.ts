import { useCallback, useEffect, useRef, useState } from 'react';
import { useOnboardingStore } from '@store/onboardingStore';
import { useAuthStore } from '@store/authStore';
import { usePairingStore } from '@store/pairingStore';
import {
  getOnboardingStatus,
  sendOnboardingMessage,
} from '@data/onboardingApi';
import * as authData from '@data/auth';
import { sanitizeMessage } from '@domain/onboarding/validation';
import type { OnboardingMessage } from '@store/onboardingStore';

// ─── Constants ────────────────────────────────────────────────────────────────

export const TOTAL_ONBOARDING_QUESTIONS = 2;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseOnboardingReturn {
  messages: OnboardingMessage[];
  isComplete: boolean;
  currentQuestion: number;
  totalQuestions: number;
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  isInitializing: boolean;
  startPairing: () => Promise<void>;
}

// ─── ID Helper ────────────────────────────────────────────────────────────────

function generateMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Orchestrates the onboarding conversation.
 *
 * On mount:
 *   1. Fetches onboarding status from the API.
 *   2. If mid-onboarding, restores history from Supabase.
 *   3. Sets isInitializing=false so the screen can trigger the first message.
 *
 * sendMessage:
 *   - Adds a user bubble (non-empty text only).
 *   - Calls the backend AI endpoint.
 *   - Adds the AI reply bubble.
 *   - On completion, leaves the user on the completion screen.
 *   - The completion CTA promotes onboarding state into auth + pairing stores.
 */
export function useOnboarding(): UseOnboardingReturn {
  const [isInitializing, setIsInitializing] = useState(true);

  // Store selectors — always use individual selectors (never spread whole store)
  const messages = useOnboardingStore((s) => s.messages);
  const isComplete = useOnboardingStore((s) => s.isComplete);
  const currentQuestion = useOnboardingStore((s) => s.currentQuestion);
  const isLoading = useOnboardingStore((s) => s.isLoading);
  const error = useOnboardingStore((s) => s.error);
  const addMessage = useOnboardingStore((s) => s.addMessage);
  const setIsComplete = useOnboardingStore((s) => s.setIsComplete);
  const setCurrentQuestion = useOnboardingStore((s) => s.setCurrentQuestion);
  const setLoading = useOnboardingStore((s) => s.setLoading);
  const setError = useOnboardingStore((s) => s.setError);

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setPairingSkipped = useAuthStore((s) => s.setPairingSkipped);
  const setPairingEntryScreen = usePairingStore((s) => s.setEntryScreen);

  // Prevent double-initialization (React Strict Mode / fast refresh)
  const hasInitialized = useRef(false);

  /** Send a message to the AI. Empty string triggers the first greeting. */
  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      setLoading(true);
      setError(null);

      // Sanitize via domain layer — trim + enforce 500-char limit
      const sanitized = sanitizeMessage(text);

      // Only render a user bubble for non-empty input
      if (sanitized.length > 0) {
        const userMsg: OnboardingMessage = {
          id: generateMessageId('user'),
          role: 'user',
          content: sanitized,
          createdAt: Date.now(),
        };
        addMessage(userMsg);
      }

      const result = await sendOnboardingMessage(sanitized);

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const { reply, questionIndex, isComplete: complete } = result.data;

      // Runtime shape guard — backend response may diverge from TypeScript types
      if (typeof reply !== 'string' || typeof questionIndex !== 'number' || typeof complete !== 'boolean') {
        setError('Unexpected response from server. Please try again.');
        setLoading(false);
        return;
      }

      const aiMsg: OnboardingMessage = {
        id: generateMessageId('ai'),
        role: 'assistant',
        content: reply,
        createdAt: Date.now(),
      };
      addMessage(aiMsg);
      setCurrentQuestion(questionIndex);
      setIsComplete(complete);
      setLoading(false);
    },
    // Zustand actions are stable references; userId is stable post-auth
    [addMessage, setLoading, setError, setCurrentQuestion, setIsComplete],
  );

  /**
   * Promote onboarding completion into auth state and enter the pairing flow.
   * The edge function has already persisted onboarding_completed=true, so a
   * local auth-store update is a reliable fallback if profile hydration fails.
   */
  const startPairing = useCallback(async (): Promise<void> => {
    if (!user) {
      setError('Session error. Please sign out and back in.');
      return;
    }

    setLoading(true);
    setError(null);

    setPairingSkipped(false);
    setPairingEntryScreen('ScanQR');

    const profileResult = await authData.fetchProfile(user.id);
    if (profileResult.ok) {
      setUser({ ...profileResult.data, onboardingCompleted: true });
    } else {
      setUser({ ...user, onboardingCompleted: true });
    }

    setLoading(false);
  }, [user, setError, setLoading, setPairingEntryScreen, setPairingSkipped, setUser]);

  const reset = useOnboardingStore((s) => s.reset);

  // Initialize once on mount: check status, start fresh if not completed
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    void (async () => {
      try {
        const statusResult = await getOnboardingStatus();

        if (!statusResult.ok) {
          // Proceed without status — screen will show first message trigger
          return;
        }

        const { completed } = statusResult.data;

        if (completed) {
          setCurrentQuestion(2);
          setIsComplete(true);
          return;
        }

        // Always start fresh — reset store to clear any stale state
        reset();
      } finally {
        setIsInitializing(false);
      }
    })();
    // Intentionally empty deps array: runs once on mount.
    // userId and Zustand actions are stable references once authenticated.
    // hasInitialized.current ref prevents double-runs in React Strict Mode.
  }, []);

  return {
    messages,
    isComplete,
    currentQuestion,
    totalQuestions: TOTAL_ONBOARDING_QUESTIONS,
    isLoading,
    error,
    sendMessage,
    isInitializing,
    startPairing,
  };
}
