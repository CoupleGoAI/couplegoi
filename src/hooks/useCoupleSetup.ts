import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCoupleSetupStore } from '@store/coupleSetupStore';
import { useAuthStore } from '@store/authStore';
import { sendCoupleSetupMessage } from '@data/coupleSetupApi';
import * as authData from '@data/auth';
import { sanitizeMessage } from '@domain/onboarding/validation';
import type { CoupleSetupMessage } from '@store/coupleSetupStore';
import type { InteractivePayload } from '@/types/index';

// ─── Constants ────────────────────────────────────────────────────────────────

export const TOTAL_COUPLE_SETUP_QUESTIONS = 2;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseCoupleSetupReturn {
    messages: CoupleSetupMessage[];
    isComplete: boolean;
    currentQuestion: number;
    totalQuestions: number;
    isLoading: boolean;
    error: string | null;
    sendMessage: (text: string) => Promise<void>;
    isInitializing: boolean;
    retryComplete: () => Promise<void>;
    hasActivePicker: boolean;
    confirmDatePicker: (isoDate: string) => void;
}

// ─── ID Helper ────────────────────────────────────────────────────────────────

function generateMessageId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCoupleSetup(): UseCoupleSetupReturn {
    const [isInitializing, setIsInitializing] = useState(true);
    const [activePicker, setActivePicker] = useState<InteractivePayload | null>(null);

    const messages = useCoupleSetupStore((s) => s.messages);
    const isComplete = useCoupleSetupStore((s) => s.isComplete);
    const currentQuestion = useCoupleSetupStore((s) => s.currentQuestion);
    const isLoading = useCoupleSetupStore((s) => s.isLoading);
    const error = useCoupleSetupStore((s) => s.error);
    const addMessage = useCoupleSetupStore((s) => s.addMessage);
    const setIsComplete = useCoupleSetupStore((s) => s.setIsComplete);
    const setCurrentQuestion = useCoupleSetupStore((s) => s.setCurrentQuestion);
    const setLoading = useCoupleSetupStore((s) => s.setLoading);
    const setError = useCoupleSetupStore((s) => s.setError);
    const reset = useCoupleSetupStore((s) => s.reset);

    const setUser = useAuthStore((s) => s.setUser);
    const userId = useAuthStore((s) => s.user?.id);

    const hasInitialized = useRef(false);

    // Derive display messages — append synthetic interactive message when a picker is active
    const displayMessages = useMemo((): CoupleSetupMessage[] => {
        if (!activePicker) return messages;
        return [
            ...messages,
            {
                id: 'interactive-picker',
                role: 'interactive',
                content: '',
                createdAt: Date.now(),
                interactive: activePicker,
            },
        ];
    }, [messages, activePicker]);

    const sendMessage = useCallback(
        async (text: string): Promise<void> => {
            setLoading(true);
            setError(null);

            const sanitized = sanitizeMessage(text);

            if (sanitized.length > 0) {
                const userMsg: CoupleSetupMessage = {
                    id: generateMessageId('user'),
                    role: 'user',
                    content: sanitized,
                    createdAt: Date.now(),
                };
                addMessage(userMsg);
            }

            const result = await sendCoupleSetupMessage(sanitized);

            if (!result.ok) {
                setError(result.error);
                setLoading(false);
                return;
            }

            const { reply, questionIndex, isComplete: complete } = result.data;

            if (typeof reply !== 'string' || typeof questionIndex !== 'number' || typeof complete !== 'boolean') {
                setError('Unexpected response from server. Please try again.');
                setLoading(false);
                return;
            }

            const aiMsg: CoupleSetupMessage = {
                id: generateMessageId('ai'),
                role: 'assistant',
                content: reply,
                createdAt: Date.now(),
            };
            addMessage(aiMsg);
            setCurrentQuestion(questionIndex);
            setIsComplete(complete);
            setLoading(false);

            // questionIndex === 0 means the AI just asked for the dating start date — show picker
            if (questionIndex === 0 && !complete) {
                const today = new Date().toISOString().split('T')[0];
                setActivePicker({ type: 'date-picker', maxDate: today });
            }

            // Refresh auth profile so RootNavigator transitions reactively
            if (complete && userId) {
                const profileResult = await authData.fetchProfile(userId);
                if (profileResult.ok) {
                    setUser(profileResult.data);
                }
            }
        },
        [addMessage, setLoading, setError, setCurrentQuestion, setIsComplete, setUser, userId],
    );

    /** Called when the date picker emits a confirmed ISO date. */
    const confirmDatePicker = useCallback(
        (isoDate: string) => {
            setActivePicker(null);
            void sendMessage(isoDate);
        },
        [sendMessage],
    );

    const retryComplete = useCallback(async (): Promise<void> => {
        if (!userId) {
            setError('Session error. Please sign out and back in.');
            return;
        }
        setLoading(true);
        setError(null);
        const profileResult = await authData.fetchProfile(userId);
        if (profileResult.ok) {
            setUser(profileResult.data);
        } else {
            setError('Could not connect. Please try again.');
        }
        setLoading(false);
    }, [userId, setUser, setLoading, setError]);

    // Initialize once: reset store so we always start fresh
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;
        reset();
        setIsInitializing(false);
    }, []);

    return {
        messages: displayMessages,
        isComplete,
        currentQuestion,
        totalQuestions: TOTAL_COUPLE_SETUP_QUESTIONS,
        isLoading,
        error,
        sendMessage,
        isInitializing,
        retryComplete,
        hasActivePicker: activePicker !== null,
        confirmDatePicker,
    };
}
