import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ConnectionConfirmedScreenProps } from '../../navigation/types';
import GradientButton from '../../components/ui/GradientButton';
import Avatar from '../../components/ui/Avatar';
import { useAppStore } from '../../store/appStore';
import { palette, gradients } from '../../theme/colors';
import { radii, spacing, shadows } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight, textStyles } from '../../theme/typography';

export default function ConnectionConfirmedScreen({ navigation }: ConnectionConfirmedScreenProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);
  const setOnboarded = useAppStore((s) => s.setOnboarded);

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, damping: 12, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient colors={gradients.ctaPanel as any} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
        >
          {/* Connection ring */}
          <Animated.View style={[styles.connectionRing, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.avatarRow}>
              <Avatar name={currentUser?.name ?? 'You'} size="xl" style={shadows.lg} />
              <View style={styles.heartCenter}>
                <Text style={styles.heartEmoji}>💕</Text>
              </View>
              <Avatar name={partner?.name ?? 'Partner'} size="xl" style={shadows.lg} />
            </View>
          </Animated.View>

          <Text style={styles.title}>You're connected! 🎉</Text>

          <Text style={styles.names}>
            {currentUser?.name ?? 'You'} & {partner?.name ?? 'Your partner'}
          </Text>

          <Text style={styles.subtitle}>
            Ready to explore your relationship together? Start chatting with your AI guide or play a quick game.
          </Text>

          {/* Feature pills */}
          <View style={styles.featuresGrid}>
            {[
              { emoji: '💬', label: 'AI Chat' },
              { emoji: '🎲', label: 'Truth or Dare' },
              { emoji: '🗓️', label: 'Date Ideas' },
              { emoji: '💫', label: 'Daily Tips' },
            ].map((f) => (
              <View key={f.label} style={styles.featurePill}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <GradientButton
          label="Enter the app →"
          onPress={() => setOnboarded(true)}
          size="lg"
          fullWidth
          style={styles.enterBtn}
          labelStyle={{ color: palette.pink600 }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: spacing['5'],
    gap: spacing['6'],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['5'],
  },
  connectionRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  heartCenter: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  heartEmoji: { fontSize: 20 },
  title: {
    ...textStyles.displaySm,
    color: palette.white,
    textAlign: 'center',
  },
  names: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: fontSize.base * 1.6,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['3'],
    justifyContent: 'center',
    marginTop: spacing['2'],
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  featureEmoji: { fontSize: 16 },
  featureLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: palette.white,
    fontWeight: fontWeight.semibold,
  },
  enterBtn: {
    marginBottom: spacing['4'],
    backgroundColor: palette.white,
  },
});
