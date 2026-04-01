import { supabase } from '@data/supabase';
import type { ChatMessage, ChatHistoryResult } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PartnerInfo {
    id: string;
    name: string | null;
    avatarUrl: string | null;
}

interface CoupleRow {
    partner1_id: string;
    partner2_id: string;
}

interface CoupleChatRow {
    id: string;
    role: string;
    content: string;
    created_at: string;
    user_id: string;
}

// ─── Partner Info ────────────────────────────────────────────────────────────

export async function fetchPartnerInfo(
    coupleId: string,
    myId: string,
): Promise<{ ok: true; data: PartnerInfo } | { ok: false; error: string }> {
    const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select('partner1_id, partner2_id')
        .eq('id', coupleId)
        .eq('is_active', true)
        .maybeSingle();

    if (coupleError) return { ok: false, error: 'Failed to load couple info.' };
    if (!couple) return { ok: false, error: 'Couple not found.' };

    const row = couple as CoupleRow;
    const partnerId = row.partner1_id === myId ? row.partner2_id : row.partner1_id;

    const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', partnerId)
        .maybeSingle();

    const typedProfile = profile as { name: string | null; avatar_url: string | null } | null;
    const name = typedProfile?.name ?? null;
    const avatarUrl = typedProfile?.avatar_url ?? null;
    return { ok: true, data: { id: partnerId, name, avatarUrl } };
}

// ─── Chat History ────────────────────────────────────────────────────────────

const HISTORY_LIMIT = 20;

export async function fetchCoupleChatHistory(
    myId: string,
    partner: PartnerInfo,
): Promise<ChatHistoryResult> {
    const { data, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at, user_id')
        .or(`user_id.eq.${myId},user_id.eq.${partner.id}`)
        .eq('conversation_type', 'couple_chat')
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT);

    if (error) return { ok: false, error: 'Failed to load chat history.' };

    const rows = (data ?? []) as CoupleChatRow[];
    const messages: ChatMessage[] = rows.map((row) => {
        const isAssistant = row.role === 'assistant';
        const isMine = row.user_id === myId;
        return {
            id: row.id,
            role: isAssistant ? 'assistant' : isMine ? 'user' : 'partner',
            text: row.content,
            timestamp: new Date(row.created_at).getTime(),
            status: 'sent' as const,
            senderName: !isAssistant && !isMine ? (partner.name ?? 'Partner') : undefined,
        };
    });

    messages.reverse();
    return { ok: true, data: messages };
}

// ─── Realtime Subscription ───────────────────────────────────────────────────

interface RealtimeMessagePayload {
    id: string;
    role: string;
    content: string;
    created_at: string;
    conversation_type: string;
}

export function subscribeToCoupleChatMessages(
    partnerId: string,
    partnerName: string | null,
    onInsert: (msg: ChatMessage) => void,
): RealtimeChannel {
    const channel = supabase
        .channel('couple_chat_' + partnerId)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `user_id=eq.${partnerId}`,
            },
            (payload) => {
                const row = payload.new as RealtimeMessagePayload;
                if (row.conversation_type !== 'couple_chat') return;
                if (row.role !== 'user' && row.role !== 'assistant') return;

                onInsert({
                    id: row.id,
                    role: row.role === 'assistant' ? 'assistant' : 'partner',
                    text: row.content,
                    timestamp: new Date(row.created_at).getTime(),
                    status: 'sent',
                    senderName: row.role !== 'assistant' ? (partnerName ?? 'Partner') : undefined,
                    isNew: row.role === 'assistant',
                });
            },
        )
        .subscribe();

    return channel;
}
