import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, spacing, fontFamilies, fontSize, fontWeight, letterSpacing } from '@/theme/tokens';

type BadgeVariant = 'brand' | 'success' | 'warning' | 'info' | 'neutral' | 'pink' | 'purple';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    gradient?: boolean;
    style?: ViewStyle;
}

export default function Badge({ label, variant = 'neutral', gradient = false, style }: BadgeProps) {
    if (gradient) {
        return (
            <LinearGradient
                colors={gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.base, style]}
            >
                <Text style={[styles.label, styles.labelLight]}>{label}</Text>
            </LinearGradient>
        );
    }

    const variantStyle = VARIANT_STYLES[variant];
    return (
        <View style={[styles.base, variantStyle.container, style]}>
            <Text style={[styles.label, variantStyle.label]}>{label}</Text>
        </View>
    );
}

const VARIANT_STYLES = {
    brand: {
        container: { backgroundColor: colors.muted },
        label: { color: colors.primary },
    },
    success: {
        container: { backgroundColor: colors.successBg },
        label: { color: colors.successText },
    },
    warning: {
        container: { backgroundColor: colors.warningBg },
        label: { color: colors.warningText },
    },
    info: {
        container: { backgroundColor: colors.infoBg },
        label: { color: colors.infoText },
    },
    neutral: {
        container: { backgroundColor: colors.muted },
        label: { color: colors.foregroundMuted },
    },
    pink: {
        container: { backgroundColor: colors.muted },
        label: { color: colors.primary },
    },
    purple: {
        container: { backgroundColor: colors.accentSoft },
        label: { color: colors.foregroundMuted },
    },
};

const styles = StyleSheet.create({
    base: {
        borderRadius: radii.radiusFull,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        alignSelf: 'flex-start',
    },
    label: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        letterSpacing: letterSpacing.wide,
    },
    labelLight: {
        color: colors.white,
    },
});
