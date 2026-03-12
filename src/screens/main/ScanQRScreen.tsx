import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { ScanQRScreenProps } from '@navigation/types';
import { usePairing } from '@hooks/usePairing';
import { useHaptics } from '@hooks/useHaptics';
import GradientButton from '@components/ui/GradientButton';
import { colors, spacing, textStyles, radii } from '@/theme/tokens';

// ─── Component ────────────────────────────────────────────────────────────────

export const ScanQRScreen: React.FC<ScanQRScreenProps> = React.memo(
  ({ navigation }) => {
    // MUST-NOT-7: camera permission requested only on this screen, not at app launch
    const [permission, requestPermission] = useCameraPermissions();
    const { clearEntryScreen, connect, isPending, error } = usePairing();
    const { success: hapticSuccess, error: hapticError } = useHaptics();
    const scannedRef = useRef(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
      clearEntryScreen();
    }, [clearEntryScreen]);

    useEffect(() => {
      if (!permission?.granted) {
        void requestPermission();
      }
    }, [permission, requestPermission]);

    const handleBarCodeScanned = useCallback(
      async ({ data }: { data: string }) => {
        // Prevent duplicate scan events
        if (scannedRef.current || isPending) return;
        scannedRef.current = true;
        setLocalError(null);

        const result = await connect(data);

        if (!result) {
          // error is set in usePairing store; show it locally too
          void hapticError();
          setLocalError(error ?? 'Something went wrong. Please try again.');
          // Allow re-scan
          scannedRef.current = false;
          return;
        }

        void hapticSuccess();
        navigation.navigate('ConnectionConfirmed', {
          partnerName: result.partnerName,
          coupleId: result.coupleId,
        });
      },
      [connect, error, hapticError, hapticSuccess, isPending, navigation],
    );

    const handleGenerateInstead = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }

      navigation.replace('GenerateQR');
    };

    // Camera permission denied
    if (permission && !permission.granted && !permission.canAskAgain) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.centeredContainer}>
            <Text style={styles.emoji}>📷</Text>
            <Text style={styles.title}>Camera access needed</Text>
            <Text style={styles.subtitle}>
              Camera access is needed to scan your partner&apos;s QR code.
              Please enable it in your device settings.
            </Text>
            <GradientButton
              label="Go back"
              onPress={handleGenerateInstead}
              variant="outline"
              size="md"
            />
          </View>
        </SafeAreaView>
      );
    }

    // Permission not yet determined or requesting
    if (!permission?.granted) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.centeredContainer}>
            <Text style={styles.emoji}>📷</Text>
            <Text style={styles.title}>Camera needed</Text>
            <Text style={styles.subtitle}>
              We need camera access to scan your partner&apos;s QR code.
            </Text>
            <GradientButton
              label="Allow camera"
              onPress={() => { void requestPermission(); }}
              variant="primary"
              size="md"
            />
          </View>
        </SafeAreaView>
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
              onBarcodeScanned={isPending ? undefined : handleBarCodeScanned}
            />
            {/* Overlay frame */}
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
            </View>
          </View>

          {/* Status / error */}
          <View style={styles.footer}>
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
        </View>
      </SafeAreaView>
    );
  },
);

const FRAME_SIZE = 220;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.foreground,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
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
    color: colors.primaryLight,
  },
  title: {
    ...textStyles.h1,
    color: colors.white,
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.bodyMd,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
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
  footer: {
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  statusText: {
    ...textStyles.bodyMd,
    color: 'rgba(255,255,255,0.65)',
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
    color: colors.primaryLight,
  },
  emoji: {
    fontSize: 48,
  },
});
