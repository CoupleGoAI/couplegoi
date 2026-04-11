import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
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
import type { IoniconName } from '@/domain/insights/types';

interface Props {
    icon: IoniconName;
    tint: string;
    label: string;
    value: string;
    delayMs?: number;
}

export function StatTile({ icon, tint, label, value, delayMs = 0 }: Props): React.ReactElement {
    return (
        <Animated.View entering={FadeInUp.delay(delayMs).duration(460)} style={styles.tile}>
            <View style={[styles.iconWrap, { backgroundColor: tint + '22' }]}>
                <Ionicons name={icon} size={18} color={tint} />
            </View>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    tile: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: radii.radiusMd,
        padding: spacing.md,
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: radii.radiusSm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    value: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.foreground,
    },
    label: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
        color: colors.gray,
    },
});
