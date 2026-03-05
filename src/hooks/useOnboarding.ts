import { useCallback, useEffect, useRef, useState } from 'react';
import { useOnboardingStore } from '@store/onboardingStore';
import { useAuthStore } from '@store/authStore';
import {
  getOnboardingStatus,
  sendOnboardingMessage,
  fetchOnboardingHistory,
} from '@data/onboardingApi';
import * as authData from '@data/auth';
import { sanitizeMessage } from '@domain/onboarding/validation';
import type { OnboardingMessage } from '@store/onboardingStore';

// ─── Constants ────────────────────────────────────────────────────────────────

export const TOTAL_ONBOARDING_QUESTIONS = 4;

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
  retryComplete: () => Promise<void>;
}

// ─── ID Helper ────────────────────────────────────────────────────────────────

function generateMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Orchestrates the AI onboarding conversation.
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
 *   - On completion, refreshes the auth profile so navigation updates reactively.
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
  const setMessages = useOnboardingStore((s) => s.setMessages);
  const setIsComplete = useOnboardingStore((s) => s.setIsComplete);
  const setCurrentQuestion = useOnboardingStore((s) => s.setCurrentQuestion);
  const setLoading = useOnboardingStore((s) => s.setLoading);
  const setError = useOnboardingStore((s) => s.setError);

  const setUser = useAuthStore((s) => s.setUser);
  const userId = useAuthStore((s) => s.user?.id);

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

      // Refresh auth profile so RootNavigator transitions reactively
      if (complete && userId) {
        const profileResult = await authData.fetchProfile(userId);
        if (profileResult.ok) {
          setUser(profileResult.data);
        }
      }
    },
    // Zustand actions are stable references; userId is stable post-auth
    [addMessage, setLoading, setError, setCurrentQuestion, setIsComplete, setUser, userId],
  );

  /**
   * Retry fetching the auth profile after completion — used when the initial
   * profile refresh failed but onboarding is complete in the store.
   */
  const retryComplete = useCallback(async (): Promise<void> => {
    if (!userId) {
      setError('Session error. Please sign out and back in.');
      return;
    }
    setLoading(true);
    setError(null);
    const profileResult = await authData.fetchProfile(userId);
    if (profileResult.ok) {
      setUser(profileResult.data);
    } else {
      setError('Could not connect. Please try again.');
    }
    setLoading(false);
  }, [userId, setUser, setLoading, setError]);

  // Initialize once on mount: check status, optionally restore history
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

        const { completed, currentQuestion: serverQuestion } = statusResult.data;
        setCurrentQuestion(serverQuestion);

        if (completed) {
          setIsComplete(true);
          return;
        }

        // Resume mid-onboarding: restore conversation history
        if (serverQuestion > 0 && userId) {
          const historyResult = await fetchOnboardingHistory(userId);
          if (historyResult.ok && historyResult.data.length > 0) {
            setMessages(
              historyResult.data.map((item) => ({
                id: item.id,
                role: item.role,
                content: item.content,
                createdAt: new Date(item.created_at).getTime(),
              })),
            );
          }
        }
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
    retryComplete,
  };
}
