import { useState, useCallback, useEffect } from 'react';
import type { ChatMode, ChatMessage } from '@/types/index';
import { validateMessageText, createUserMessage } from '@/domain/aiChat/validation';
import { fetchChatHistory, sendStreamMessage } from '@data/aiChatApi';
import { fetchCoupleChatHistory, fetchPartnerInfo, subscribeToCoupleChatMessages } from '@data/coupleChatApi';
import type { PartnerInfo } from '@data/coupleChatApi';
import { supabase } from '@data/supabase';
import { useAuthStore } from '@store/authStore';

export interface UseAiChatReturn {
    messages: ChatMessage[];
    isHistoryLoading: boolean;
    isStreaming: boolean;
    error: string | null;
    send: (text: string) => Promise<void>;
    clearError: () => void;
}

export function useAiChat(mode: ChatMode): UseAiChatReturn {
    const userId = useAuthStore((s) => s.user?.id);
    const coupleId = useAuthStore((s) => s.user?.coupleId);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);

    // Reset state on mode change
    useEffect(() => {
        setMessages([]);
        setError(null);
        setIsStreaming(false);
        setPartnerInfo(null);
        setIsHistoryLoading(true);
    }, [mode]);

    // Fetch partner info for couple mode
    useEffect(() => {
        if (mode !== 'couple' || !coupleId || !userId) {
            if (mode !== 'couple') setIsHistoryLoading(false);
            return;
        }

        let cancelled = false;
        void fetchPartnerInfo(coupleId, userId).then((result) => {
            if (cancelled) return;
            if (result.ok) {
                setPartnerInfo(result.data);
            } else {
                setError(result.error);
                setIsHistoryLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [mode, coupleId, userId]);

    // Load chat history
    useEffect(() => {
        if (!userId) { setIsHistoryLoading(false); return; }
        if (mode === 'couple' && !partnerInfo) return;

        let cancelled = false;

        async function load(): Promise<void> {
            try {
                const result = mode === 'couple' && partnerInfo
                    ? await fetchCoupleChatHistory(userId!, partnerInfo)
                    : await fetchChatHistory();
                if (cancelled) return;
                if (result.ok) setMessages(result.data);
                else setError(result.error);
            } catch {
                if (!cancelled) setError('Failed to load chat history.');
            } finally {
                if (!cancelled) setIsHistoryLoading(false);
            }
        }

        void load();
        return () => { cancelled = true; };
    }, [mode, userId, partnerInfo]);

    // Realtime subscription for couple mode
    useEffect(() => {
        if (mode !== 'couple' || !partnerInfo) return;

        const channel = subscribeToCoupleChatMessages(
            partnerInfo.id,
            partnerInfo.name,
            (msg) => setMessages((prev) => [...prev, msg]),
        );
        return () => { void supabase.removeChannel(channel); };
    }, [mode, partnerInfo]);

    const send = useCallback(async (text: string): Promise<void> => {
        const validation = validateMessageText(text);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        const userMsg = createUserMessage(text);
        setMessages((prev) => [...prev, { ...userMsg, status: 'sending' as const }]);
        setError(null);
        setIsStreaming(true);

        const streamId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
        setMessages((prev) => [...prev, {
            id: streamId,
            role: 'assistant' as const,
            text: '',
            timestamp: Date.now(),
            status: 'sending' as const,
        }]);

        await sendStreamMessage(text, {
            onChunk(chunk: string) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === streamId ? { ...m, text: m.text + chunk } : m,
                    ),
                );
            },
            onDone() {
                setMessages((prev) =>
                    prev.map((m) => {
                        if (m.id === userMsg.id) return { ...m, status: 'sent' as const };
                        if (m.id === streamId) return { ...m, status: 'sent' as const };
                        return m;
                    }),
                );
                setIsStreaming(false);
            },
            onError(errMsg: string) {
                setMessages((prev) =>
                    prev
                        .filter((m) => m.id !== streamId)
                        .map((m) =>
                            m.id === userMsg.id ? { ...m, status: 'error' as const } : m,
                        ),
                );
                setError(errMsg);
                setIsStreaming(false);
            },
        }, mode === 'couple' ? 'couple' : undefined);
    }, [mode]);

    const clearError = useCallback(() => setError(null), []);

    return { messages, isHistoryLoading, isStreaming, error, send, clearError };
}
