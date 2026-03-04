import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import type { GenerateQRScreenProps } from '../../navigation/types';
import GradientButton from '../../components/ui/GradientButton';
import Card from '../../components/ui/Card';
import { useAppStore } from '../../store/appStore';
import { palette, gradients } from '../../theme/colors';
import { radii, spacing, shadows } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight, textStyles } from '../../theme/typography';

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.55;

export default function GenerateQRScreen({ navigation }: GenerateQRScreenProps) {
  const currentUser = useAppStore((s) => s.currentUser);

  const qrValue = `couplegoai://connect?userId=${currentUser?.id ?? 'demo'}&name=${encodeURIComponent(currentUser?.name ?? '')}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Hey! Join me on CoupleGoAI 💕\n\nUse my invite link: ${qrValue}`,
        title: 'Connect on CoupleGoAI',
      });
    } catch {
      // user dismissed
    }
  };

  return (
    <LinearGradient colors={gradients.heroWash as any} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={palette.purple900} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>📱</Text>
            <Text style={styles.title}>Your invite code</Text>
            <Text style={styles.subtitle}>
              Ask your partner to scan this — or share the link.
            </Text>
          </View>

          {/* QR Card */}
          <Card style={styles.qrCard} shadow="lg" padding="8">
            <View style={styles.qrInner}>
              <QRCode
                value={qrValue}
                size={QR_SIZE}
                color={palette.purple900}
                backgroundColor={palette.white}
                quietZone={8}
              />
            </View>
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <GradientButton
              label="Share Link"
              onPress={handleShare}
              size="lg"
              fullWidth
              icon={<Ionicons name="share-outline" size={18} color={palette.white} />}
            />
            <GradientButton
              label="My partner will scan me"
              onPress={() => navigation.navigate('ConnectionConfirmed')}
              variant="ghost"
              size="md"
              fullWidth
              style={styles.skipBtn}
            />
          </View>

          {/* Separator */}
          <View style={styles.orRow}>
            <View style={styles.line} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.line} />
          </View>

          <GradientButton
            label="Scan my partner's code"
            onPress={() => navigation.navigate('ScanQR')}
            variant="outline"
            size="md"
            fullWidth
            icon={<Ionicons name="scan-outline" size={18} color={palette.pink500} />}
          />
        </View>

        {/* Step indicator */}
        <View style={styles.steps}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.stepDot, i === 1 && styles.stepDotActive]} />
          ))}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing['5'] },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['2'],
  },
  content: { flex: 1, gap: spacing['5'], justifyContent: 'center' },
  header: { gap: spacing['2'], alignItems: 'center' },
  emoji: { fontSize: 40 },
  title: { ...textStyles.displaySm, color: palette.purple900, textAlign: 'center' },
  subtitle: { ...textStyles.bodyMd, color: palette.gray500, textAlign: 'center', maxWidth: 280 },
  qrCard: { alignItems: 'center', alignSelf: 'center', overflow: 'hidden' },
  qrInner: { alignItems: 'center', justifyContent: 'center' },
  actions: { gap: spacing['2'] },
  skipBtn: { marginTop: spacing['1'] },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.gray300 },
  orText: { ...textStyles.caption, color: palette.gray400 },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['2'],
    marginBottom: spacing['6'],
  },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.gray200 },
  stepDotActive: { width: 24, backgroundColor: palette.pink500 },
});
