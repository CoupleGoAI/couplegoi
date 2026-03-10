import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii, spacing, fontFamilies, fontSize, fontWeight, shadows } from '@/theme/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelpTypeChipsProps {
  onSelect: (value: string) => void;
  disabled: boolean;
}

interface ChipOption {
  label: string;
  value: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const HELP_OPTIONS: ChipOption[] = [
  { label: '💬 Communication', value: 'communication' },
  { label: '⚡ Conflict', value: 'conflict' },
  { label: '🤝 Trust', value: 'trust' },
  { label: '💕 Emotional Connection', value: 'emotional_connection' },
  { label: '🔥 Intimacy', value: 'intimacy' },
  { label: '✨ Other', value: 'other' },
];

// ─── Chip Component ───────────────────────────────────────────────────────────

interface ChipProps {
  option: ChipOption;
  onPress: (value: string) => void;
  disabled: boolean;
}

const Chip = React.memo(({ option, onPress, disabled }: ChipProps) => {
  const handlePress = useCallback(() => {
    onPress(option.value);
  }, [option.value, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[styles.chip, disabled && styles.chipDisabled]}
      accessibilityLabel={option.label}
      accessibilityRole="button"
    >
      <Text style={[styles.chipText, disabled && styles.chipTextDisabled]}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );
});

Chip.displayName = 'Chip';

// ─── Main Component ──────────────────────────────────────────────────────────

export const HelpTypeChips = React.memo(({ onSelect, disabled }: HelpTypeChipsProps) => (
  <View style={styles.container}>
    <Text style={styles.hint}>Tap one to continue:</Text>
    <View style={styles.chipRow}>
      {HELP_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          option={option}
          onPress={onSelect}
          disabled={disabled}
        />
      ))}
    </View>
  </View>
));

HelpTypeChips.displayName = 'HelpTypeChips';

// StyleSheet.create used for chip sizing, border styling, and shadow objects
// that cannot be reliably expressed through NativeWind className.
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  hint: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.muted,
    borderRadius: radii.radiusFull,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  chipTextDisabled: {
    color: colors.gray,
  },
});
