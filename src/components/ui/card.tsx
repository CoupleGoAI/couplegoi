import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { light } from '../../theme/colors';
import { radii, shadows, spacing } from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof spacing;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  borderless?: boolean;
}

export default function Card({
  children,
  style,
  padding = '5',
  shadow = 'sm',
  borderless = false,
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding: spacing[padding] },
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
    backgroundColor: light.bgCard,
    borderRadius: radii['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: light.borderLight,
  },
  borderless: {
    borderWidth: 0,
  },
});
