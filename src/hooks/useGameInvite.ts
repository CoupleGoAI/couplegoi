import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useGamesStore } from '@store/gamesStore';
import { useAuthStore } from '@store/authStore';
import { log } from '@utils/logger';
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
    if (!result.ok) {
      log.warn('useGameInvite', 'Failed to fetch invitations', { error: result.error });
      return;
    }

    // Capture tracked outgoing BEFORE overwriting store — otherwise it's null
    const trackedOutgoing = store.getState().outgoingInvite;

    const incoming = result.data.find(
      (i) => i.toUserId === userId && i.status === 'pending',
    ) ?? null;
    const outgoing = result.data.find(
      (i) => i.fromUserId === userId && i.status === 'pending',
    ) ?? null;
    store.getState().setPendingInvite(incoming);
    store.getState().setOutgoingInvite(outgoing);

    // Detect when partner accepted the invite we were tracking
    if (trackedOutgoing) {
      const accepted = result.data.find(
        (i) => i.id === trackedOutgoing.id && i.status === 'accepted' && i.sessionId,
      );
      if (accepted?.sessionId) {
        log.info('useGameInvite', 'Partner accepted invite, navigating to session', {
          inviteId: accepted.id,
          sessionId: accepted.sessionId,
        });
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
      log.error('useGameInvite', 'Failed to create invitation', { error: result.error, gameType, categoryKey });
      store.getState().setError(result.error);
      return;
    }

    log.info('useGameInvite', 'Invitation sent', { inviteId: result.data.id, gameType });
    store.getState().setOutgoingInvite(result.data);
  }, [store]);

  const acceptInvite = useCallback(async (invitationId: string): Promise<string | null> => {
    const invite = pendingInvite;
    if (!invite) return null;

    store.getState().setIsLoading(true);
    store.getState().setError(null);

    // Generate round manifest — only IDs, prompt text resolved from catalog at render
    const seed = `${invitationId}-${Date.now()}`;
    const def = GAME_DEFINITIONS[invite.gameType];
    const prompts = selectPrompts(invite.gameType, invite.categoryKey, def.defaultRounds, seed);
    const roundManifest = prompts.map((p) => ({
      promptId: p.id,
      categoryKey: p.category,
    }));

    const result = await respondToGameInvitation({
      invitationId,
      response: 'accept',
      roundManifest,
    });

    store.getState().setIsLoading(false);

    if (!result.ok) {
      log.error('useGameInvite', 'Failed to accept invitation', { error: result.error, invitationId });
      store.getState().setError(result.error);
      return null;
    }

    log.info('useGameInvite', 'Accepted invitation, session created', { sessionId: result.data.id });
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

