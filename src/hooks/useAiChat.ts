import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ChatMode, ChatMessage } from '@/types/index';
import { validateMessageText, createUserMessage } from '@/domain/aiChat/validation';
import { substitutePartnerLabels } from '@/domain/aiChat/partnerLabels';
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
    partnerAvatar: string | null;
}

export function useAiChat(mode: ChatMode): UseAiChatReturn {
    const userId = useAuthStore((s) => s.user?.id);
    const userName = useAuthStore((s) => s.user?.name ?? null);
    const coupleId = useAuthStore((s) => s.user?.coupleId);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);

    // Names used to splice role labels ("Partner A" / "Partner B") coming
    // back from the LLM with the real display names. The LLM is instructed
    // never to emit these labels; this is a safety net for slip-ups.
    const labelNames = useMemo(
        () => ({
            partnerA: userName,
            partnerB: partnerInfo?.name ?? null,
        }),
        [userName, partnerInfo?.name],
    );

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
                if (result.ok) {
                    // Splice role labels in any assistant messages stored from
                    // earlier sessions so users never see "Partner A" / "Partner B".
                    const spliced = result.data.map((m) =>
                        m.role === 'assistant'
                            ? { ...m, text: substitutePartnerLabels(m.text, labelNames) }
                            : m,
                    );
                    setMessages(spliced);
                } else setError(result.error);
            } catch {
                if (!cancelled) setError('Failed to load chat history.');
            } finally {
                if (!cancelled) setIsHistoryLoading(false);
            }
        }

        void load();
        return () => { cancelled = true; };
    }, [mode, userId, partnerInfo, labelNames]);

    // Realtime subscription for couple mode — pull-on-notify pattern.
    // Messages are encrypted at rest so realtime payloads contain ciphertext.
    // On INSERT we ignore the payload and re-fetch decrypted history instead.
    useEffect(() => {
        if (mode !== 'couple' || !partnerInfo || !userId) return;

        let refreshTimer: ReturnType<typeof setTimeout> | null = null;

        const channel = subscribeToCoupleChatMessages(
            partnerInfo.id,
            () => {
                // Debounce rapid-fire inserts (user + assistant back-to-back).
                if (refreshTimer) clearTimeout(refreshTimer);
                refreshTimer = setTimeout(() => {
                    void fetchCoupleChatHistory(userId, partnerInfo).then((result) => {
                        if (!result.ok) return;
                        const spliced = result.data.map((m) =>
                            m.role === 'assistant'
                                ? { ...m, text: substitutePartnerLabels(m.text, labelNames) }
                                : m,
                        );
                        setMessages(spliced);
                    });
                }, 300);
            },
        );
        return () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            void supabase.removeChannel(channel);
        };
    }, [mode, partnerInfo, userId, labelNames]);

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
                    prev.map((m) => {
                        if (m.id !== streamId) return m;
                        const nextText = substitutePartnerLabels(m.text + chunk, labelNames);
                        return { ...m, text: nextText };
                    }),
                );
            },
            onDone() {
                setMessages((prev) =>
                    prev.map((m) => {
                        if (m.id === userMsg.id) return { ...m, status: 'sent' as const };
                        if (m.id === streamId) {
                            return {
                                ...m,
                                status: 'sent' as const,
                                text: substitutePartnerLabels(m.text, labelNames),
                            };
                        }
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
    }, [mode, labelNames]);

    const clearError = useCallback(() => setError(null), []);

    return { messages, isHistoryLoading, isStreaming, error, send, clearError, partnerAvatar: partnerInfo?.avatarUrl ?? null };
}
