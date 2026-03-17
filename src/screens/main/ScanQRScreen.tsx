import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { ScanQRScreenProps } from '@navigation/types';
import { usePairing } from '@hooks/usePairing';
import { useHaptics } from '@hooks/useHaptics';
import { useAuthStore } from '@store/authStore';
import { HeartActionButton } from '@components/ui/HeartActionButton';
import GradientButton from '@components/ui/GradientButton';
import { colors, gradients, spacing, textStyles, radii } from '@/theme/tokens';

// ─── Component ────────────────────────────────────────────────────────────────

export const ScanQRScreen: React.FC<ScanQRScreenProps> = React.memo(
  ({ navigation }) => {
    // MUST-NOT-7: camera permission requested only on this screen, not at app launch
    const [permission, requestPermission] = useCameraPermissions();
    const { clearEntryScreen, connect, isPending, error } = usePairing();
    const { success: hapticSuccess, error: hapticError } = useHaptics();
    const setPairingSkipped = useAuthStore((s) => s.setPairingSkipped);
    const scannedRef = useRef(false);
    const [manualCode, setManualCode] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
      clearEntryScreen();
    }, [clearEntryScreen]);

    useEffect(() => {
      // Trigger native OS dialog when status is unknown or can be requested again (Android)
      if (permission === null || (!permission.granted && permission.canAskAgain)) {
        void requestPermission();
      }
    }, [permission, requestPermission]);

    const handleConnectAttempt = useCallback(
      async (rawCode: string): Promise<boolean> => {
        setLocalError(null);

        const result = await connect(rawCode);

        if (!result) {
          void hapticError();
          setLocalError(error ?? 'That code did not work. Please try again.');
          return false;
        }

        void hapticSuccess();
        navigation.navigate('ConnectionConfirmed', {
          partnerName: result.partnerName,
          coupleId: result.coupleId,
        });

        return true;
      },
      [connect, error, hapticError, hapticSuccess, navigation],
    );

    const handleBarCodeScanned = useCallback(
      async ({ data }: { data: string }) => {
        // Prevent duplicate scan events
        if (scannedRef.current || isPending) return;
        scannedRef.current = true;

        const connected = await handleConnectAttempt(data);
        if (!connected) {
          scannedRef.current = false;
        }
      },
      [handleConnectAttempt, isPending],
    );

    const handleManualCodeChange = useCallback((value: string) => {
      const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      setLocalError(null);
      setManualCode(normalized);
    }, []);

    const handleManualSubmit = useCallback(() => {
      if (isPending || manualCode.length !== 6) return;

      void (async () => {
        const connected = await handleConnectAttempt(manualCode);
        if (connected) {
          setManualCode('');
        }
      })();
    }, [handleConnectAttempt, isPending, manualCode]);

    const handleGenerateInstead = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.replace('GenerateQR');
    };

    const handleSkip = () => {
      setPairingSkipped(true);
    };

    // Camera permission permanently denied — direct user to Settings
    if (permission && !permission.granted && !permission.canAskAgain) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.centeredContainer}>
            <Text style={styles.emoji}>📷</Text>
            <Text style={styles.permTitle}>Camera access needed</Text>
            <Text style={styles.permSubtitle}>
              Camera access is needed to scan your partner&apos;s QR code.
              Please enable it in your device settings.
            </Text>
            <GradientButton
              label="Go back"
              onPress={handleGenerateInstead}
              variant="outline"
              size="md"
              fullWidth
            />
          </View>
        </SafeAreaView>
      );
    }

    // Permission not yet determined — pinkish loading screen while native OS dialog appears
    if (!permission?.granted) {
      return (
        <LinearGradient colors={gradients.heroWash} style={styles.flex}>
          <SafeAreaView style={styles.flex}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </SafeAreaView>
        </LinearGradient>
      );
    }

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGenerateInstead} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Scan your partner&apos;s QR code</Text>
            <Text style={styles.subtitle}>
              Point your camera at the QR code your partner generated
            </Text>
          </View>

          {/* Camera viewfinder */}
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={isPending || manualCode.length > 0 ? undefined : handleBarCodeScanned}
            />
            {/* Overlay frame */}
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
            </View>
          </View>

          {/* Manual fallback input */}
          <View style={styles.manualCodeSection}>
            <Text style={styles.manualCodeLabel}>Enter alternative code</Text>
            <View style={styles.manualCodeInputWrap}>
              <TextInput
                value={manualCode}
                onChangeText={handleManualCodeChange}
                placeholder="6-character code"
                placeholderTextColor={colors.gray}
                style={styles.manualCodeInput}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                editable={!isPending}
                returnKeyType="done"
                onSubmitEditing={handleManualSubmit}
              />
              <HeartActionButton
                onPress={handleManualSubmit}
                disabled={isPending || manualCode.length !== 6}
                accessibilityLabel="Connect with alternative code"
                size="sm"
                style={styles.manualCodeButton}
              />
            </View>
          </View>

          {/* Status / error */}
          <View style={styles.statusArea}>
            {isPending ? (
              <Text style={styles.statusText}>Connecting…</Text>
            ) : localError ? (
              <View style={styles.errorRow}>
                <Text style={styles.errorText}>{localError}</Text>
                <TouchableOpacity onPress={() => setLocalError(null)}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.statusText}>Scanning…</Text>
            )}
          </View>

          {/* Footer toggle */}
          <View style={styles.footer}>
            <Text style={styles.toggleLabel}>Want to generate instead?</Text>
            <TouchableOpacity onPress={handleGenerateInstead} activeOpacity={0.75}>
              <Text style={styles.toggleLink}>Generate your QR code</Text>
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

const FRAME_SIZE = 220;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  header: {
    gap: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  backBtnText: {
    ...textStyles.bodyMd,
    color: colors.primary,
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
  permTitle: {
    ...textStyles.h1,
    color: colors.foreground,
    textAlign: 'center',
  },
  permSubtitle: {
    ...textStyles.bodyMd,
    color: colors.gray,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 0.72,
    minHeight: 220,
    position: 'relative',
    borderRadius: radii.radiusMd,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderRadius: radii.radiusSm,
  },
  manualCodeSection: {
    gap: spacing.xs,
  },
  manualCodeLabel: {
    ...textStyles.bodySm,
    color: colors.gray,
  },
  manualCodeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    borderRadius: radii.radiusMd,
    backgroundColor: colors.background,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  manualCodeInput: {
    flex: 1,
    ...textStyles.labelMd,
    color: colors.foreground,
    paddingVertical: spacing.sm,
  },
  manualCodeButton: {
    marginLeft: spacing.sm,
  },
  statusArea: {
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  statusText: {
    ...textStyles.bodyMd,
    color: colors.gray,
    textAlign: 'center',
  },
  errorRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    ...textStyles.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  retryText: {
    ...textStyles.bodySm,
    color: colors.primary,
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
  emoji: {
    fontSize: 48,
  },
});
