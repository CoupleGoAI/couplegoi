import { useState, useCallback, useEffect } from 'react';
import type { ChatMessage } from '@/types/index';
import { validateMessageText, createUserMessage } from '@/domain/aiChat/validation';
import { fetchChatHistory, sendStreamMessage } from '@data/aiChatApi';
import { useAuthStore } from '@store/authStore';

export interface UseAiChatReturn {
    messages: ChatMessage[];
    isHistoryLoading: boolean;
    isStreaming: boolean;
    error: string | null;
    send: (text: string) => Promise<void>;
    clearError: () => void;
}

export function useAiChat(): UseAiChatReturn {
    const userId = useAuthStore((s) => s.user?.id);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setIsHistoryLoading(false);
            return;
        }

        let cancelled = false;

        async function loadHistory(): Promise<void> {
            try {
                const result = await fetchChatHistory();
                if (cancelled) return;
                if (result.ok) {
                    setMessages(result.data);
                } else {
                    setError(result.error);
                }
            } catch {
                if (!cancelled) {
                    setError('Failed to load chat history');
                }
            } finally {
                if (!cancelled) {
                    setIsHistoryLoading(false);
                }
            }
        }

        void loadHistory();
        return () => { cancelled = true; };
    }, [userId]);

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
            onError(message: string) {
                setMessages((prev) =>
                    prev
                        .filter((m) => m.id !== streamId)
                        .map((m) =>
                            m.id === userMsg.id ? { ...m, status: 'error' as const } : m,
                        ),
                );
                setError(message);
                setIsStreaming(false);
            },
        });
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return { messages, isHistoryLoading, isStreaming, error, send, clearError };
}
