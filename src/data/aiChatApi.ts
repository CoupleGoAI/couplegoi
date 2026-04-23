import { supabase } from '@data/supabase';
import { invokeEdgeFunction } from '@data/apiClient';
import { runtimeConfig } from '@/config/runtimeConfig';
import type { ChatMessage, ChatHistoryResult } from '@/types';

const SUPABASE_URL = runtimeConfig.supabaseUrl;
const SUPABASE_ANON_KEY = runtimeConfig.supabaseAnonKey;
const HISTORY_LIMIT = 20;

interface MessageRow {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export interface StreamCallbacks {
    onChunk: (text: string) => void;
    onDone: () => void;
    onError: (message: string) => void;
}

interface SSEChunk {
    t?: string;
    e?: string;
}

export async function fetchChatHistory(): Promise<ChatHistoryResult> {
    const result = await invokeEdgeFunction<{ messages: MessageRow[] }>(
        'get-messages',
        { conversation_type: 'chat', limit: HISTORY_LIMIT },
    );

    if (!result.ok) return { ok: false, error: 'Failed to load history.' };

    const rows = result.data.messages ?? [];
    const messages: ChatMessage[] = rows.map((row) => ({
        id: row.id,
        role: row.role,
        text: row.content,
        timestamp: new Date(row.created_at).getTime(),
        status: 'sent' as const,
    }));

    return { ok: true, data: messages };
}

export function sendStreamMessage(
    content: string,
    callbacks: StreamCallbacks,
    mode?: 'couple',
): Promise<void> {
    return new Promise((resolve) => {
        void (async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                callbacks.onError('Not authenticated. Please sign in again.');
                resolve();
                return;
            }

            const token = sessionData.session.access_token;
            const url = `${SUPABASE_URL}/functions/v1/ai-chat`;

            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
            xhr.timeout = 30000;

            let lastLength = 0;
            let buffer = '';
            let isDone = false;

            xhr.onprogress = () => {
                const newText = xhr.responseText.slice(lastLength);
                lastLength = xhr.responseText.length;
                buffer += newText;
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data: ')) continue;
                    const data = trimmed.slice(6).trim();

                    if (data === '[DONE]') {
                        isDone = true;
                        callbacks.onDone();
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data) as SSEChunk;
                        if (parsed.e) {
                            isDone = true;
                            callbacks.onError('Something went wrong. Please try again.');
                            return;
                        }
                        if (parsed.t) {
                            callbacks.onChunk(parsed.t);
                        }
                    } catch {
                        // Skip malformed SSE chunks
                    }
                }
            };

            xhr.onload = () => {
                if (!isDone) {
                    if (xhr.status !== 200) {
                        callbacks.onError('Failed to reach AI. Please try again.');
                    } else {
                        callbacks.onDone();
                    }
                }
                resolve();
            };

            xhr.onerror = () => {
                callbacks.onError('Network error. Please check your connection.');
                resolve();
            };

            xhr.ontimeout = () => {
                callbacks.onError('Request timed out. Please try again.');
                resolve();
            };

            xhr.send(JSON.stringify(mode === 'couple' ? { content, mode } : { content }));
        })();
    });
}
