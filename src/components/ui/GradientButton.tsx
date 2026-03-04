import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, gradients } from '../../theme/colors';
import { radii, shadows, spacing } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight } from '../../theme/typography';

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
        style={[
          styles.wrapper,
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        <LinearGradient
          colors={isDisabled ? [palette.gray300, palette.gray400] : gradients.brand as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyles.container, isDisabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={palette.white} size="small" />
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
          <ActivityIndicator color={palette.lavender700} size="small" />
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
          <ActivityIndicator color={palette.pink500} size="small" />
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
        <ActivityIndicator color={palette.gray500} size="small" />
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
    container: { paddingHorizontal: spacing['4'], paddingVertical: spacing['2'], height: 36 },
    label: { fontSize: fontSize.sm },
  },
  md: {
    container: { paddingHorizontal: spacing['6'], paddingVertical: spacing['3'], height: 48 },
    label: { fontSize: fontSize.base },
  },
  lg: {
    container: { paddingHorizontal: spacing['8'], paddingVertical: spacing['4'], height: 56 },
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
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    ...shadows.brand,
  },
  secondaryContainer: {
    backgroundColor: palette.lavender100,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: palette.pink400,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
  },
  ghostContainer: {
    backgroundColor: 'transparent',
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
  },
  disabled: {
    opacity: 0.55,
  },
  labelPrimary: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeight.semibold,
    color: palette.white,
    letterSpacing: 0.3,
  },
  labelSecondary: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeight.semibold,
    color: palette.lavender700,
    letterSpacing: 0.3,
  },
  labelOutline: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeight.semibold,
    color: palette.pink500,
    letterSpacing: 0.3,
  },
  labelGhost: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeight.regular,
    color: palette.gray600,
    letterSpacing: 0.3,
  },
});
