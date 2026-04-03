import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAuthStore } from '@store/authStore';
import { useAuth } from '@hooks/useAuth';
import { DevMenu } from '@components/ui/DevMenu';
import { fetchPartnerInfo } from '@/data/coupleChatApi';
import type { PartnerInfo } from '@/data/coupleChatApi';
import type { NestScreenNavProp } from '@navigation/types';
import {
    colors,
    gradients,
    radii,
    spacing,
    shadows,
    fontFamilies,
    fontSize,
    fontWeight,
    textStyles,
} from '@/theme/tokens';

function timeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function formatTogetherSince(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `Together since ${d.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
}

interface QuickLink {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}

const QUICK_LINKS: readonly QuickLink[] = [
    { label: 'Chat',    icon: 'chatbubble-ellipses-outline', color: colors.primary },
    { label: 'Games',   icon: 'game-controller-outline',     color: colors.accent },
    { label: 'Us',      icon: 'people-outline',              color: colors.accent },
    { label: 'Profile', icon: 'person-outline',              color: colors.primary },
];

interface AvatarCircleProps {
    uri: string | null;
    initial: string | null;
    size: number;
}

function AvatarCircle({ uri, initial, size }: AvatarCircleProps): React.ReactElement {
    return (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
            {uri ? (
                <Image
                    source={{ uri }}
                    style={{ width: size, height: size, borderRadius: size / 2 }}
                />
            ) : (
                <Text style={[styles.avatarInitial, { fontSize: size * 0.38 }]}>
                    {initial?.charAt(0).toUpperCase() ?? '?'}
                </Text>
            )}
        </View>
    );
}

export function HomeScreen(): React.ReactElement {
    const navigation = useNavigation<NestScreenNavProp>();
    const user = useAuthStore((s) => s.user);
    const setPairingSkipped = useAuthStore((s) => s.setPairingSkipped);
    const firstName = user?.name?.split(' ')[0] ?? null;
    const { signOut } = useAuth();
    const [isDevMenuVisible, setIsDevMenuVisible] = useState(false);
    const [partner, setPartner] = useState<PartnerInfo | null>(null);

    const handleDevSignOut = useCallback(async () => {
        setIsDevMenuVisible(false);
        await signOut();
    }, [signOut]);

    const nameOpacity = useSharedValue(0.7);
    const nameAnimStyle = useAnimatedStyle(() => ({
        opacity: nameOpacity.value,
    }));

    useEffect(() => {
        nameOpacity.value = withTiming(1, { duration: 800 });
    }, [nameOpacity]);

    useEffect(() => {
        if (!user?.coupleId || !user.id) return;
        void fetchPartnerInfo(user.coupleId, user.id).then((result) => {
            if (result.ok) setPartner(result.data);
        });
    }, [user?.coupleId, user?.id]);

    const togetherSince = formatTogetherSince(user?.datingStartDate ?? null);

    function handleQuickLink(label: string): void {
        switch (label) {
            case 'Chat':    navigation.navigate('AiChat'); break;
            case 'Games':   navigation.navigate('Play'); break;
            case 'Us':      navigation.navigate('Us'); break;
            case 'Profile': navigation.navigate('Profile'); break;
        }
    }

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient
                colors={gradients.heroWash}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* Greeting */}
                <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.greetingRow}>
                    <View>
                        <Text style={styles.greetingLabel}>{timeGreeting()}</Text>
                        {firstName !== null && (
                            <TouchableOpacity
                                activeOpacity={__DEV__ ? 0.7 : 1}
                                onPress={() => { if (__DEV__) setIsDevMenuVisible(true); }}
                            >
                                <Animated.Text style={[styles.greetingName, nameAnimStyle]}>
                                    {firstName}
                                </Animated.Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>

                {/* Couple card — only when connected */}
                {user?.coupleId !== null && user?.coupleId !== undefined ? (
                    <Animated.View entering={FadeInDown.delay(140).duration(420)} style={styles.coupleCard}>
                        <View style={styles.avatarRow}>
                            <View style={styles.avatarWrap}>
                                <AvatarCircle
                                    uri={user?.avatarUrl ?? null}
                                    initial={user?.name ?? null}
                                    size={56}
                                />
                                <Text style={styles.avatarName} numberOfLines={1}>
                                    {user?.name?.split(' ')[0] ?? 'You'}
                                </Text>
                            </View>

                            <View style={styles.heartWrap}>
                                <LinearGradient
                                    colors={gradients.brand}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.heartGradient}
                                >
                                    <Ionicons name="heart" size={18} color={colors.white} />
                                </LinearGradient>
                            </View>

                            <View style={styles.avatarWrap}>
                                <AvatarCircle
                                    uri={partner?.avatarUrl ?? null}
                                    initial={partner?.name ?? null}
                                    size={56}
                                />
                                <Text style={styles.avatarName} numberOfLines={1}>
                                    {partner?.name?.split(' ')[0] ?? '...'}
                                </Text>
                            </View>
                        </View>

                        {togetherSince !== null && (
                            <Text style={styles.togetherSince}>{togetherSince}</Text>
                        )}
                    </Animated.View>
                ) : (
                    /* Pair CTA — when not yet connected */
                    <Animated.View entering={FadeInDown.delay(140).duration(420)}>
                        <TouchableOpacity
                            style={styles.pairPill}
                            activeOpacity={0.82}
                            onPress={() => setPairingSkipped(false)}
                        >
                            <View style={styles.pairIconWrap}>
                                <Ionicons name="heart" size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.pairLabel}>Pair with your partner</Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Quick links */}
                <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.quickRow}>
                    {QUICK_LINKS.map((link) => (
                        <TouchableOpacity
                            key={link.label}
                            style={styles.quickCard}
                            activeOpacity={0.8}
                            onPress={() => handleQuickLink(link.label)}
                        >
                            <View style={[styles.quickIcon, { backgroundColor: link.color + '22' }]}>
                                <Ionicons name={link.icon} size={22} color={link.color} />
                            </View>
                            <Text style={styles.quickLabel}>{link.label}</Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>

                <View style={styles.bottomPad} />
            </ScrollView>

            <DevMenu
                visible={isDevMenuVisible}
                onClose={() => setIsDevMenuVisible(false)}
                onSignOut={() => { void handleDevSignOut(); }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    container: { paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'] },
    greetingRow: { paddingTop: spacing.xl, marginBottom: spacing.xl },
    greetingLabel: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.gray,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    greetingName: {
        ...textStyles.displaySm,
        color: colors.foreground,
        marginTop: spacing.xs,
    },
    coupleCard: {
        backgroundColor: colors.background,
        borderRadius: radii.radius,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.md,
        marginBottom: spacing.xl,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
    },
    avatarWrap: {
        alignItems: 'center',
        gap: spacing.xs,
        width: 72,
    },
    avatar: {
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.borderLight,
    },
    avatarInitial: {
        fontFamily: fontFamilies.sans,
        fontWeight: fontWeight.bold,
        color: colors.accent,
    },
    avatarName: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.foregroundMuted,
        textAlign: 'center',
    },
    heartWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartGradient: {
        width: 36,
        height: 36,
        borderRadius: radii.radiusFull,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.glowPrimary,
    },
    togetherSince: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.gray,
        textAlign: 'center',
    },
    pairPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.muted,
        borderRadius: radii.radiusFull,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.primaryLight,
        gap: spacing.md,
        ...shadows.sm,
    },
    pairIconWrap: {
        width: 36,
        height: 36,
        borderRadius: radii.radiusFull,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    pairLabel: {
        flex: 1,
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.medium,
        color: colors.primary,
    },
    quickRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    quickCard: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: radii.radiusMd,
        paddingVertical: spacing.md,
        alignItems: 'center',
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    quickIcon: {
        width: 44,
        height: 44,
        borderRadius: radii.radiusMd,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLabel: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
        color: colors.foregroundMuted,
    },
    bottomPad: { height: spacing['2xl'] },
});
