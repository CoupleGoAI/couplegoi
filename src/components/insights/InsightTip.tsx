import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
    colors,
    radii,
    spacing,
    fontFamilies,
    fontSize,
    fontWeight,
} from '@/theme/tokens';

interface Props {
    text: string;
    delayMs?: number;
}

export function InsightTip({ text, delayMs = 420 }: Props): React.ReactElement | null {
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;
    return (
        <Animated.View
            entering={FadeIn.delay(delayMs).duration(500)}
            exiting={FadeOut.duration(240)}
            style={styles.tip}
        >
            <View style={styles.iconWrap}>
                <Ionicons name="bulb-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.text}>{text}</Text>
            <TouchableOpacity
                onPress={() => setDismissed(true)}
                hitSlop={12}
                accessibilityLabel="Dismiss tip"
            >
                <Ionicons name="close" size={18} color={colors.gray} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    tip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.accentSoft,
        borderRadius: radii.radiusMd,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.accentLight,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: radii.radiusFull,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        flex: 1,
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.foregroundMuted,
        lineHeight: fontSize.sm * 1.4,
    },
});
