import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGameSession } from '@hooks/useGameSession';
import { useHaptics } from '@hooks/useHaptics';
import { useAuthStore } from '@store/authStore';
import { useGamesStore } from '@store/gamesStore';
import { GAME_DEFINITIONS } from '@/domain/games/catalog';
import type { GameResultsScreenProps, RootNavProp } from '@navigation/types';
import type { GameType, GameAnswerPayload, GamePromptPayload } from '@/types/games';
import {
  colors, gradients, radii, spacing, shadows,
  fontFamilies, fontSize, fontWeight, letterSpacing,
} from '@/theme/tokens';

export default function GameResultsScreen(): React.ReactElement {
  const navigation = useNavigation<RootNavProp>();
  const route = useRoute<GameResultsScreenProps['route']>();
  const sessionId = route.params?.sessionId ?? null;
  const haptics = useHaptics();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { snapshot } = useGameSession(sessionId);

  const gameDef = snapshot
    ? GAME_DEFINITIONS[snapshot.gameType as GameType]
    : null;

  // Calculate results
  const results = React.useMemo(() => {
    if (!snapshot) return { matchCount: 0, total: 0, pct: 0, details: [] };

    const total = snapshot.rounds.length;
    let matchCount = 0;
    const details: {
      roundIndex: number;
      prompt: GamePromptPayload;
      myAnswer: GameAnswerPayload | null;
      partnerAnswer: GameAnswerPayload | null;
      matched: boolean;
    }[] = [];

    for (const round of snapshot.rounds) {
      const myA = snapshot.answers.find(
        (a) => a.roundId === round.id && a.userId === userId,
      );
      const partnerA = snapshot.answers.find(
        (a) => a.roundId === round.id && a.userId !== userId,
      );
      const matched = myA && partnerA
        ? JSON.stringify(myA.answerPayload) === JSON.stringify(partnerA.answerPayload)
        : false;
      if (matched) matchCount++;
      details.push({
        roundIndex: round.roundIndex,
        prompt: round.promptPayload,
        myAnswer: myA?.answerPayload ?? null,
        partnerAnswer: partnerA?.answerPayload ?? null,
        matched,
      });
    }

    return {
      matchCount,
      total,
      pct: total > 0 ? Math.round((matchCount / total) * 100) : 0,
      details,
    };
  }, [snapshot, userId]);

  // Score animation
  const scoreScale = useSharedValue(0);
  const scoreOpacity = useSharedValue(0);

  useEffect(() => {
    void haptics.success();
    scoreOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    scoreScale.value = withDelay(
      300,
      withSequence(
        withSpring(1.15, { damping: 12 }),
        withSpring(1, { damping: 15 }),
      ),
    );
  }, [haptics, scoreScale, scoreOpacity]);

  const scoreAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
    opacity: scoreOpacity.value,
  }));

  const headline = results.pct >= 80
    ? 'Amazing connection!'
    : results.pct >= 60
    ? 'Great alignment!'
    : results.pct >= 40
    ? 'Interesting mix!'
    : 'Lots to talk about!';

  const subheadline = results.pct >= 80
    ? 'You two are seriously in sync.'
    : results.pct >= 60
    ? 'You share a lot of common ground.'
    : results.pct >= 40
    ? 'Your differences make great conversation starters.'
    : 'Different perspectives make you stronger together.';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Score Hero */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.hero}
        >
          <Text style={styles.heroEmoji}>
            {results.pct >= 80 ? '🥰' : results.pct >= 60 ? '💕' : results.pct >= 40 ? '😊' : '✨'}
          </Text>

          <Animated.View style={[styles.scoreCircle, scoreAnimStyle]}>
            <Text style={styles.scoreValue}>{results.pct}%</Text>
            <Text style={styles.scoreLabel}>compatibility</Text>
          </Animated.View>

          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subheadline}>{subheadline}</Text>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.statsRow}
        >
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{results.matchCount}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{results.total}</Text>
            <Text style={styles.statLabel}>Rounds</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{gameDef?.emoji ?? '🎮'}</Text>
            <Text style={styles.statLabel}>{gameDef?.shortTitle ?? 'Game'}</Text>
          </View>
        </Animated.View>

        {/* Round Breakdown */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <Text style={styles.sectionTitle}>Round by Round</Text>
          {results.details.map((d, i) => (
            <Animated.View
              key={i}
              entering={FadeInUp.delay(700 + i * 60).duration(300)}
              style={[styles.roundRow, d.matched && styles.roundRowMatch]}
            >
              <View style={styles.roundIndex}>
                <Text style={[
                  styles.roundIndexText,
                  d.matched && styles.roundIndexTextMatch,
                ]}>
                  {d.matched ? '✓' : i + 1}
                </Text>
              </View>
              <View style={styles.roundContent}>
                <Text style={styles.roundPrompt} numberOfLines={1}>
                  {formatPromptShort(d.prompt)}
                </Text>
                <View style={styles.roundAnswers}>
                  <Text style={styles.roundAnswerYou} numberOfLines={1}>
                    You: {formatAnswerShort(d.myAnswer, d.prompt, snapshot?.gameType as GameType)}
                  </Text>
                  <Text style={styles.roundAnswerPartner} numberOfLines={1}>
                    Partner: {formatAnswerShort(d.partnerAnswer, d.prompt, snapshot?.gameType as GameType)}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          onPress={() => {
            useGamesStore.getState().setActiveSessionId(null);
            useGamesStore.getState().setLatestSnapshot(null);
            navigation.navigate('MainTabs');
          }}
          activeOpacity={0.85}
          style={styles.ctaBtn}
        >
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaLabel}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function formatPromptShort(prompt: GamePromptPayload): string {
  switch (prompt.type) {
    case 'would_you_rather':
      return `${prompt.optionA} vs ${prompt.optionB}`;
    case 'this_or_that':
      return `${prompt.optionA} vs ${prompt.optionB}`;
    case 'who_is_more_likely':
      return prompt.prompt;
    case 'never_have_i_ever':
      return prompt.statement;
  }
}

function formatAnswerShort(
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
    return answer.targetUserId === 'self' ? 'Me' : 'Partner';
  }
  if (answer.type === 'boolean') {
    return answer.value ? 'I have' : 'Never';
  }
  return '—';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  heroEmoji: { fontSize: 48 },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceGame,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glowPrimary,
  },
  scoreValue: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  scoreLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wider,
  },
  headline: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
  },
  subheadline: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: colors.foregroundMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.radius,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  statValue: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  statLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: colors.gray,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wider,
  },
  sectionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.gray,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.radiusSm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceGame,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  roundRowMatch: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  roundIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundIndexText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.gray,
  },
  roundIndexTextMatch: {
    color: colors.success,
  },
  roundContent: {
    flex: 1,
    gap: spacing.xs,
  },
  roundPrompt: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  roundAnswers: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roundAnswerYou: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: colors.primary,
    flex: 1,
  },
  roundAnswerPartner: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: colors.accent,
    flex: 1,
  },
  bottomPad: { height: spacing['2xl'] },
  ctaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
  },
  ctaBtn: { alignSelf: 'stretch' },
  ctaGradient: {
    borderRadius: radii.radiusFull,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.glowPrimary,
  },
  ctaLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    letterSpacing: letterSpacing.subtle,
  },
});
