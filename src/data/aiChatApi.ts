import { supabase } from '@data/supabase';
import type { ChatMessage, ChatHistoryResult } from '@/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
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
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
        return { ok: false, error: 'Not authenticated.' };
    }

    const { data, error } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('user_id', sessionData.session.user.id)
        .eq('conversation_type', 'chat')
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT);

    if (error) {
        return { ok: false, error: 'Failed to load history.' };
    }

    const rows = (data ?? []) as MessageRow[];
    const messages: ChatMessage[] = rows.map((row) => ({
        id: row.id,
        role: row.role,
        text: row.content,
        timestamp: new Date(row.created_at).getTime(),
        status: 'sent' as const,
    }));

    messages.reverse();
    return { ok: true, data: messages };
}

export function sendStreamMessage(
    content: string,
    callbacks: StreamCallbacks,
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

            xhr.send(JSON.stringify({ content }));
        })();
    });
}
