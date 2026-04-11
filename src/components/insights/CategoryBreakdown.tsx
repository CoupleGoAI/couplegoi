import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    FadeInRight,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import {
    colors,
    radii,
    spacing,
    shadows,
    fontFamilies,
    fontSize,
    fontWeight,
} from '@/theme/tokens';
import type { CategoryStat } from '@/domain/insights/types';

const PALETTE = [colors.primary, colors.accent, colors.accentWarm, colors.primaryLight] as const;

interface SegmentProps {
    pct: number;
    color: string;
    delayMs: number;
    reduceMotion: boolean;
}

function Segment({ pct, color, delayMs, reduceMotion }: SegmentProps): React.ReactElement {
    const flex = useSharedValue(reduceMotion ? pct : 0);
    useEffect(() => {
        if (reduceMotion) return;
        flex.value = withTiming(pct, {
            duration: 700,
            easing: Easing.out(Easing.cubic),
        });
    }, [pct, flex, reduceMotion]);
    const style = useAnimatedStyle(() => ({ flex: Math.max(0.0001, flex.value) }));
    return (
        <Animated.View
            entering={FadeInRight.delay(delayMs).duration(500)}
            style={[styles.segment, { backgroundColor: color }, style]}
        />
    );
}

interface Props {
    categories: ReadonlyArray<CategoryStat>;
    delayMs?: number;
    reduceMotion: boolean;
}

export function CategoryBreakdown({ categories, delayMs = 260, reduceMotion }: Props): React.ReactElement {
    if (categories.length === 0) {
        return (
            <Animated.View entering={FadeInRight.delay(delayMs).duration(500)} style={styles.card}>
                <Text style={styles.title}>Game mix</Text>
                <Text style={styles.empty}>Play your first game to fill this chart.</Text>
            </Animated.View>
        );
    }

    return (
        <Animated.View entering={FadeInRight.delay(delayMs).duration(500)} style={styles.card}>
            <Text style={styles.title}>Game mix</Text>
            <View style={styles.bar}>
                {categories.map((c, i) => (
                    <Segment
                        key={c.gameType}
                        pct={c.pct}
                        color={PALETTE[i % PALETTE.length]}
                        delayMs={delayMs + 60 + i * 80}
                        reduceMotion={reduceMotion}
                    />
                ))}
            </View>
            <View style={styles.legend}>
                {categories.map((c, i) => (
                    <View key={c.gameType} style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: PALETTE[i % PALETTE.length] }]} />
                        <Text style={styles.legendLabel} numberOfLines={1}>
                            {c.label}
                        </Text>
                        <Text style={styles.legendCount}>{c.count}</Text>
                    </View>
                ))}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background,
        borderRadius: radii.radius,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
        gap: spacing.md,
    },
    title: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.foreground,
    },
    bar: {
        flexDirection: 'row',
        height: 14,
        borderRadius: radii.radiusFull,
        overflow: 'hidden',
        backgroundColor: colors.accentSoft,
    },
    segment: { height: '100%' },
    legend: { gap: spacing.xs },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    dot: { width: 10, height: 10, borderRadius: radii.radiusFull },
    legendLabel: {
        flex: 1,
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        color: colors.foregroundMuted,
    },
    legendCount: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.foreground,
    },
    empty: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        color: colors.gray,
    },
});
