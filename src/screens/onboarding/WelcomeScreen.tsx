import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WelcomeScreenProps } from '../../navigation/types';
import GradientButton from '../../components/ui/GradientButton';
import Badge from '../../components/ui/Badge';
import { palette, gradients } from '../../theme/colors';
import { radii, spacing, shadows } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight, textStyles } from '../../theme/typography';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 16, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={gradients.heroWash as any}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top section */}
        <Animated.View style={[styles.topSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Badge label="New · Spring 2025" gradient style={styles.badge} />
          
          {/* Hearts decoration */}
          <View style={styles.heartsRow}>
            <Text style={styles.heartLg}>💕</Text>
          </View>

          <Text style={styles.headline}>Your relationship's</Text>
          <LinearGradient
            colors={gradients.brand as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientTextWrap}
          >
            <Text style={styles.headlineGradient}>secret superpower</Text>
          </LinearGradient>

          <Text style={styles.subtext}>
            AI-powered connection tools for couples who want to grow together — playfully.
          </Text>
        </Animated.View>

        {/* Feature pills */}
        <Animated.View style={[styles.pillsRow, { opacity: fadeAnim }]}>
          {['AI Chat', 'Truth or Dare', 'Date Ideas', 'Love Insights'].map((item) => (
            <View key={item} style={styles.pill}>
              <Text style={styles.pillText}>{item}</Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA section */}
        <Animated.View style={[styles.ctaSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Social proof */}
          <View style={styles.socialProof}>
            <View style={styles.avatarStack}>
              {['💁‍♀️', '🧑‍🤝', '👩‍❤️‍👨'].map((emoji, i) => (
                <View key={i} style={[styles.avatarBubble, { marginLeft: i > 0 ? -8 : 0 }]}>
                  <Text style={{ fontSize: 14 }}>{emoji}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.socialText}>2,400+ couples already connected</Text>
          </View>

          <GradientButton
            label="Get Started →"
            onPress={() => navigation.navigate('CreateAccount')}
            size="lg"
            fullWidth
            style={styles.primaryBtn}
          />
          <GradientButton
            label="I already have a code"
            onPress={() => navigation.navigate('ScanQR')}
            variant="outline"
            size="md"
            fullWidth
          />
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing['5'], gap: spacing['6'] },
  topSection: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing['4'] },
  badge: { alignSelf: 'center' },
  heartsRow: { alignItems: 'center', marginBottom: spacing['2'] },
  heartLg: { fontSize: 52 },
  headline: {
    ...textStyles.displayMd,
    color: palette.purple900,
    textAlign: 'center',
  },
  gradientTextWrap: {
    borderRadius: radii.md,
    marginTop: -spacing['2'],
  },
  headlineGradient: {
    ...textStyles.displayMd,
    color: palette.white,
    textAlign: 'center',
    paddingHorizontal: spacing['3'],
  },
  subtext: {
    ...textStyles.bodyLg,
    color: palette.gray500,
    textAlign: 'center',
    maxWidth: width * 0.78,
    marginTop: spacing['2'],
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing['2'],
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.lavender200,
  },
  pillText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: palette.lavender700,
    fontWeight: fontWeight.medium,
  },
  ctaSection: { gap: spacing['3'], paddingBottom: spacing['4'] },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    marginBottom: spacing['2'],
  },
  avatarStack: { flexDirection: 'row' },
  avatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.lavender100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.white,
  },
  socialText: {
    ...textStyles.bodySm,
    color: palette.gray500,
  },
  primaryBtn: { marginBottom: spacing['1'] },
});
