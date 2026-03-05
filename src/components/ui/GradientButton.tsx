import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, shadows, spacing, fontFamilies, fontSize, fontWeight, letterSpacing } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GradientButtonProps {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
    labelStyle?: TextStyle;
    fullWidth?: boolean;
}

export default function GradientButton({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    style,
    labelStyle,
    fullWidth = false,
}: GradientButtonProps) {
    const sizeStyles = SIZE_STYLES[size];
    const isDisabled = disabled || loading;

    if (variant === 'primary') {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.85}
                style={[styles.wrapper, fullWidth && styles.fullWidth, style]}
            >
                <LinearGradient
                    colors={isDisabled ? gradients.disabled : gradients.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.gradient, sizeStyles.container, isDisabled && styles.disabled]}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                        <>
                            {icon}
                            <Text style={[styles.labelPrimary, sizeStyles.label, labelStyle]}>{label}</Text>
                        </>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    if (variant === 'secondary') {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.8}
                style={[
                    styles.wrapper,
                    styles.secondaryContainer,
                    sizeStyles.container,
                    fullWidth && styles.fullWidth,
                    isDisabled && styles.disabled,
                    style,
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={colors.foregroundMuted} size="small" />
                ) : (
                    <>
                        {icon}
                        <Text style={[styles.labelSecondary, sizeStyles.label, labelStyle]}>{label}</Text>
                    </>
                )}
            </TouchableOpacity>
        );
    }

    if (variant === 'outline') {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.8}
                style={[
                    styles.wrapper,
                    styles.outlineContainer,
                    sizeStyles.container,
                    fullWidth && styles.fullWidth,
                    isDisabled && styles.disabled,
                    style,
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                    <>
                        {icon}
                        <Text style={[styles.labelOutline, sizeStyles.label, labelStyle]}>{label}</Text>
                    </>
                )}
            </TouchableOpacity>
        );
    }

    // ghost
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.7}
            style={[
                styles.wrapper,
                styles.ghostContainer,
                sizeStyles.container,
                fullWidth && styles.fullWidth,
                isDisabled && styles.disabled,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={colors.gray} size="small" />
            ) : (
                <>
                    {icon}
                    <Text style={[styles.labelGhost, sizeStyles.label, labelStyle]}>{label}</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const SIZE_STYLES = {
    sm: {
        container: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, height: 36 },
        label: { fontSize: fontSize.sm },
    },
    md: {
        container: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, height: 48 },
        label: { fontSize: fontSize.base },
    },
    lg: {
        container: { paddingHorizontal: spacing['2xl'], paddingVertical: spacing.lg, height: 56 },
        label: { fontSize: fontSize.md },
    },
};

const styles = StyleSheet.create({
    wrapper: {
        alignSelf: 'flex-start',
    },
    fullWidth: {
        alignSelf: 'stretch',
    },
    gradient: {
        borderRadius: radii.radiusFull,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        ...shadows.glowPrimary,
    },
    secondaryContainer: {
        backgroundColor: colors.accentSoft,
        borderRadius: radii.radiusFull,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    outlineContainer: {
        backgroundColor: colors.transparent,
        borderRadius: radii.radiusFull,
        borderWidth: 1.5,
        borderColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    ghostContainer: {
        backgroundColor: colors.transparent,
        borderRadius: radii.radiusFull,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    disabled: {
        opacity: 0.55,
    },
    labelPrimary: {
        fontFamily: fontFamilies.sans,
        fontWeight: fontWeight.semibold,
        color: colors.white,
        letterSpacing: letterSpacing.subtle,
    },
    labelSecondary: {
        fontFamily: fontFamilies.sans,
        fontWeight: fontWeight.semibold,
        color: colors.foregroundMuted,
        letterSpacing: letterSpacing.subtle,
    },
    labelOutline: {
        fontFamily: fontFamilies.sans,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
        letterSpacing: letterSpacing.subtle,
    },
    labelGhost: {
        fontFamily: fontFamilies.sans,
        fontWeight: fontWeight.regular,
        color: colors.foregroundMuted,
        letterSpacing: letterSpacing.subtle,
    },
});
