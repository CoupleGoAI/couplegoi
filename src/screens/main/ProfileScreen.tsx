import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ProfileScreenProps } from '../../navigation/types';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import Divider from '../../components/ui/Divider';
import { useAppStore } from '../../store/appStore';
import { palette, gradients, light } from '../../theme/colors';
import { radii, spacing, shadows, layout } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight, textStyles } from '../../theme/typography';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingRowProps {
  icon: IoniconName;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, label, value, toggle, toggleValue, onToggle, onPress, danger }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={toggle ? 1 : 0.7}
      disabled={toggle && !onPress}
    >
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? palette.error : palette.pink500} />
      </View>
      <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: palette.gray200, true: palette.pink300 }}
            thumbColor={toggleValue ? palette.pink500 : palette.white}
          />
        ) : (
          !value && <Ionicons name="chevron-forward" size={16} color={palette.gray400} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const partner = useAppStore((s) => s.partner);
  const couple = useAppStore((s) => s.couple);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const setColorScheme = useAppStore((s) => s.setColorScheme);
  const reset = useAppStore((s) => s.reset);

  const handleLogout = () => {
    Alert.alert(
      'Disconnect & Log Out',
      'Are you sure? Your connection data will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => reset(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={gradients.heroWash as any}
          style={styles.profileHeader}
        >
          {/* Couple avatars */}
          <View style={styles.coupleAvatars}>
            <View style={styles.avatarWrap}>
              <Avatar name={currentUser?.name ?? 'You'} size="xl" gradient />
              <Text style={styles.avatarLabel}>{currentUser?.name ?? 'You'}</Text>
            </View>
            <View style={styles.heartWrap}>
              <Text style={styles.heartEmoji}>💕</Text>
              <Text style={styles.streakText}>{couple?.streakDays ?? 0} days</Text>
            </View>
            <View style={styles.avatarWrap}>
              <Avatar name={partner?.name ?? '?'} size="xl" gradient showOnline isOnline={partner?.isOnline} />
              <Text style={styles.avatarLabel}>{partner?.name ?? 'Partner'}</Text>
            </View>
          </View>

          {/* Connected since */}
          <View style={styles.connectedBadge}>
            <Text style={styles.connectedText}>
              Connected since {couple ? new Date(couple.connectedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'just now'}
            </Text>
          </View>
        </LinearGradient>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Day Streak', value: `${couple?.streakDays ?? 0} 🔥` },
            { label: 'Games Played', value: '12 🎲' },
            { label: 'AI Chats', value: '34 💬' },
          ].map((stat) => (
            <Card key={stat.label} style={styles.statCard} shadow="sm">
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        {/* ── Settings sections ── */}
        <Card shadow="sm" padding="2">
          <Text style={styles.sectionHeader}>Account</Text>
          <SettingRow icon="person-outline" label="Your name" value={currentUser?.name ?? '—'} />
          <Divider light />
          <SettingRow icon="heart-outline" label="Partner" value={partner?.name ?? '—'} />
          <Divider light />
          <SettingRow icon="qr-code-outline" label="Your invite code" onPress={() => {}} />
        </Card>

        <Card shadow="sm" padding="2">
          <Text style={styles.sectionHeader}>Preferences</Text>
          <SettingRow
            icon="moon-outline"
            label="Dark mode"
            toggle
            toggleValue={colorScheme === 'dark'}
            onToggle={(v) => setColorScheme(v ? 'dark' : 'light')}
          />
          <Divider light />
          <SettingRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
          <Divider light />
          <SettingRow icon="language-outline" label="Language" value="English" />
        </Card>

        <Card shadow="sm" padding="2">
          <Text style={styles.sectionHeader}>About</Text>
          <SettingRow icon="information-circle-outline" label="How it works" onPress={() => {}} />
          <Divider light />
          <SettingRow icon="star-outline" label="Rate CoupleGoAI" onPress={() => {}} />
          <Divider light />
          <SettingRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => {}} />
        </Card>

        <Card shadow="sm" padding="2">
          <SettingRow
            icon="log-out-outline"
            label="Log out & disconnect"
            onPress={handleLogout}
            danger
          />
        </Card>

        <Text style={styles.versionText}>CoupleGoAI v1.0.0 · Made with 💕</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: light.bgPrimary },
  scroll: {
    gap: spacing['4'],
    paddingBottom: layout.tabBarHeight + spacing['10'],
  },
  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingTop: spacing['6'],
    paddingBottom: spacing['6'],
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing['5'],
  },
  coupleAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['4'],
  },
  avatarWrap: { alignItems: 'center', gap: spacing['2'] },
  avatarLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: palette.purple900,
  },
  heartWrap: { alignItems: 'center', gap: spacing['1'] },
  heartEmoji: { fontSize: 32 },
  streakText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray500,
    fontWeight: fontWeight.medium,
  },
  connectedBadge: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.lavender200,
  },
  connectedText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.lavender700,
    fontWeight: fontWeight.medium,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing['3'],
    paddingHorizontal: layout.screenPaddingH,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing['1'],
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['4'],
  },
  statValue: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: palette.purple900,
  },
  statLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray500,
    textAlign: 'center',
  },
  // Settings sections (no horizontal padding on scroll, cards handle it)
  sectionHeader: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: palette.pink500,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['3'],
    paddingBottom: spacing['1'],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    gap: spacing['3'],
    minHeight: layout.minTapTarget,
  },
  settingIcon: {
    width: 34,
    height: 34,
    backgroundColor: palette.pink50,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: {
    backgroundColor: '#FEE2E2',
  },
  settingLabel: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    color: palette.purple900,
    fontWeight: fontWeight.regular,
  },
  settingLabelDanger: {
    color: palette.error,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },
  settingValue: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: palette.gray400,
  },
  versionText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: palette.gray400,
    textAlign: 'center',
    paddingBottom: spacing['4'],
  },
});
