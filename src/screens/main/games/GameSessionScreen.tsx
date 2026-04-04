import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGameSession } from '@hooks/useGameSession';
import { useHaptics } from '@hooks/useHaptics';
import { useAuthStore } from '@store/authStore';
import { useGamesStore } from '@store/gamesStore';
import { GAME_DEFINITIONS } from '@/domain/games/catalog';
import type { GameSessionScreenProps, RootNavProp } from '@navigation/types';
import type { GameType, GameAnswerPayload, GamePromptPayload } from '@/types/games';
import {
  colors, radii, spacing, shadows,
  fontFamilies, fontSize, fontWeight, letterSpacing,
} from '@/theme/tokens';

export default function GameSessionScreen(): React.ReactElement {
  const navigation = useNavigation<RootNavProp>();
  const route = useRoute<GameSessionScreenProps['route']>();
  const sessionId = route.params?.sessionId ?? null;
  const haptics = useHaptics();
  const userId = useAuthStore((s) => s.user?.id ?? '');

  const {
    snapshot,
    currentRound,
    myAnswerForCurrentRound,
    partnerAnswerForCurrentRound,
    submitAnswer,
    leaveSession,
    isLoading,
  } = useGameSession(sessionId);

  const gameDef = snapshot
    ? GAME_DEFINITIONS[snapshot.gameType as GameType]
    : null;

  // Navigate to results when session completes
  React.useEffect(() => {
    if (snapshot?.status === 'completed' && sessionId) {
      useGamesStore.getState().setActiveSessionId(null);
      navigation.replace('GameResults', { sessionId });
    }
    if (snapshot?.status === 'cancelled') {
      useGamesStore.getState().setActiveSessionId(null);
      navigation.goBack();
    }
  }, [snapshot?.status, sessionId, navigation]);

  const handleAnswer = useCallback(async (payload: GameAnswerPayload) => {
    if (!currentRound) return;
    void haptics.medium();
    await submitAnswer(currentRound.id, payload);
  }, [currentRound, submitAnswer, haptics]);

  const handleLeave = useCallback(async () => {
    void haptics.light();
    await leaveSession();
    navigation.goBack();
  }, [leaveSession, haptics, navigation]);

  if (!snapshot || !currentRound) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading game…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isRevealed = currentRound.status === 'revealed';

  // Find answers for the revealed state
  const myAnswer = snapshot.answers.find(
    (a) => a.roundId === currentRound.id && a.userId === userId,
  );
  const partnerAnswer = snapshot.answers.find(
    (a) => a.roundId === currentRound.id && a.userId !== userId,
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
          <Text style={styles.leaveText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{gameDef?.emoji ?? '🎮'}</Text>
          <Text style={styles.headerTitle}>{gameDef?.shortTitle ?? ''}</Text>
        </View>
        <Text style={styles.roundCounter}>
          {snapshot.currentRoundIndex + 1}/{snapshot.totalRounds}
        </Text>
      </View>

      {/* Progress Bar */}
      <ProgressBar
        current={snapshot.currentRoundIndex}
        total={snapshot.totalRounds}
      />

      {/* Round Content */}
      <View style={styles.content}>
        {isRevealed ? (
          <RevealView
            prompt={currentRound.promptPayload}
            gameType={snapshot.gameType as GameType}
            myAnswer={myAnswer?.answerPayload ?? null}
            partnerAnswer={partnerAnswer?.answerPayload ?? null}
          />
        ) : myAnswerForCurrentRound ? (
          <WaitingForPartner />
        ) : (
          <PromptView
            key={currentRound.id}
            prompt={currentRound.promptPayload}
            gameType={snapshot.gameType as GameType}
            onAnswer={handleAnswer}
            roundIndex={snapshot.currentRoundIndex}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Progress Bar ───────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }): React.ReactElement {
  const progress = (current + 1) / total;
  const width = useSharedValue(0);

  React.useEffect(() => {
    width.value = withSpring(progress, { damping: 20, stiffness: 120 });
  }, [progress, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
}

// ─── Prompt View (per game type) ────────────────────────────

interface PromptViewProps {
  prompt: GamePromptPayload;
  gameType: GameType;
  onAnswer: (payload: GameAnswerPayload) => void;
  roundIndex: number;
}

function PromptView({ prompt, gameType, onAnswer, roundIndex }: PromptViewProps): React.ReactElement {
  const haptics = useHaptics();
  const scaleA = useSharedValue(1);
  const scaleB = useSharedValue(1);

  const animA = useAnimatedStyle(() => ({
    transform: [{ scale: scaleA.value }],
  }));
  const animB = useAnimatedStyle(() => ({
    transform: [{ scale: scaleB.value }],
  }));

  const pressA = useCallback(() => {
    scaleA.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1),
    );
    if (gameType === 'who_is_more_likely') {
      // 'A' means "me"
      onAnswer({ type: 'target', targetUserId: 'self' });
    } else if (gameType === 'never_have_i_ever') {
      onAnswer({ type: 'boolean', value: true });
    } else {
      onAnswer({ type: 'binary', choice: 'A' });
    }
  }, [scaleA, onAnswer, gameType]);

  const pressB = useCallback(() => {
    scaleB.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1),
    );
    if (gameType === 'who_is_more_likely') {
      onAnswer({ type: 'target', targetUserId: 'partner' });
    } else if (gameType === 'never_have_i_ever') {
      onAnswer({ type: 'boolean', value: false });
    } else {
      onAnswer({ type: 'binary', choice: 'B' });
    }
  }, [scaleB, onAnswer, gameType]);

  if (gameType === 'would_you_rather' && prompt.type === 'would_you_rather') {
    return (
      <Animated.View
        key={roundIndex}
        entering={SlideInRight.springify().damping(18)}
        exiting={SlideOutLeft.duration(200)}
        style={styles.promptWrap}
      >
        <Text style={styles.promptLabel}>Would you rather…</Text>
        <Animated.View style={animA}>
          <TouchableOpacity style={styles.optionCardA} onPress={pressA} activeOpacity={0.85}>
            <Text style={styles.optionText}>{prompt.optionA}</Text>
          </TouchableOpacity>
        </Animated.View>
        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>
        <Animated.View style={animB}>
          <TouchableOpacity style={styles.optionCardB} onPress={pressB} activeOpacity={0.85}>
            <Text style={styles.optionText}>{prompt.optionB}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  }

  if (gameType === 'this_or_that' && prompt.type === 'this_or_that') {
    return (
      <Animated.View
        key={roundIndex}
        entering={SlideInRight.springify().damping(18)}
        exiting={SlideOutLeft.duration(200)}
        style={styles.promptWrap}
      >
        <Text style={styles.promptLabel}>Pick one!</Text>
        <Animated.View style={animA}>
          <TouchableOpacity style={styles.optionCardA} onPress={pressA} activeOpacity={0.85}>
            <Text style={styles.optionTextLg}>{prompt.optionA}</Text>
          </TouchableOpacity>
        </Animated.View>
        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>vs</Text>
          <View style={styles.orLine} />
        </View>
        <Animated.View style={animB}>
          <TouchableOpacity style={styles.optionCardB} onPress={pressB} activeOpacity={0.85}>
            <Text style={styles.optionTextLg}>{prompt.optionB}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  }

  if (gameType === 'who_is_more_likely' && prompt.type === 'who_is_more_likely') {
    return (
      <Animated.View
        key={roundIndex}
        entering={SlideInRight.springify().damping(18)}
        exiting={SlideOutLeft.duration(200)}
        style={styles.promptWrap}
      >
        <Text style={styles.promptLabel}>Who's more likely to…</Text>
        <Text style={styles.promptStatement}>{prompt.prompt}</Text>
        <View style={styles.targetRow}>
          <Animated.View style={[styles.targetCardWrap, animA]}>
            <TouchableOpacity style={styles.targetCard} onPress={pressA} activeOpacity={0.85}>
              <Text style={styles.targetEmoji}>🙋</Text>
              <Text style={styles.targetLabel}>Me</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={[styles.targetCardWrap, animB]}>
            <TouchableOpacity style={styles.targetCardAlt} onPress={pressB} activeOpacity={0.85}>
              <Text style={styles.targetEmoji}>💕</Text>
              <Text style={styles.targetLabel}>My partner</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    );
  }

  if (gameType === 'never_have_i_ever' && prompt.type === 'never_have_i_ever') {
    return (
      <Animated.View
        key={roundIndex}
        entering={SlideInRight.springify().damping(18)}
        exiting={SlideOutLeft.duration(200)}
        style={styles.promptWrap}
      >
        <Text style={styles.promptLabel}>Never have I ever…</Text>
        <Text style={styles.promptStatement}>{prompt.statement}</Text>
        <View style={styles.targetRow}>
          <Animated.View style={[styles.targetCardWrap, animA]}>
            <TouchableOpacity style={styles.targetCard} onPress={pressA} activeOpacity={0.85}>
              <Text style={styles.targetEmoji}>🙈</Text>
              <Text style={styles.targetLabel}>I have!</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={[styles.targetCardWrap, animB]}>
            <TouchableOpacity style={styles.targetCardAlt} onPress={pressB} activeOpacity={0.85}>
              <Text style={styles.targetEmoji}>😇</Text>
              <Text style={styles.targetLabel}>Never!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.promptWrap}>
      <Text style={styles.promptLabel}>Loading…</Text>
    </View>
  );
}

// ─── Waiting For Partner ────────────────────────────────────

function WaitingForPartner(): React.ReactElement {
  const pulse = useSharedValue(0.6);

  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.8 + pulse.value * 0.2 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.waitingWrap}>
      <Animated.View style={[styles.waitingPulse, dotStyle]} />
      <Text style={styles.waitingTitle}>Your answer is locked in!</Text>
      <Text style={styles.waitingSubtext}>Waiting for your partner…</Text>
    </Animated.View>
  );
}

// ─── Reveal View ────────────────────────────────────────────

interface RevealViewProps {
  prompt: GamePromptPayload;
  gameType: GameType;
  myAnswer: GameAnswerPayload | null;
  partnerAnswer: GameAnswerPayload | null;
}

function RevealView({ prompt, gameType, myAnswer, partnerAnswer }: RevealViewProps): React.ReactElement {
  const isMatch = myAnswer && partnerAnswer
    ? JSON.stringify(myAnswer) === JSON.stringify(partnerAnswer)
    : false;

  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.revealWrap}>
      <Text style={styles.revealEmoji}>{isMatch ? '💕' : '✨'}</Text>
      <Text style={styles.revealTitle}>
        {isMatch ? 'You matched!' : 'Different picks!'}
      </Text>

      <View style={styles.revealAnswers}>
        <View style={styles.revealBubble}>
          <Text style={styles.revealBubbleLabel}>You</Text>
          <Text style={styles.revealBubbleValue}>
            {formatAnswer(myAnswer, prompt, gameType)}
          </Text>
        </View>
        <View style={[styles.revealBubble, styles.revealBubblePartner]}>
          <Text style={styles.revealBubbleLabel}>Partner</Text>
          <Text style={styles.revealBubbleValue}>
            {formatAnswer(partnerAnswer, prompt, gameType)}
          </Text>
        </View>
      </View>

      {isMatch ? (
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>Match!</Text>
        </View>
      ) : null}

      <Text style={styles.revealHint}>Next round coming…</Text>
    </Animated.View>
  );
}

