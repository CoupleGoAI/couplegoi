import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors, radii, shadows, layout } from '@/theme/tokens';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    padding?: number;
    shadow?: 'none' | 'sm' | 'md' | 'lg';
    borderless?: boolean;
}

export default function Card({
    children,
    style,
    padding = layout.cardPadding,
    shadow = 'sm',
    borderless = false,
}: CardProps) {
    return (
        <View
            style={[
                styles.card,
                { padding },
                shadows[shadow],
                borderless && styles.borderless,
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background,
        borderRadius: radii.radius,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.borderDefault,
    },
    borderless: {
        borderWidth: 0,
    },
});
