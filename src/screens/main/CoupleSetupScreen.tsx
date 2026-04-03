import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '@components/ui/GradientButton';
import { DevMenu } from '@components/ui/DevMenu';
import { HelpTypeChips } from '@components/chat/HelpTypeChips';
import { InteractiveMessageBubble } from '@components/chat/interactive/InteractiveMessageBubble';
import { ChatContainer } from '@components/ui/Chat';
import { useCoupleSetup } from '@hooks/useCoupleSetup';
import { useAuth } from '@hooks/useAuth';
import { useAuthStore } from '@store/authStore';
import { colors, gradients, fontFamilies, letterSpacing } from '@/theme/tokens';
import type { CoupleSetupScreenProps } from '@navigation/types';
import type { ChatMessage } from '@/types/index';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPING_DELAY_MIN_MS = 300;
const TYPING_DELAY_MAX_MS = 600;

function randomTypingDelay(): number {
    return Math.floor(Math.random() * (TYPING_DELAY_MAX_MS - TYPING_DELAY_MIN_MS + 1)) + TYPING_DELAY_MIN_MS;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function CoupleSetupScreen(_props: CoupleSetupScreenProps): React.ReactElement {
    const {
        messages,
        isComplete,
        currentQuestion,
        isLoading,
        error,
        sendMessage,
        isInitializing,
        retryComplete,
        hasActivePicker,
        confirmDatePicker,
        partnerInfo,
    } = useCoupleSetup();

    const [showTyping, setShowTyping] = useState(false);
    const [isDevMenuVisible, setIsDevMenuVisible] = useState(false);
    const hasTriggeredFirst = useRef(false);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCompletionEmojiTapRef = useRef(0);
    const { signOut } = useAuth();
    const userAvatar = useAuthStore((s) => s.user?.avatarUrl ?? null);
    const userName = useAuthStore((s) => s.user?.name ?? null);

    useEffect(() => {
        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        };
    }, []);

    // Auto-trigger first AI greeting
    useEffect(() => {
        if (hasTriggeredFirst.current) return;
        if (isInitializing) return;
        if (messages.length === 0) {
            hasTriggeredFirst.current = true;
            setShowTyping(true);
            typingTimerRef.current = setTimeout(() => {
                setShowTyping(false);
                void sendMessage('');
            }, randomTypingDelay());
        }
    }, [isInitializing, messages.length, sendMessage]);

    // Map to ChatMessage (exclude synthetic interactive entries)
    const chatMessages = useMemo((): ChatMessage[] =>
        messages
            .filter((m) => m.role !== 'interactive')
            .map((m) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant' | 'partner',
                text: m.content,
                timestamp: m.createdAt,
                senderName: m.senderName ?? undefined,
            })),
        [messages],
    );

    // Extract active interactive picker payload if present
    const activePicker = useMemo(
        () => messages.find((m) => m.role === 'interactive')?.interactive ?? null,
        [messages],
    );

    const showChips = currentQuestion === 1 && !isComplete;

    const handleChipSelect = useCallback(
        (value: string) => {
            if (isLoading || showTyping) return;
            void sendMessage(value);
        },
        [isLoading, showTyping, sendMessage],
    );

    const handleSend = useCallback(
        (text: string) => { void sendMessage(text); },
        [sendMessage],
    );

    // Footer slot: date picker → chips → nothing
    const footerSlot = useMemo((): React.ReactElement | null => {
        if (activePicker !== null) {
            return (
                <InteractiveMessageBubble 
                    payload={{ ...activePicker, title: 'Please choose the date when you started dating.' }} 
                    onConfirm={confirmDatePicker} 
                />
            );
        }
        if (showChips) {
            return <HelpTypeChips onSelect={handleChipSelect} disabled={isLoading || showTyping} />;
        }
        return null;
    }, [activePicker, showChips, confirmDatePicker, handleChipSelect, isLoading, showTyping]);

    const handleCompletionEmojiPress = useCallback(() => {
        if (!__DEV__) return;
        const now = Date.now();
        if (now - lastCompletionEmojiTapRef.current < 350) {
            setIsDevMenuVisible(true);
        }
        lastCompletionEmojiTapRef.current = now;
    }, []);

    const handleDevSignOut = useCallback(async () => {
        setIsDevMenuVisible(false);
        await signOut();
    }, [signOut]);

    // ── Loading splash ─────────────────────────────────────────────────────────
    if (isInitializing) {
        return (
            <LinearGradient colors={gradients.heroWash} style={styles.flex}>
                <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                    <View className="flex-1 items-center justify-center px-5 gap-xl">
                        <Text style={styles.emoji}>💑</Text>
                        <ActivityIndicator color={colors.primary} size="large" />
                        <Text className="text-base text-gray text-center">Setting up your couple profile…</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    // ── Completion screen ──────────────────────────────────────────────────────
    if (isComplete) {
        return (
            <LinearGradient colors={gradients.heroWash} style={styles.flex}>
                <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                    <View className="flex-1 items-center justify-center px-5 gap-xl">
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={handleCompletionEmojiPress}
                            accessibilityRole={__DEV__ ? 'button' : undefined}
                            accessibilityLabel={__DEV__ ? 'Open developer menu' : undefined}
                        >
                            <Text style={styles.completionEmoji}>🎉</Text>
                        </TouchableOpacity>
                        <Text
                            className="text-3xl font-bold text-foreground text-center"
                            style={styles.serifFont}
                        >
                            You&apos;re ready!
                        </Text>
                        <Text
                            className="text-base text-gray text-center"
                            style={styles.completionSubtitle}
                        >
                            Your couple profile is all set. Let&apos;s start growing together.
                        </Text>
                        {error !== null && (
                            <View className="flex-row items-center bg-errorBg mx-5 mb-sm rounded-sm px-lg py-sm gap-sm">
                                <Ionicons name="alert-circle" size={16} color={colors.error} />
                                <Text className="flex-1 text-sm font-medium text-error">{error}</Text>
                            </View>
                        )}
                        <GradientButton
                            label={isLoading ? 'Loading…' : "Let's Go!"}
                            onPress={() => { void retryComplete(); }}
                            size="lg"
                            fullWidth
                            loading={isLoading}
                        />
                    </View>
                    <DevMenu
                        visible={isDevMenuVisible}
                        onClose={() => setIsDevMenuVisible(false)}
                        onSignOut={() => { void handleDevSignOut(); }}
                    />
                </SafeAreaView>
            </LinearGradient>
        );
    }

    // ── Main chat UI ───────────────────────────────────────────────────────────
    return (
        <ChatContainer
            messages={chatMessages}
            isLoading={isLoading || showTyping}
            mode="single"
            isCoupled={false}
            onModeChange={() => undefined}
            title="Couple Setup"
            titleEmoji="💑"
            userAvatar={userAvatar}
            userName={userName}
            partnerAvatar={partnerInfo?.avatarUrl ?? null}
            footerSlot={footerSlot}
            inputPlaceholder={hasActivePicker ? 'Choose a date above ↑' : 'Type your answer…'}
            inputDisabled={hasActivePicker}
            hideInput={showChips}
            onSend={handleSend}
            error={error}
        />
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    flex: { flex: 1 },
    emoji: { fontSize: 24 },
    completionEmoji: { fontSize: 64 },
    serifFont: {
        fontFamily: fontFamilies.serifBold,
        letterSpacing: letterSpacing.tight,
    },
    completionSubtitle: { maxWidth: 280 },
});