function formatAnswer(
  answer: GameAnswerPayload | null,
  prompt: GamePromptPayload,
  gameType: GameType,
): string {
  if (!answer) return '—';

  if (answer.type === 'binary') {
    if (prompt.type === 'would_you_rather' || prompt.type === 'this_or_that') {
      return answer.choice === 'A' ? prompt.optionA : prompt.optionB;
    }
    return answer.choice;
  }

  if (answer.type === 'target') {
    return answer.targetUserId === 'self' ? 'Me' : 'My partner';
  }

  if (answer.type === 'boolean') {
    return answer.value ? 'I have!' : 'Never!';
  }

  return '—';
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: colors.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  leaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceGame,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveText: {
    fontSize: fontSize.md,
    color: colors.gray,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerEmoji: { fontSize: 20 },
  headerTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  roundCounter: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.radiusFull,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xl,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  promptWrap: {
    gap: spacing.lg,
  },
  promptLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.gray,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  promptStatement: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: spacing.xl,
  },
  optionCardA: {
    backgroundColor: colors.muted,
    borderRadius: radii.radius,
    padding: spacing.xl,
    minHeight: 80,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.transparent,
    ...shadows.sm,
  },
  optionCardB: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.radius,
    padding: spacing.xl,
    minHeight: 80,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.transparent,
    ...shadows.sm,
  },
  optionText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
    textAlign: 'center',
    lineHeight: 24,
  },
  optionTextLg: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    textAlign: 'center',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  orText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.gray,
    letterSpacing: letterSpacing.wider,
  },
  targetRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  targetCardWrap: { flex: 1 },
  targetCard: {
    backgroundColor: colors.muted,
    borderRadius: radii.radius,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.transparent,
    ...shadows.sm,
  },
  targetCardAlt: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.radius,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.transparent,
    ...shadows.sm,
  },
  targetEmoji: { fontSize: 32 },
  targetLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  waitingWrap: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  waitingPulse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.successSoft,
    borderWidth: 2,
    borderColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  waitingSubtext: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: colors.foregroundMuted,
  },
  revealWrap: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  revealEmoji: { fontSize: 48 },
  revealTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  revealAnswers: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  revealBubble: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: radii.radiusMd,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  revealBubblePartner: {
    backgroundColor: colors.accentSoft,
  },
  revealBubbleLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wider,
  },
  revealBubbleValue: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
    textAlign: 'center',
  },
  matchBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.radiusFull,
    borderWidth: 1,
    borderColor: colors.success,
  },
  matchBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  revealHint: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: colors.gray,
    marginTop: spacing.sm,
  },
});
