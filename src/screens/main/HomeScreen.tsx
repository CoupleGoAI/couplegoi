import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { HomeScreenProps } from '../../navigation/types';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { useAppStore } from '../../store/appStore';
import { palette, gradients, light } from '../../theme/colors';
import { radii, spacing, shadows, layout } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight, textStyles } from '../../theme/typography';

const { width } = Dimensions.get('window');

const DAILY_SUGGESTION = "Ask each other: What's one thing I did this week that you really appreciated? 💕";

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);
  const couple = useAppStore((s) => s.couple);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 18, useNativeDriver: true }),
    ]).start();
  }, []);

  const firstName = currentUser?.name?.split(' ')[0] ?? 'Hey';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Header ── */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.name}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={palette.purple900} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Partner status card ── */}
        {partner && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <LinearGradient
              colors={gradients.brand as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.partnerCard}
            >
              <View style={styles.partnerCardContent}>
                <Avatar
                  name={partner.name}
                  size="md"
                  showOnline
                  isOnline={partner.isOnline}
                  gradient={false}
                />
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  <Text style={styles.partnerStatus}>
                    {partner.isOnline ? '🟢 Online now' : '⚫ Last seen just now'}
                  </Text>
                </View>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={styles.streakCount}>{couple?.streakDays ?? 0}</Text>
                  <Text style={styles.streakLabel}>day streak</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ── Section label ── */}
        <Text style={styles.sectionLabel}>WHAT DO YOU WANT TO DO?</Text>

        {/* ── Main action cards ── */}
        <Animated.View style={[styles.actionGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Chat card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardLarge]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Chat')}
          >
            <LinearGradient
              colors={['#FFF0F6', '#F3E8FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionCardGradient}
            >
              <View style={styles.actionIconWrap}>
                <Text style={styles.actionEmoji}>💬</Text>
              </View>
              <Text style={styles.actionTitle}>AI Chat</Text>
              <Text style={styles.actionSubtitle}>
                Talk together with your AI relationship guide
              </Text>
              <View style={styles.actionArrow}>
                <Ionicons name="arrow-forward" size={16} color={palette.pink500} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Dare card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardLarge]}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Game')}
          >
            <LinearGradient
              colors={['#FFF7ED', '#F3E8FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionCardGradient}
            >
              <View style={styles.actionIconWrap}>
                <Text style={styles.actionEmoji}>🎲</Text>
              </View>
              <Text style={styles.actionTitle}>Truth or Dare</Text>
              <Text style={styles.actionSubtitle}>
                Play synced mini-games with your partner
              </Text>
              <View style={styles.actionArrow}>
                <Ionicons name="arrow-forward" size={16} color={palette.lavender600} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Quick actions row ── */}
        <View style={styles.quickRow}>
          {[
            { icon: '🗓️', label: 'Date Ideas' },
            { icon: '💌', label: 'Love Notes' },
            { icon: '🎯', label: 'Challenges' },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.quickAction} activeOpacity={0.8}>
              <View style={styles.quickIconWrap}>
                <Text style={styles.quickEmoji}>{item.icon}</Text>
              </View>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Daily suggestion ── */}
        <Card style={styles.suggestionCard} shadow="sm">
          <View style={styles.suggestionHeader}>
            <Badge label="DAILY SPARK" variant="pink" />
          </View>
          <Text style={styles.suggestionText}>{DAILY_SUGGESTION}</Text>
          <TouchableOpacity style={styles.suggestionBtn}>
            <Text style={styles.suggestionBtnText}>Try this together →</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: light.bgPrimary,
  },
  scroll: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: layout.tabBarHeight + spacing['10'],
    gap: spacing['5'],
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: spacing['4'],
  },
  headerLeft: { gap: spacing['0.5'] },
  greeting: {
    ...textStyles.bodyMd,
    color: palette.gray500,
  },
  name: {
    ...textStyles.displaySm,
    color: palette.purple900,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.xl,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    position: 'relative',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.pink500,
    position: 'absolute',
    top: 10,
    right: 10,
    borderWidth: 1.5,
    borderColor: palette.white,
  },
  // Partner card
  partnerCard: {
    borderRadius: radii['2xl'],
    padding: spacing['4'],
    ...shadows.brand,
  },
  partnerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  partnerInfo: { flex: 1, gap: spacing['0.5'] },
  partnerName: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: palette.white,
  },
  partnerStatus: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  streakBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii['2xl'],
    padding: spacing['3'],
    minWidth: 64,
  },
  streakEmoji: { fontSize: 20 },
  streakCount: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: palette.white,
  },
  streakLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  // Section label
  sectionLabel: {
    ...textStyles.labelSm,
    color: palette.pink500,
  },
  // Action grid
  actionGrid: {
    flexDirection: 'row',
    gap: spacing['3'],
  },
  actionCard: {
    flex: 1,
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    ...shadows.md,
  },
  actionCardLarge: {},
  actionCardGradient: {
    padding: spacing['5'],
    gap: spacing['3'],
    minHeight: 180,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: { fontSize: 26 },
  actionTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: palette.purple900,
  },
  actionSubtitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: palette.gray500,
    lineHeight: fontSize.sm * 1.5,
    flex: 1,
  },
  actionArrow: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: spacing['3'],
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing['2'],
  },
  quickIconWrap: {
    width: 56,
    height: 56,
    backgroundColor: palette.white,
    borderRadius: radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: light.borderLight,
  },
  quickEmoji: { fontSize: 24 },
  quickLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray600,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  // Daily suggestion
  suggestionCard: { gap: spacing['3'] },
  suggestionHeader: {},
  suggestionText: {
    ...textStyles.bodyMd,
    color: palette.purple900,
    lineHeight: fontSize.base * 1.6,
    fontStyle: 'italic',
  },
  suggestionBtn: {},
  suggestionBtnText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: palette.pink500,
    fontWeight: fontWeight.semibold,
  },
});
