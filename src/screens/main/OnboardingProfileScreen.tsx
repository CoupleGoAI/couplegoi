import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import GradientButton from '@components/ui/GradientButton';
import { DevMenu } from '@components/ui/DevMenu';
import { HeartActionButton } from '@components/ui/HeartActionButton';
import { ChatBubble } from '@components/chat/ChatBubble';
import { TypingIndicator } from '@components/chat/TypingIndicator';
import { InteractiveMessageBubble } from '@components/chat/interactive/InteractiveMessageBubble';
import { useOnboarding } from '@hooks/useOnboarding';
import { useAuth } from '@hooks/useAuth';
import {
    colors,
    gradients,
    fontFamilies,
    letterSpacing,
    radii,
    shadows,
    spacing,
} from '@/theme/tokens';
import type { OnboardingProfileScreenProps } from '@navigation/types';
import type { OnboardingMessage } from '@store/onboardingStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPING_DELAY_MIN_MS = 300;
const TYPING_DELAY_MAX_MS = 600;

function randomTypingDelay(): number {
    return Math.floor(Math.random() * (TYPING_DELAY_MAX_MS - TYPING_DELAY_MIN_MS + 1)) + TYPING_DELAY_MIN_MS;
}

// ─── Progress Dots ────────────────────────────────────────────────────────────

interface ProgressDotsProps {
    current: number;
    total: number;
}

const ProgressDots = React.memo(({ current, total }: ProgressDotsProps) => (
    <View className="flex-row gap-sm">
        {Array.from({ length: total }, (_, i) => (
            <View
                key={i}
                className={`w-sm h-sm rounded-full ${i < current ? 'bg-primary' : 'bg-borderDefault'}`}
            />
        ))}
    </View>
));
ProgressDots.displayName = 'ProgressDots';

// ─── Screen ───────────────────────────────────────────────────────────────────

