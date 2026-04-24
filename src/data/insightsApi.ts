import { supabase } from '@/data/supabase';
import type { GameType } from '@/types/games';
import type { CoupleInsightsRaw, InsightsError, InsightsResult } from '@/domain/insights/types';

type SessionStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

interface SessionRow {
    id: string;
    game_type: GameType;
    status: SessionStatus;
    created_at: string;
    last_activity_at: string;
    completed_at: string | null;
}

interface ResultRow {
    compatibility_score: number | null;
    match_count: number;
    round_count: number;
}

interface MessageRow {
    created_at: string;
}

interface CoupleRow {
    dating_start_date: string | null;
    partner1_id: string;
    partner2_id: string;
}

function fail(kind: InsightsError['kind']): InsightsResult<CoupleInsightsRaw> {
    return { ok: false, error: { kind } };
}

export async function fetchCoupleInsightsRaw(
    coupleId: string,
): Promise<InsightsResult<CoupleInsightsRaw>> {
    try {
        const coupleRes = await supabase
            .from('couples')
            .select('dating_start_date, partner1_id, partner2_id')
            .eq('id', coupleId)
            .maybeSingle<CoupleRow>();

        if (coupleRes.error) return fail('network');
        if (!coupleRes.data) return fail('no_couple');

        const partnerIds = [coupleRes.data.partner1_id, coupleRes.data.partner2_id];

        const [sessionsRes, resultsRes, messagesRes] = await Promise.all([
            supabase
                .from('game_sessions')
                .select('id, game_type, status, created_at, last_activity_at, completed_at')
                .eq('couple_id', coupleId)
                .returns<SessionRow[]>(),
            supabase
                .from('game_session_results')
                .select('compatibility_score, match_count, round_count')
                .eq('couple_id', coupleId)
                .returns<ResultRow[]>(),
            supabase
                .from('messages')
                .select('created_at')
                .eq('conversation_type', 'couple_chat')
                .in('user_id', partnerIds)
                .returns<MessageRow[]>(),
        ]);

        const sessions = ((sessionsRes.error ? [] : sessionsRes.data) ?? []).map((s) => ({
            id: String(s.id),
            gameType: s.game_type,
            status: s.status,
            createdAt: s.created_at,
            lastActivityAt: s.last_activity_at,
            completedAt: s.completed_at,
        }));

        const results = ((resultsRes.error ? [] : resultsRes.data) ?? []).map((r) => ({
            compatibilityScore: r.compatibility_score,
            matchCount: r.match_count,
            roundCount: r.round_count,
        }));

        const messageDates = ((messagesRes.error ? [] : messagesRes.data) ?? []).map((m) => m.created_at);

        return {
            ok: true,
            data: {
                datingStartDate: coupleRes.data.dating_start_date,
                sessions,
                results,
                messageDates,
            },
        };
    } catch {
        return fail('unknown');
    }
}
