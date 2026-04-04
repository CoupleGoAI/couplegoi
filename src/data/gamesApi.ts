import { invokeEdgeFunction } from '@data/apiClient';
import { supabase } from '@data/supabase';
import type {
  GameType,
  GameCategoryKey,
  GameInvitation,
  GameSessionSnapshot,
  GameSessionPlayer,
  GameRound,
  GameAnswer,
  GameResultSummary,
  GameHistoryEntry,
  GamePromptPayload,
} from '@/types/games';

// ─── Invitation API ─────────────────────────────────────────

interface CreateInvitationInput {
  readonly gameType: GameType;
  readonly categoryKey: GameCategoryKey;
}

export async function createGameInvitation(
  input: CreateInvitationInput,
): Promise<{ ok: true; data: GameInvitation } | { ok: false; error: string }> {
  return invokeEdgeFunction<GameInvitation>('game-create-invitation', {
    gameType: input.gameType,
    categoryKey: input.categoryKey,
  });
}

interface RespondInvitationInput {
  readonly invitationId: string;
  readonly response: 'accept' | 'decline';
  readonly roundManifest?: readonly {
    readonly promptId: string;
    readonly promptPayload: GamePromptPayload;
    readonly categoryKey: GameCategoryKey;
  }[];
}

export async function respondToGameInvitation(
  input: RespondInvitationInput,
): Promise<{ ok: true; data: GameSessionSnapshot } | { ok: false; error: string }> {
  return invokeEdgeFunction<GameSessionSnapshot>('game-respond-invitation', {
    invitationId: input.invitationId,
    response: input.response,
    roundManifest: input.roundManifest,
  });
}

export async function cancelGameInvitation(
  invitationId: string,
): Promise<{ ok: true; data: { cancelled: boolean } } | { ok: false; error: string }> {
  return invokeEdgeFunction<{ cancelled: boolean }>('game-cancel-invitation', {
    invitationId,
  });
}

// ─── Session API ────────────────────────────────────────────

interface SubmitAnswerInput {
  readonly sessionId: string;
  readonly roundId: string;
  readonly answerPayload: Record<string, unknown>;
}

export async function submitGameAnswer(
  input: SubmitAnswerInput,
): Promise<{ ok: true; data: GameSessionSnapshot } | { ok: false; error: string }> {
  return invokeEdgeFunction<GameSessionSnapshot>('game-submit-answer', {
    sessionId: input.sessionId,
    roundId: input.roundId,
    answerPayload: input.answerPayload,
  });
}

export async function fetchSessionSnapshot(
  sessionId: string,
): Promise<{ ok: true; data: GameSessionSnapshot } | { ok: false; error: string }> {
  return invokeEdgeFunction<GameSessionSnapshot>('game-session-snapshot', {
    sessionId,
  });
}

export async function leaveGameSession(
  sessionId: string,
): Promise<{ ok: true; data: { cancelled: boolean } } | { ok: false; error: string }> {
  return invokeEdgeFunction<{ cancelled: boolean }>('game-leave-session', {
    sessionId,
  });
}

// ─── History API ────────────────────────────────────────────

export async function fetchGameHistory(
  limit = 10,
  offset = 0,
): Promise<{ ok: true; data: GameHistoryEntry[] } | { ok: false; error: string }> {
  return invokeEdgeFunction<GameHistoryEntry[]>('game-history', {
    limit,
    offset,
  });
}

// ─── Direct Supabase Queries (RLS-protected reads) ──────────

export async function fetchPendingInvitations(
  coupleId: string,
): Promise<{ ok: true; data: GameInvitation[] } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase
      .from('game_invitations')
      .select('*')
      .eq('couple_id', coupleId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    if (error) return { ok: false, error: 'Failed to fetch invitations' };
    return { ok: true, data: mapInvitations(data ?? []) };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function fetchActiveSession(
  coupleId: string,
): Promise<{ ok: true; data: GameSessionSnapshot | null } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select(`
        *,
        game_session_players (*),
        game_rounds (*),
        game_answers (*)
      `)
      .eq('couple_id', coupleId)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { ok: false, error: 'Failed to fetch session' };
    if (!data) return { ok: true, data: null };
    return { ok: true, data: mapSessionSnapshot(data) };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

// ─── Row Mappers ────────────────────────────────────────────

function mapInvitations(rows: Record<string, unknown>[]): GameInvitation[] {
  return rows.map((r) => ({
    id: r.id as string,
    coupleId: r.couple_id as string,
    fromUserId: r.from_user_id as string,
    toUserId: r.to_user_id as string,
    gameType: r.game_type as GameType,
    categoryKey: r.category_key as GameCategoryKey,
    status: r.status as GameInvitation['status'],
    expiresAt: r.expires_at as string,
    createdAt: r.created_at as string,
    respondedAt: (r.responded_at as string) ?? null,
    sessionId: (r.session_id as string) ?? null,
  }));
}

interface SessionRow {
  id: string;
  couple_id: string;
  invitation_id: string | null;
  game_type: string;
  category_key: string;
  status: string;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  last_activity_at: string;
  current_round_index: number;
  total_rounds: number;
  version: number;
  game_session_players: Record<string, unknown>[];
  game_rounds: Record<string, unknown>[];
  game_answers: Record<string, unknown>[];
}

function mapSessionSnapshot(row: Record<string, unknown>): GameSessionSnapshot {
  const r = row as unknown as SessionRow;
  return {
    id: r.id,
    coupleId: r.couple_id,
    invitationId: r.invitation_id,
    gameType: r.game_type as GameType,
    categoryKey: r.category_key as GameCategoryKey,
    status: r.status as GameSessionSnapshot['status'],
    createdBy: r.created_by,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    cancelledAt: r.cancelled_at,
    lastActivityAt: r.last_activity_at,
    currentRoundIndex: r.current_round_index,
    totalRounds: r.total_rounds,
    version: r.version,
    players: (r.game_session_players ?? []).map(mapPlayer),
    rounds: (r.game_rounds ?? []).map(mapRound),
    answers: (r.game_answers ?? []).map(mapAnswer),
  };
}

function mapPlayer(r: Record<string, unknown>): GameSessionPlayer {
  return {
    userId: r.user_id as string,
    state: r.state as GameSessionPlayer['state'],
    joinedAt: r.joined_at as string,
    readyAt: (r.ready_at as string) ?? null,
    lastSeenAt: r.last_seen_at as string,
    disconnectedAt: (r.disconnected_at as string) ?? null,
  };
}

function mapRound(r: Record<string, unknown>): GameRound {
  return {
    id: r.id as string,
    sessionId: r.session_id as string,
    roundIndex: r.round_index as number,
    status: r.status as GameRound['status'],
    promptId: r.prompt_id as string,
    promptPayload: r.prompt_payload as GameRound['promptPayload'],
    categoryKey: r.category_key as GameCategoryKey,
    startedAt: (r.started_at as string) ?? null,
    revealedAt: (r.revealed_at as string) ?? null,
  };
}

function mapAnswer(r: Record<string, unknown>): GameAnswer {
  return {
    id: r.id as string,
    sessionId: r.session_id as string,
    roundId: r.round_id as string,
    userId: r.user_id as string,
    answerPayload: r.answer_payload as GameAnswer['answerPayload'],
    answeredAt: r.answered_at as string,
  };
}