export function OnboardingProfileScreen(_props: OnboardingProfileScreenProps): React.ReactElement {
    const {
        messages,
        isComplete,
        currentQuestion,
        totalQuestions,
        isLoading,
        error,
        sendMessage,
        isInitializing,
        startPairing,
        hasActivePicker,
        confirmDatePicker,
    } = useOnboarding();

    const [inputText, setInputText] = useState('');
    const [showTyping, setShowTyping] = useState(false);
    const [isDevMenuVisible, setIsDevMenuVisible] = useState(false);
    const flatListRef = useRef<FlatList<OnboardingMessage>>(null);
    const hasTriggeredFirst = useRef(false);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCompletionEmojiTapRef = useRef(0);
    const { signOut } = useAuth();

    // Send button animation (scale + spin)
    const sendScale = useSharedValue(1);
    const sendRotation = useSharedValue(0);
    const sendAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: sendScale.value },
            { rotate: `${sendRotation.value}deg` },
        ],
    }));

    // Cleanup typing timer on unmount
    useEffect(() => {
        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        };
    }, []);

    // Auto-trigger first AI greeting once initialization completes with no messages
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

    // Scroll to bottom when new messages arrive or typing indicator shows
    useEffect(() => {
        if (messages.length === 0 && !showTyping) return;
        const id = setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return () => clearTimeout(id);
    }, [messages.length, showTyping]);

    /** Send a text message with typing delay before AI response */
    const handleSend = useCallback(() => {
        const trimmed = inputText.trim();
        if (!trimmed || isLoading || showTyping) return;
        setInputText('');
        sendScale.value = withSequence(
            withTiming(1.25, { duration: 200, easing: Easing.out(Easing.cubic) }),
            withTiming(1, { duration: 200, easing: Easing.in(Easing.cubic) }),
        );
        sendRotation.value = withSequence(
            withTiming(720, { duration: 400, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 1 }),
        );
        void sendMessage(trimmed);
    }, [inputText, isLoading, showTyping, sendMessage, sendScale, sendRotation]);

    const renderMessage = useCallback(
        ({ item }: ListRenderItemInfo<OnboardingMessage>) => {
            if (item.role === 'interactive' && item.interactive !== undefined) {
                return (
                    <InteractiveMessageBubble
                        payload={item.interactive}
                        onConfirm={confirmDatePicker}
                    />
                );
            }
            // role is narrowed to 'user' | 'assistant' here; ChatBubble expects exactly that
            return <ChatBubble message={{ id: item.id, role: item.role as 'user' | 'assistant', content: item.content, createdAt: item.createdAt }} />;
        },
        [confirmDatePicker],
    );

    const keyExtractor = useCallback((item: OnboardingMessage) => item.id, []);

    const handleRetry = useCallback(() => {
        if (isLoading) return;
        void sendMessage('');
    }, [isLoading, sendMessage]);

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

    // ── Loading splash while initializing ─────────────────────────────────────
    if (isInitializing) {
        return (
            <LinearGradient colors={gradients.heroWash} style={styles.flex}>
                <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                    <View className="flex-1 items-center justify-center px-5 gap-xl">
                        <Text style={styles.emoji}>💕</Text>
                        <ActivityIndicator color={colors.primary} size="large" />
                        <Text className="text-base text-gray text-center">Getting things ready…</Text>
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
                            You&apos;re all set!
                        </Text>
                        <Text
                            className="text-base text-gray text-center"
                            style={styles.completionSubtitle}
                        >
                            Your profile is ready. Let&apos;s connect with your partner.
                        </Text>
                        {error !== null && (
                            <View className="flex-row items-center bg-errorBg mx-5 mb-sm rounded-sm px-lg py-sm gap-sm">
                                <Ionicons name="alert-circle" size={16} color={colors.error} />
                                <Text className="flex-1 text-sm font-medium text-error">{error}</Text>
                            </View>
                        )}
                        <GradientButton
                            label={isLoading ? 'Starting pairing…' : "Let's Go!"}
                            onPress={() => { void startPairing(); }}
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
    const sendDisabled = !inputText.trim() || isLoading || showTyping;

    return (
        <LinearGradient colors={gradients.heroWash} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.flex}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
                >
                    {/* Header */}
                    <View className="px-5 pt-md pb-lg border-b border-borderLight items-center gap-sm">
                        <View className="flex-row items-center gap-sm">
                            <Text style={styles.emoji}>💕</Text>
                            <Text className="text-lg font-bold text-foreground">CoupleGoAI</Text>
                        </View>
                        <View
                            className="items-center gap-xs"
                            accessibilityLabel={`Question ${currentQuestion} of ${totalQuestions}`}
                            accessibilityRole="progressbar"
                        >
                            <ProgressDots current={currentQuestion} total={totalQuestions} />
                            <Text className="text-xs text-gray">
                                {currentQuestion} of {totalQuestions}
                            </Text>
                        </View>
                    </View>

                    {/* Messages */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={styles.messageList}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            isLoading || showTyping ? null : (
                                <View className="flex-1 items-center justify-center pt-2xl px-5 gap-md">
                                    <Text className="text-base text-foreground text-center">
                                        {error ? 'Connection issue' : 'Start your story'}
                                    </Text>
                                    <Text className="text-sm text-gray text-center">
                                        {error
                                            ? 'We could not reach the server. Check your connection and try again.'
                                            : 'Answer a couple of quick questions to set up your profile.'}
                                    </Text>
                                    {error && (
                                        <GradientButton
                                            label="Try again"
                                            onPress={handleRetry}
                                            size="sm"
                                            loading={isLoading}
                                            disabled={isLoading}
                                            style={styles.emptyCta}
                                        />
                                    )}
                                </View>
                            )
                        }
                        ListFooterComponent={isLoading || showTyping ? <TypingIndicator /> : null}
                    />

                    {/* Error banner */}
                    {error !== null && (
                        <View className="flex-row items-center bg-errorBg mx-5 mb-sm rounded-sm px-lg py-sm gap-sm">
                            <Ionicons name="alert-circle" size={16} color={colors.error} />
                            <Text className="flex-1 text-sm font-medium text-error">{error}</Text>
                        </View>
                    )}

                    {/* Text input bar — shown when not complete */}
                    {!isComplete && (
                        <View className="flex-row items-center px-5 py-md border-t border-borderLight gap-md">
                            <TextInput
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder={hasActivePicker ? 'Choose a date above ↑' : 'Type your answer…'}
                                placeholderTextColor={colors.gray}
                                className="flex-1 bg-white rounded-md border-borderDefault px-lg py-md text-base text-foreground"
                                style={styles.input}
                                multiline
                                maxLength={500}
                                returnKeyType="send"
                                onSubmitEditing={handleSend}
                                blurOnSubmit
                                editable={!isLoading && !showTyping && !hasActivePicker}
                            />
                            <Animated.View style={sendAnimatedStyle}>
                                <HeartActionButton
                                    onPress={handleSend}
                                    disabled={sendDisabled}
                                    accessibilityLabel="Send message"
                                />
                            </Animated.View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

// ─── Residual Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    flex: { flex: 1 },
    emoji: { fontSize: 24 },
    completionEmoji: { fontSize: 64 },
    serifFont: {
        fontFamily: fontFamilies.serifBold,
        letterSpacing: letterSpacing.tight,
    },
    completionSubtitle: { maxWidth: 280 },
    messageList: {
        flexGrow: 1,
        paddingVertical: spacing.md,
    },
    emptyCta: { marginTop: spacing.sm },
    input: {
        maxHeight: 120,
        borderWidth: 1.5,
        ...shadows.sm,
    },
});
