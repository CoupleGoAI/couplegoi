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
import { ChatBubble } from '@components/chat/ChatBubble';
import { TypingIndicator } from '@components/chat/TypingIndicator';
import { HelpTypeChips } from '@components/chat/HelpTypeChips';
import { useOnboarding } from '@hooks/useOnboarding';
import {
  colors,
  gradients,
  fontFamilies,
  letterSpacing,
  shadows,
  spacing,
} from '@/theme/tokens';
import type { OnboardingScreenProps } from '@navigation/types';
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

export function OnboardingChatScreen(_props: OnboardingScreenProps): React.ReactElement {
  const {
    messages,
    isComplete,
    currentQuestion,
    totalQuestions,
    isLoading,
    error,
    sendMessage,
    isInitializing,
    retryComplete,
  } = useOnboarding();

  const [inputText, setInputText] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const flatListRef = useRef<FlatList<OnboardingMessage>>(null);
  const hasTriggeredFirst = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Send button animation (scale + spin)
  const sendScale = useSharedValue(1);
  const sendRotation = useSharedValue(0);
  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: sendScale.value },
      { rotate: `${sendRotation.value}deg` },
    ],
  }));

  // Derived state
  const showChips = currentQuestion === 3 && !isComplete;
  const showInput = currentQuestion < 3 && !isComplete;

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
    // Trigger send animation: scale pulse + 2 spins in ~400ms
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

  /** Handle chip selection for help type question */
  const handleChipSelect = useCallback(
    (value: string) => {
      if (isLoading || showTyping) return;
      void sendMessage(value);
    },
    [isLoading, showTyping, sendMessage],
  );

  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<OnboardingMessage>) => <ChatBubble message={item} />,
    [],
  );

  const keyExtractor = useCallback((item: OnboardingMessage) => item.id, []);

  const handleRetry = useCallback(() => {
    if (isLoading) return;
    void sendMessage('');
  }, [isLoading, sendMessage]);

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
            <Text style={styles.completionEmoji}>🎉</Text>
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
              Your profile is ready. Let&apos;s start your couple journey.
            </Text>
            {error !== null && (
              <View className="flex-row items-center bg-errorBg mx-5 mb-sm rounded-sm px-lg py-sm gap-sm">
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text className="flex-1 text-sm font-medium text-error">{error}</Text>
              </View>
            )}
            <GradientButton
              label={isLoading ? 'Connecting…' : "Let's Go!"}
              onPress={() => { void retryComplete(); }}
              size="lg"
              fullWidth
              loading={isLoading}
            />
          </View>
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
                      : 'Answer a few quick questions to personalize your CoupleGoAI experience.'}
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

          {/* Help type chips — shown for question 3 */}
          {showChips && (
            <HelpTypeChips
              onSelect={handleChipSelect}
              disabled={isLoading || showTyping}
            />
          )}

          {/* Text input bar — shown for questions 0–2 */}
          {showInput && (
            <View className="flex-row items-center px-5 py-md border-t border-borderLight gap-md">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your answer…"
                placeholderTextColor={colors.gray}
                className="flex-1 bg-white rounded-md border-borderDefault px-lg py-md text-base text-foreground"
                style={styles.input}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit
                editable={!isLoading && !showTyping}
              />
              <Animated.View style={sendAnimatedStyle}>
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={sendDisabled}
                  activeOpacity={0.75}
                  style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
                  accessibilityLabel="Send message"
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={sendDisabled ? gradients.disabled : gradients.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sendGradient}
                  >
                    <Ionicons name="heart" size={22} color={colors.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Residual Styles ──────────────────────────────────────────────────────────
// StyleSheet.create kept only for: RN shadow objects, platform-specific
// fontFamily (serif), non-token dimensions, and dynamic disabled states.

const styles = StyleSheet.create({
  // Emoji sizing — non-standard sizes with no token match
  flex: { flex: 1 },
  emoji: { fontSize: 24 },
  completionEmoji: { fontSize: 64 },

  // Serif font — platform-specific via fontFamilies.serifBold
  serifFont: {
    fontFamily: fontFamilies.serifBold,
    letterSpacing: letterSpacing.tight,
  },

  // Completion subtitle — one-off max-width layout constraint
  completionSubtitle: {
    maxWidth: 280,
  },

  // FlatList content container — flexGrow not expressible via className on contentContainer
  messageList: {
    flexGrow: 1,
    paddingVertical: spacing.md,
  },

  // Empty state CTA — one-off spacing addition on top of parent gap
  emptyCta: {
    marginTop: spacing.sm,
  },

  // Input — shadow spread, maxHeight, non-standard border width
  input: {
    maxHeight: 120,
    borderWidth: 1.5,
    ...shadows.sm,
  },

  // Send button — circular with gradient glow
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden' as const,
    ...shadows.glowPrimary,
  },

  // Dynamic disabled state — shadow property override
  sendButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },

  // Gradient fill inside the button
  sendGradient: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
