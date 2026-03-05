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
import GradientButton from '@components/ui/GradientButton';
import { ChatBubble } from '@components/chat/ChatBubble';
import { TypingIndicator } from '@components/chat/TypingIndicator';
import { useOnboarding } from '@hooks/useOnboarding';
import {
  colors,
  gradients,
  radii,
  spacing,
  layout,
  shadows,
  fontFamilies,
  fontSize,
  fontWeight,
  textStyles,
} from '@/theme/tokens';
import type { OnboardingScreenProps } from '@navigation/types';
import type { OnboardingMessage } from '@store/onboardingStore';

// ─── Progress Dots ────────────────────────────────────────────────────────────

interface ProgressDotsProps {
  current: number;
  total: number;
}

const ProgressDots = React.memo(({ current, total }: ProgressDotsProps) => (
  <View style={styles.dotsRow}>
    {Array.from({ length: total }, (_, i) => (
      <View
        key={i}
        style={[styles.dot, i < current ? styles.dotFilled : styles.dotEmpty]}
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
  const flatListRef = useRef<FlatList<OnboardingMessage>>(null);
  const hasTriggeredFirst = useRef(false);

  // Auto-trigger first AI greeting once initialization completes with no messages
  useEffect(() => {
    if (hasTriggeredFirst.current) return;
    if (isInitializing) return;
    if (messages.length === 0) {
      hasTriggeredFirst.current = true;
      void sendMessage('');
    }
  }, [isInitializing, messages.length, sendMessage]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length === 0) return;
    const id = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(id);
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;
    setInputText('');
    void sendMessage(trimmed);
  }, [inputText, isLoading, sendMessage]);

  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<OnboardingMessage>) => <ChatBubble message={item} />,
    [],
  );

  const keyExtractor = useCallback((item: OnboardingMessage) => item.id, []);

  // ── Loading splash while initializing ─────────────────────────────────────
  if (isInitializing) {
    return (
      <LinearGradient colors={gradients.heroWash} style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.centered}>
            <Text style={styles.emoji}>💕</Text>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Getting things ready…</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Completion screen ──────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <LinearGradient colors={gradients.heroWash} style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.centered}>
            <Text style={styles.completionEmoji}>🎉</Text>
            <Text style={styles.completionTitle}>You&apos;re all set!</Text>
            <Text style={styles.completionSubtitle}>
              Your profile is ready. Let&apos;s start your couple journey.
            </Text>
            {error !== null && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
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
  return (
    <LinearGradient colors={gradients.heroWash} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.emoji}>💕</Text>
              <Text style={styles.headerTitle}>CoupleGoAI</Text>
            </View>
            <View style={styles.progressSection}
            accessibilityLabel={`Question ${currentQuestion} of ${totalQuestions}`}
            accessibilityRole="progressbar"
          >
              <ProgressDots current={currentQuestion} total={totalQuestions} />
              <Text style={styles.progressLabel}>
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
              isLoading ? null : (
                <View style={styles.emptyState}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )
            }
            ListFooterComponent={isLoading ? <TypingIndicator /> : null}
          />

          {/* Error banner */}
          {error !== null && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your answer…"
              placeholderTextColor={colors.gray}
              style={styles.input}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.75}
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              accessibilityLabel="Send message"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={!inputText.trim() || isLoading ? gradients.disabled : gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendGradient}
              >
                <Ionicons name="arrow-up" size={20} color={colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// StyleSheet.create used throughout: percentage-based widths, precise layout
// values, shadow objects, and dynamic disabled states cannot use NativeWind.

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing.xl,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: { fontSize: 24 },
  headerTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  progressSection: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: spacing.xs,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
  dotEmpty: {
    backgroundColor: colors.borderDefault,
  },
  progressLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: colors.gray,
  },

  // ── Messages ───────────────────────────────────────────────────────────────
  messageList: {
    flexGrow: 1,
    paddingVertical: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['2xl'],
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    marginHorizontal: layout.screenPaddingH,
    marginBottom: spacing.sm,
    borderRadius: radii.radiusSm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },

  // ── Input bar ──────────────────────────────────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.radiusMd,
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: colors.foreground,
    maxHeight: 120,
    ...shadows.sm,
  },
  sendButton: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    borderRadius: radii.radiusFull,
    overflow: 'hidden',
    ...shadows.glowPrimary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Loading / Completion ───────────────────────────────────────────────────
  loadingText: {
    ...textStyles.bodyMd,
    color: colors.gray,
    textAlign: 'center',
  },
  completionEmoji: { fontSize: 64 },
  completionTitle: {
    ...textStyles.displaySm,
    color: colors.foreground,
    textAlign: 'center',
  },
  completionSubtitle: {
    ...textStyles.bodyMd,
    color: colors.gray,
    textAlign: 'center',
    maxWidth: 280,
  },
});
