import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, gradients } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight } from '../../theme/typography';

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
        colors={gradients.brand as any}
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
    container: { backgroundColor: palette.pink100 },
    label: { color: palette.pink600 },
  },
  success: {
    container: { backgroundColor: '#DCFCE7' },
    label: { color: '#166534' },
  },
  warning: {
    container: { backgroundColor: '#FEF9C3' },
    label: { color: '#854D0E' },
  },
  info: {
    container: { backgroundColor: '#DBEAFE' },
    label: { color: '#1E40AF' },
  },
  neutral: {
    container: { backgroundColor: palette.gray100 },
    label: { color: palette.gray600 },
  },
  pink: {
    container: { backgroundColor: palette.pink100 },
    label: { color: palette.pink500 },
  },
  purple: {
    container: { backgroundColor: palette.lavender100 },
    label: { color: palette.lavender700 },
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['1'],
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.4,
  },
  labelLight: {
    color: palette.white,
  },
});
