import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useHaptics } from '@hooks/useHaptics';
import type { PlayScreenNavProp } from '@navigation/types';
import { colors, gradients, radii, spacing, shadows, fontFamilies, fontSize, fontWeight } from '@/theme/tokens';

interface GameCard {
    route: 'GameWouldYouRather' | 'GameThisOrThat' | 'GameLoveCheckIn';
    emoji: string;
    title: string;
    tagline: string;
    description: string;
    duration: string;
    gradient: [string, string];
}

const GAMES: readonly GameCard[] = [
    {
        route: 'GameWouldYouRather',
        emoji: '💬',
        title: 'Would You Rather?',
        tagline: 'Values & Conversations',
        description: 'Answer relationship dilemmas and discover how you think alike — or spark a great talk.',
        duration: '~10 min',
        gradient: [colors.primary, colors.primaryLight],
    },
    {
        route: 'GameThisOrThat',
        emoji: '⚡',
        title: 'This or That',
        tagline: 'Quick-Fire Fun',
        description: 'Pick your favourite from 10 pairs and see your compatibility score at the end.',
        duration: '~5 min',
        gradient: [colors.accent, colors.accentLight],
    },
    {
        route: 'GameLoveCheckIn',
        emoji: '💝',
        title: 'Love Check-In',
        tagline: 'Daily Connection',
        description: 'Write heartfelt answers to 3 prompts, then reveal them to each other together.',
        duration: '~8 min',
        gradient: [colors.primary, colors.accent],
    },
];

export function GamesScreen(): React.ReactElement {
    const navigation = useNavigation<PlayScreenNavProp>();
    const haptics = useHaptics();

    const handlePress = useCallback((route: GameCard['route']) => {
        void haptics.medium();
        navigation.navigate(route);
    }, [haptics, navigation]);

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient colors={gradients.heroWash} style={StyleSheet.absoluteFill} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} />
            <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(60).duration(400)}>
                    <Text style={styles.heading}>Play Together</Text>
                    <Text style={styles.subheading}>Games that bring you closer</Text>
                </Animated.View>

                {GAMES.map((game, i) => (
                    <Animated.View key={game.route} entering={FadeInDown.delay(120 + i * 80).duration(400)}>
                        <TouchableOpacity style={styles.card} activeOpacity={0.82} onPress={() => handlePress(game.route)}>
                            <View style={styles.cardTop}>
                                <LinearGradient colors={game.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emojiWrap}>
                                    <Text style={styles.emoji}>{game.emoji}</Text>
                                </LinearGradient>
                                <View style={styles.cardMeta}>
                                    <Text style={styles.tagline}>{game.tagline}</Text>
                                    <Text style={styles.cardTitle}>{game.title}</Text>
                                </View>
                                <Text style={styles.duration}>{game.duration}</Text>
                            </View>
                            <Text style={styles.cardDesc}>{game.description}</Text>
                            <View style={styles.playRow}>
                                <Text style={styles.playLabel}>Play now</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}

                <View style={styles.bottomPad} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    container: { paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'] },
    heading: { fontFamily: fontFamilies.sans, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground, paddingTop: spacing.xl },
    subheading: { fontFamily: fontFamilies.sans, fontSize: fontSize.base, color: colors.gray, marginTop: spacing.xs, marginBottom: spacing.xl },
    card: {
        backgroundColor: colors.background,
        borderRadius: radii.radius,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.md,
        gap: spacing.md,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    emojiWrap: { width: 52, height: 52, borderRadius: radii.radiusMd, alignItems: 'center', justifyContent: 'center' },
    emoji: { fontSize: 26 },
    cardMeta: { flex: 1, gap: spacing.xs },
    tagline: { fontFamily: fontFamilies.sans, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.8 },
    cardTitle: { fontFamily: fontFamilies.sans, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.foreground },
    duration: { fontFamily: fontFamilies.sans, fontSize: fontSize.xs, color: colors.gray },
    cardDesc: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, color: colors.foregroundMuted, lineHeight: 20 },
    playRow: { alignItems: 'flex-end' },
    playLabel: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
    bottomPad: { height: spacing['2xl'] },
});
