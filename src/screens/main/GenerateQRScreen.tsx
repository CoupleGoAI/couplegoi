import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import type { GenerateQRScreenProps } from '@navigation/types';
import { usePairing } from '@hooks/usePairing';
import { useAuthStore } from '@store/authStore';
import GradientButton from '@components/ui/GradientButton';
import { colors, spacing, textStyles, radii, shadows } from '@/theme/tokens';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSecondsRemaining(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function deriveShortPairCode(token: string | null): string {
  if (!token) {
    return '000000';
  }

  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = ((hash * 31) + token.charCodeAt(i)) >>> 0;
  }

  return hash.toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const GenerateQRScreen: React.FC<GenerateQRScreenProps> = React.memo(
  ({ navigation }) => {
    const { token, expiresAt, isPending, error, generateToken } = usePairing();
    const setPairingSkipped = useAuthStore((s) => s.setPairingSkipped);
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const shortCode = deriveShortPairCode(token);

    const isExpired = secondsLeft === 0 && token !== null;

    // Generate token on mount
    useEffect(() => {
      void generateToken();
    }, [generateToken]);

    // Countdown timer
    useEffect(() => {
      if (!expiresAt) return;

      setSecondsLeft(getSecondsRemaining(expiresAt));

      timerRef.current = setInterval(() => {
        setSecondsLeft(getSecondsRemaining(expiresAt));
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [expiresAt]);

    const handleRegenerate = () => {
      void generateToken();
    };

    const handleScanInstead = () => {
      navigation.navigate('ScanQR');
    };

    const handleSkip = () => {
      setPairingSkipped(true);
    };

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Connect with your partner</Text>
            <Text style={styles.subtitle}>
              Ask your partner to scan this QR code
            </Text>
          </View>

          {/* QR / Loading / Error area */}
          <View style={styles.qrArea}>
            {isPending ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <GradientButton
                  label="Try again"
                  onPress={handleRegenerate}
                  variant="outline"
                  size="md"
                  fullWidth
                />
              </View>
            ) : token && !isExpired ? (
              <View style={styles.qrWrapper}>
                {/* MUST-7: QR contains only the token string — no PII */}
                <QRCode
                  value={token}
                  size={220}
                  color={colors.foreground}
                  backgroundColor={colors.background}
                />
                <Text style={styles.countdownText}>
                  Expires in {formatCountdown(secondsLeft)}
                </Text>
                <Text style={styles.shortCodeLabel}>Alternative code</Text>
                <Text style={styles.shortCodeValue}>{shortCode}</Text>
              </View>
            ) : token && isExpired ? (
              <View style={styles.expiredBox}>
                <Text style={styles.expiredEmoji}>⏰</Text>
                <Text style={styles.expiredTitle}>Code expired</Text>
                <Text style={styles.expiredSubtitle}>
                  Generate a new code for your partner to scan.
                </Text>
                <GradientButton
                  label="Generate new code"
                  onPress={handleRegenerate}
                  variant="primary"
                  size="md"
                  fullWidth
                />
              </View>
            ) : null}
          </View>

          {/* Footer toggle */}
          <View style={styles.footer}>
            <Text style={styles.toggleLabel}>
              Want to scan instead?
            </Text>
            <TouchableOpacity onPress={handleScanInstead} activeOpacity={0.75}>
              <Text style={styles.toggleLink}>Scan partner&apos;s QR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.75} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  },
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...textStyles.displaySm,
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.bodyMd,
    color: colors.gray,
    textAlign: 'center',
  },
  qrArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  loadingBox: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...textStyles.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  qrWrapper: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderRadius: radii.radiusMd,
    ...shadows.md,
  },
  countdownText: {
    ...textStyles.labelMd,
    color: colors.gray,
  },
  shortCodeLabel: {
    ...textStyles.bodySm,
    color: colors.gray,
  },
  shortCodeValue: {
    ...textStyles.bodyLg,
    color: colors.foreground,
    letterSpacing: 2.5,
  },
  expiredBox: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  expiredEmoji: {
    fontSize: 48,
  },
  expiredTitle: {
    ...textStyles.h2,
    color: colors.foreground,
    textAlign: 'center',
  },
  expiredSubtitle: {
    ...textStyles.bodyMd,
    color: colors.gray,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  toggleLabel: {
    ...textStyles.bodySm,
    color: colors.gray,
  },
  toggleLink: {
    ...textStyles.bodySm,
    color: colors.primary,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: spacing.md,
  },
  skipText: {
    ...textStyles.bodySm,
    color: colors.gray,
    textDecorationLine: 'underline',
  },
});
