import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { SlideInLeft } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
    colors,
    radii,
    spacing,
    shadows,
    fontFamilies,
    fontSize,
    fontWeight,
    textStyles,
} from '@/theme/tokens';

interface Props {
    days: number | null;
    delayMs?: number;
}

export function DaysTogetherCard({ days, delayMs = 180 }: Props): React.ReactElement {
    return (
        <Animated.View entering={SlideInLeft.delay(delayMs).duration(520)} style={styles.card}>
            <View style={styles.iconWrap}>
                <Ionicons name="heart" size={22} color={colors.primary} />
            </View>
            <Text style={styles.label}>Together</Text>
            <Text style={styles.count}>
                {days ?? '—'}
                <Text style={styles.unit}> days</Text>
            </Text>
            <Text style={styles.sub}>{days !== null ? 'And counting' : 'Set a start date'}</Text>
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
        gap: spacing.xs,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: radii.radiusFull,
        backgroundColor: colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
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
    },
});
