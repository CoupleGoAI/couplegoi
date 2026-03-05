import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';

interface DividerProps {
    style?: ViewStyle;
    light?: boolean;
}

export default function Divider({ style, light: isLight = false }: DividerProps) {
    return (
        <View
            style={[
                styles.divider,
                isLight ? styles.lightDivider : styles.normalDivider,
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    divider: {
        height: StyleSheet.hairlineWidth,
        alignSelf: 'stretch',
    },
    normalDivider: {
        backgroundColor: colors.borderDefault,
    },
    lightDivider: {
        backgroundColor: colors.borderLight,
    },
});
