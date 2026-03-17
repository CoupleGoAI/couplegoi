import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, shadows } from '@/theme/tokens';

export type HeartActionButtonSize = 'sm' | 'md';

interface HeartActionButtonProps {
    onPress: () => void;
    disabled?: boolean;
    accessibilityLabel: string;
    size?: HeartActionButtonSize;
    style?: StyleProp<ViewStyle>;
}

const SIZE_CONFIG: Record<HeartActionButtonSize, { diameter: number; iconSize: number }> = {
    sm: { diameter: 36, iconSize: 18 },
    md: { diameter: 44, iconSize: 22 },
};

export const HeartActionButton: React.FC<HeartActionButtonProps> = React.memo(
    ({ onPress, disabled = false, accessibilityLabel, size = 'md', style }) => {
        const { diameter, iconSize } = SIZE_CONFIG[size];

        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled}
                activeOpacity={0.75}
                style={[
                    styles.button,
                    { width: diameter, height: diameter, borderRadius: diameter / 2 },
                    disabled && styles.buttonDisabled,
                    style,
                ]}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
            >
                <LinearGradient
                    colors={disabled ? gradients.disabled : gradients.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                >
                    <Ionicons name="heart" size={iconSize} color={colors.white} />
                </LinearGradient>
            </TouchableOpacity>
        );
    },
);

HeartActionButton.displayName = 'HeartActionButton';

const styles = StyleSheet.create({
    button: {
        overflow: 'hidden',
        ...shadows.glowPrimary,
    },
    buttonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
        elevation: 0,
    },
    gradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});