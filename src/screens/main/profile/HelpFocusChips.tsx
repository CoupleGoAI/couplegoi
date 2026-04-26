import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import {
    colors,
    radii,
    spacing,
    fontFamilies,
    fontSize,
    fontWeight,
} from '@/theme/tokens';

interface HelpOption {
    label: string;
    value: string;
}

// Values must match what HelpTypeChips saves to the DB during onboarding
const HELP_FOCUS_OPTIONS: HelpOption[] = [
    { label: 'Communication', value: 'communication' },
    { label: 'Conflict', value: 'conflict' },
    { label: 'Trust', value: 'trust' },
    { label: 'Emotional Connection', value: 'emotional_connection' },
    { label: 'Intimacy', value: 'intimacy' },
    { label: 'Other', value: 'other' },
];

export type HelpFocusOption = (typeof HELP_FOCUS_OPTIONS)[number]['value'];

interface HelpFocusChipsProps {
    selected: string;
    onSelect: (value: string) => void;
}

function HelpFocusChipsInner({ selected, onSelect }: HelpFocusChipsProps): React.ReactElement {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {HELP_FOCUS_OPTIONS.map((option) => {
                const isSelected = selected === option.value;
                return (
                    <TouchableOpacity
                        key={option.value}
                        activeOpacity={0.8}
                        onPress={() => onSelect(isSelected ? '' : option.value)}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                    >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

export const HelpFocusChips = React.memo(HelpFocusChipsInner);
HelpFocusChips.displayName = 'HelpFocusChips';

const styles = StyleSheet.create({
    container: {
        gap: spacing.sm,
        paddingVertical: spacing.xs,
    },
    chip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radii.radiusFull,
        backgroundColor: colors.muted,
        borderWidth: 1.5,
        borderColor: colors.borderDefault,
    },
    chipSelected: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.primary,
    },
    chipText: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.foregroundMuted,
    },
    chipTextSelected: {
        color: colors.primary,
        fontWeight: fontWeight.semibold,
    },
});
