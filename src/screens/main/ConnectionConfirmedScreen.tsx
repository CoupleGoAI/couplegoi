import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { ConnectionConfirmedScreenProps } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import GradientButton from '@components/ui/GradientButton';
import { colors, gradients, spacing, textStyles, radii, shadows } from '@/theme/tokens';

// ─── Component ────────────────────────────────────────────────────────────────

export const ConnectionConfirmedScreen: React.FC<ConnectionConfirmedScreenProps> = React.memo(
  ({ route }) => {
    const { partnerName, coupleId } = route.params;
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    /**
     * Finalise pairing in authStore and let RootNavigator switch to Main.
     * We defer the coupleId update to this tap so the confirmation screen
     * is visible before the nav stack transitions.
     */
    const handleEnter = () => {
      if (user) {
        setUser({ ...user, coupleId });
      }
    };

    return (
      <SafeAreaView style={styles.safe}>
        <LinearGradient
          colors={gradients.heroWash}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.container}>
            {/* Success illustration */}
            <View style={styles.emojiRow}>
              <Text style={styles.emoji}>💑</Text>
            </View>

            {/* Headline */}
            <View style={styles.textGroup}>
              <Text style={styles.title}>You&apos;re connected!</Text>
              <Text style={styles.subtitle}>
                {partnerName
                  ? `You and ${partnerName} are now officially a couple on CoupleGoAI 💕`
                  : 'You and your partner are now officially a couple on CoupleGoAI 💕'}
              </Text>
            </View>

            {/* Partner card */}
            {partnerName && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Your partner</Text>
                <Text style={styles.cardName}>{partnerName}</Text>
              </View>
            )}

            {/* CTA */}
            <GradientButton
              label="Set up your couple profile 💕"
              onPress={handleEnter}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  },
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing['2xl'],
  },
  emojiRow: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
  },
  textGroup: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...textStyles.displaySm,
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.bodyLg,
    color: colors.foregroundMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.radiusMd,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
    ...shadows.md,
  },
  cardLabel: {
    ...textStyles.labelSm,
    color: colors.gray,
  },
  cardName: {
    ...textStyles.h2,
    color: colors.foreground,
  },
});
