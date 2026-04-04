import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useGamesStore } from '@store/gamesStore';
import { useAuthStore } from '@store/authStore';
import {
  createGameInvitation,
  respondToGameInvitation,
  cancelGameInvitation,
  fetchPendingInvitations,
} from '@data/gamesApi';
import { subscribeToInvitations, unsubscribeChannel } from '@data/gameRealtime';
import { selectPrompts } from '@/domain/games/promptSelector';
import { GAME_DEFINITIONS } from '@/domain/games/catalog';
import type {
  GameType,
  GameCategoryKey,
  GameInvitation,
  GamePromptPayload,
} from '@/types/games';

interface UseGameInviteReturn {
  readonly pendingInvite: GameInvitation | null;
  readonly outgoingInvite: GameInvitation | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly sendInvite: (gameType: GameType, categoryKey: GameCategoryKey) => Promise<void>;
  readonly acceptInvite: (invitationId: string) => Promise<string | null>;
  readonly declineInvite: (invitationId: string) => Promise<void>;
  readonly cancelInvite: (invitationId: string) => Promise<void>;
  readonly refreshInvitations: () => Promise<void>;
}

export function useGameInvite(): UseGameInviteReturn {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const coupleId = useAuthStore((s) => s.user?.coupleId ?? null);
  const pendingInvite = useGamesStore((s) => s.pendingInvite);
  const outgoingInvite = useGamesStore((s) => s.outgoingInvite);
  const isLoading = useGamesStore((s) => s.isLoading);
  const error = useGamesStore((s) => s.error);
  const store = useGamesStore;
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refreshInvitations = useCallback(async () => {
    if (!coupleId || !userId) return;
    const result = await fetchPendingInvitations(coupleId);
    if (!result.ok) return;

    const incoming = result.data.find(
      (i) => i.toUserId === userId && i.status === 'pending',
    ) ?? null;
    const outgoing = result.data.find(
      (i) => i.fromUserId === userId && i.status === 'pending',
    ) ?? null;
    store.getState().setPendingInvite(incoming);
    store.getState().setOutgoingInvite(outgoing);

    // Detect when partner accepted the invite we're currently tracking
    const currentOutgoing = store.getState().outgoingInvite;
    if (currentOutgoing) {
      const accepted = result.data.find(
        (i) => i.id === currentOutgoing.id && i.status === 'accepted' && i.sessionId,
      );
      if (accepted?.sessionId) {
        store.getState().setActiveSessionId(accepted.sessionId);
        store.getState().setOutgoingInvite(null);
      }
    }
  }, [coupleId, userId, store]);

  // Subscribe to invitation changes
  useEffect(() => {
    if (!coupleId) return;

    channelRef.current = subscribeToInvitations(coupleId, () => {
      void refreshInvitations();
    });

    void refreshInvitations();

    return () => {
      if (channelRef.current) {
        unsubscribeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [coupleId, refreshInvitations]);

  const sendInvite = useCallback(async (
    gameType: GameType,
    categoryKey: GameCategoryKey,
  ) => {
    store.getState().setIsLoading(true);
    store.getState().setError(null);

    const result = await createGameInvitation({ gameType, categoryKey });
    store.getState().setIsLoading(false);

    if (!result.ok) {
      store.getState().setError(result.error);
      return;
    }

    store.getState().setOutgoingInvite(result.data);
  }, [store]);

  const acceptInvite = useCallback(async (invitationId: string): Promise<string | null> => {
    const invite = pendingInvite;
    if (!invite) return null;

    store.getState().setIsLoading(true);
    store.getState().setError(null);

    // Generate round manifest client-side from the shared catalog
    const seed = `${invitationId}-${Date.now()}`;
    const def = GAME_DEFINITIONS[invite.gameType];
    const prompts = selectPrompts(invite.gameType, invite.categoryKey, def.defaultRounds, seed);
    const roundManifest = prompts.map((p) => ({
      promptId: p.id,
      promptPayload: buildPromptPayload(invite.gameType, p as unknown as Record<string, unknown>),
      categoryKey: p.category,
    }));

    const result = await respondToGameInvitation({
      invitationId,
      response: 'accept',
      roundManifest,
    });

    store.getState().setIsLoading(false);

    if (!result.ok) {
      store.getState().setError(result.error);
      return null;
    }

    store.getState().setPendingInvite(null);
    store.getState().setLatestSnapshot(result.data);
    store.getState().setActiveSessionId(result.data.id);
    return result.data.id;
  }, [pendingInvite, store]);

  const declineInvite = useCallback(async (invitationId: string) => {
    store.getState().setIsLoading(true);
    await respondToGameInvitation({ invitationId, response: 'decline' });
    store.getState().setPendingInvite(null);
    store.getState().setIsLoading(false);
  }, [store]);

  const cancelInvite = useCallback(async (invitationId: string) => {
    store.getState().setIsLoading(true);
    await cancelGameInvitation(invitationId);
    store.getState().setOutgoingInvite(null);
    store.getState().setIsLoading(false);
  }, [store]);

  return {
    pendingInvite,
    outgoingInvite,
    isLoading,
    error,
    sendInvite,
    acceptInvite,
    declineInvite,
    cancelInvite,
    refreshInvitations,
  };
}

function buildPromptPayload(
  gameType: GameType,
  prompt: Record<string, unknown>,
): GamePromptPayload {
  switch (gameType) {
    case 'would_you_rather':
      return {
        type: 'would_you_rather',
        optionA: prompt.optionA as string,
        optionB: prompt.optionB as string,
      };
    case 'this_or_that':
      return {
        type: 'this_or_that',
        optionA: prompt.optionA as string,
        optionB: prompt.optionB as string,
      };
    case 'who_is_more_likely':
      return {
        type: 'who_is_more_likely',
        prompt: prompt.prompt as string,
      };
    case 'never_have_i_ever':
      return {
        type: 'never_have_i_ever',
        statement: prompt.statement as string,
      };
  }
}
