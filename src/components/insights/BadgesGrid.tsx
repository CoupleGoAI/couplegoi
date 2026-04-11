import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
    colors,
    radii,
    spacing,
    shadows,
    fontFamilies,
    fontSize,
    fontWeight,
} from '@/theme/tokens';
import type { Badge } from '@/domain/insights/types';

interface Props {
    badges: ReadonlyArray<Badge>;
    delayMs?: number;
}

export function BadgesGrid({ badges, delayMs = 320 }: Props): React.ReactElement {
    return (
        <View style={styles.wrap}>
            <Animated.Text
                entering={FadeInRight.delay(delayMs).duration(460)}
                style={styles.heading}
            >
                Badges
            </Animated.Text>
            <View style={styles.grid}>
                {badges.map((b, i) => (
                    <Animated.View
                        key={b.id}
                        entering={FadeInRight.delay(delayMs + 80 + i * 70).duration(500)}
                        style={[styles.chip, !b.unlocked && styles.chipLocked]}
                    >
                        <View
                            style={[
                                styles.chipIcon,
                                { backgroundColor: b.unlocked ? colors.muted : colors.accentSoft },
                            ]}
                        >
                            <Ionicons
                                name={b.icon}
                                size={18}
                                color={b.unlocked ? colors.primary : colors.gray}
                            />
                        </View>
                        <View style={styles.chipText}>
                            <Text
                                style={[styles.chipTitle, !b.unlocked && styles.chipTitleLocked]}
                                numberOfLines={1}
                            >
                                {b.title}
                            </Text>
                            <Text style={styles.chipDesc} numberOfLines={2}>
                                {b.description}
                            </Text>
                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${Math.round(b.progress * 100)}%`,
                                            backgroundColor: b.unlocked
                                                ? colors.primary
                                                : colors.accentLight,
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    </Animated.View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: spacing.md },
    heading: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.foreground,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        width: '48%',
        backgroundColor: colors.background,
        borderRadius: radii.radiusMd,
        padding: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    chipLocked: { opacity: 0.72 },
    chipIcon: {
        width: 36,
        height: 36,
        borderRadius: radii.radiusFull,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipText: { flex: 1, gap: 2 },
    chipTitle: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.foreground,
    },
    chipTitleLocked: { color: colors.foregroundMuted },
    chipDesc: {
        fontFamily: fontFamilies.sans,
        fontSize: 11,
        color: colors.gray,
    },
    progressTrack: {
        marginTop: spacing.xs,
        height: 4,
        borderRadius: radii.radiusFull,
        backgroundColor: colors.accentSoft,
        overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: radii.radiusFull },
});
