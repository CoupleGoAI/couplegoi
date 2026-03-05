import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { colors, radii, spacing } from '@/theme/tokens';

const DOT_SIZE = spacing.sm; // 8px — matches spacing token
const BOUNCE_HEIGHT = 7;
const BOUNCE_DURATION_MS = 280;
const STAGGER_MS = 140;

/** Animated bouncing dot used inside the typing indicator. */
const AnimatedDot = React.memo(({ delayMs }: { delayMs: number }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-BOUNCE_HEIGHT, { duration: BOUNCE_DURATION_MS }),
          withTiming(0, { duration: BOUNCE_DURATION_MS }),
        ),
        -1,
        false,
      ),
    );
  }, [translateY, delayMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
});

AnimatedDot.displayName = 'AnimatedDot';

/** Three bouncing dots shown in an AI bubble while a reply is loading. */
export const TypingIndicator = React.memo(() => (
  <View style={styles.container}>
    <View style={styles.bubble}>
      <AnimatedDot delayMs={0} />
      <AnimatedDot delayMs={STAGGER_MS} />
      <AnimatedDot delayMs={STAGGER_MS * 2} />
    </View>
  </View>
));

TypingIndicator.displayName = 'TypingIndicator';

// StyleSheet.create used here because dynamic animation values
// and precise dot sizing cannot be expressed with NativeWind.
const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: radii.radiusMd,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.gray,
  },
});
