import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useGamesStore } from '@store/gamesStore';
import { useAuthStore } from '@store/authStore';
import { log } from '@utils/logger';
import {
  submitGameAnswer,
  fetchSessionSnapshot,
  leaveGameSession,
} from '@data/gamesApi';
import { subscribeToSession, unsubscribeChannel } from '@data/gameRealtime';
import type {
  GameSessionSnapshot,
  GameAnswerPayload,
  GameRound,
} from '@/types/games';

interface UseGameSessionReturn {
  readonly snapshot: GameSessionSnapshot | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly currentRound: GameRound | null;
  readonly myAnswerForCurrentRound: boolean;
  readonly partnerAnswerForCurrentRound: boolean;
  readonly submitAnswer: (roundId: string, payload: GameAnswerPayload) => Promise<void>;
  readonly leaveSession: () => Promise<void>;
  readonly refreshSnapshot: () => Promise<void>;
}

export function useGameSession(sessionId: string | null): UseGameSessionReturn {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const snapshot = useGamesStore((s) => s.latestSnapshot);
  const isLoading = useGamesStore((s) => s.isLoading);
  const error = useGamesStore((s) => s.error);
  const store = useGamesStore;
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refreshSnapshot = useCallback(async () => {
    if (!sessionId) return;
    const result = await fetchSessionSnapshot(sessionId);
    if (result.ok) {
      store.getState().setLatestSnapshot(result.data);
    } else {
      log.error('useGameSession', 'Failed to fetch snapshot', { sessionId, error: result.error });
    }
  }, [sessionId, store]);

  // Subscribe to session changes via realtime
  useEffect(() => {
    if (!sessionId) return;

    // Clear stale snapshot from a previous session so it doesn't
    // trigger premature navigation (e.g. old 'completed' status)
    const current = store.getState().latestSnapshot;
    if (current && current.id !== sessionId) {
      store.getState().setLatestSnapshot(null);
    }

    void refreshSnapshot();

    channelRef.current = subscribeToSession(sessionId, () => {
      void refreshSnapshot();
    });

    return () => {
      if (channelRef.current) {
        unsubscribeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, refreshSnapshot]);

  const currentRound = snapshot?.rounds.find(
    (r) => r.roundIndex === snapshot.currentRoundIndex,
  ) ?? null;

  const myAnswerForCurrentRound = currentRound
    ? snapshot?.answers.some(
        (a) => a.roundId === currentRound.id && a.userId === userId,
      ) ?? false
    : false;

  const partnerAnswerForCurrentRound = currentRound
    ? snapshot?.answers.some(
        (a) => a.roundId === currentRound.id && a.userId !== userId,
      ) ?? false
    : false;

  const submitAnswer = useCallback(async (
    roundId: string,
    payload: GameAnswerPayload,
  ) => {
    if (!sessionId) return;
    store.getState().setPendingAnswer(payload);
    store.getState().setError(null);

    const result = await submitGameAnswer({
      sessionId,
      roundId,
      answerPayload: payload as unknown as Record<string, unknown>,
    });

    store.getState().setPendingAnswer(null);

    if (!result.ok) {
      log.error('useGameSession', 'Failed to submit answer', { sessionId, roundId, error: result.error });
      store.getState().setError(result.error);
      return;
    }

    // Refetch full snapshot after answer
    void refreshSnapshot();
  }, [sessionId, store, refreshSnapshot]);

  const leaveSession = useCallback(async () => {
    if (!sessionId) return;
    store.getState().setIsLoading(true);
    await leaveGameSession(sessionId);
    store.getState().setLatestSnapshot(null);
    store.getState().setActiveSessionId(null);
    store.getState().setIsLoading(false);
  }, [sessionId, store]);

  return {
    snapshot,
    isLoading,
    error,
    currentRound,
    myAnswerForCurrentRound,
    partnerAnswerForCurrentRound,
    submitAnswer,
    leaveSession,
    refreshSnapshot,
  };
}
