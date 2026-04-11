import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
import type { StreakInfo } from '@/domain/insights/types';

interface Props {
    streak: StreakInfo;
    reduceMotion: boolean;
    delayMs?: number;
}

export function StreakCard({ streak, reduceMotion, delayMs = 120 }: Props): React.ReactElement {
    const haloScale = useSharedValue(1);
    const numberScale = useSharedValue(reduceMotion ? 1 : 0.6);

    useEffect(() => {
        if (reduceMotion) return;
        haloScale.value = withRepeat(
            withSequence(
                withTiming(1.08, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
                withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
            ),
            -1,
            false,
        );
        numberScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.6)) });
    }, [haloScale, numberScale, reduceMotion]);

    const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: haloScale.value }] }));
    const numStyle = useAnimatedStyle(() => ({ transform: [{ scale: numberScale.value }] }));

    return (
        <Animated.View entering={FadeInDown.delay(delayMs).duration(480)} style={styles.card}>
            <View style={styles.row}>
                <View style={styles.iconWrap}>
                    <Animated.View style={[styles.halo, haloStyle]} />
                    <LinearGradient
                        colors={gradients.brand}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                    >
                        <Ionicons name="sparkles" size={22} color={colors.white} />
                    </LinearGradient>
                </View>
                <View style={styles.text}>
                    <Text style={styles.label}>Spark streak</Text>
                    <Animated.Text style={[styles.count, numStyle]}>
                        {streak.current}
                        <Text style={styles.unit}> days</Text>
                    </Animated.Text>
                    <Text style={styles.sub}>Longest: {streak.longest}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: radii.radius,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    iconWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
    halo: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: radii.radiusFull,
        backgroundColor: colors.primary,
        opacity: 0.18,
    },
    iconGradient: {
        width: 44,
        height: 44,
        borderRadius: radii.radiusFull,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: { flex: 1 },
    label: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: colors.gray,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    count: {
        ...textStyles.h1,
        color: colors.foreground,
        marginTop: 2,
    },
    unit: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.gray,
    },
    sub: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        color: colors.foregroundMuted,
        marginTop: 2,
    },
});
