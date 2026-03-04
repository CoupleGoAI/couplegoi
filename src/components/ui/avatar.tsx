import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, gradients } from '../../theme/colors';
import { radii } from '../../theme/spacing';
import { fontFamilies, fontWeight } from '../../theme/typography';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string;
  uri?: string;
  size?: AvatarSize;
  gradient?: boolean;
  style?: ViewStyle;
  showOnline?: boolean;
  isOnline?: boolean;
}

const SIZES: Record<AvatarSize, { container: number; font: number; indicator: number }> = {
  xs: { container: 28, font: 11, indicator: 8 },
  sm: { container: 36, font: 13, indicator: 10 },
  md: { container: 44, font: 16, indicator: 12 },
  lg: { container: 56, font: 20, indicator: 14 },
  xl: { container: 72, font: 26, indicator: 16 },
};

export default function Avatar({
  name,
  uri,
  size = 'md',
  gradient = false,
  style,
  showOnline = false,
  isOnline = false,
}: AvatarProps) {
  const sizeConfig = SIZES[size];
  const initials = name
    ? name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : '?';

  const containerStyle = {
    width: sizeConfig.container,
    height: sizeConfig.container,
    borderRadius: sizeConfig.container / 2,
  };

  if (uri) {
    return (
      <View style={[styles.wrapper, style]}>
        <Image source={{ uri }} style={[styles.image, containerStyle]} />
        {showOnline && (
          <View
            style={[
              styles.indicator,
              {
                width: sizeConfig.indicator,
                height: sizeConfig.indicator,
                borderRadius: sizeConfig.indicator / 2,
                backgroundColor: isOnline ? palette.success : palette.gray400,
              },
            ]}
          />
        )}
      </View>
    );
  }

  if (gradient) {
    return (
      <View style={[styles.wrapper, style]}>
        <LinearGradient
          colors={gradients.brand as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fallback, containerStyle]}
        >
          <Text style={[styles.initials, { fontSize: sizeConfig.font }]}>{initials}</Text>
        </LinearGradient>
        {showOnline && (
          <View
            style={[
              styles.indicator,
              {
                width: sizeConfig.indicator,
                height: sizeConfig.indicator,
                borderRadius: sizeConfig.indicator / 2,
                backgroundColor: isOnline ? palette.success : palette.gray400,
              },
            ]}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.fallback, styles.fallbackSolid, containerStyle]}>
        <Text style={[styles.initials, { fontSize: sizeConfig.font, color: palette.lavender700 }]}>
          {initials}
        </Text>
      </View>
      {showOnline && (
        <View
          style={[
            styles.indicator,
            {
              width: sizeConfig.indicator,
              height: sizeConfig.indicator,
              borderRadius: sizeConfig.indicator / 2,
              backgroundColor: isOnline ? palette.success : palette.gray400,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackSolid: {
    backgroundColor: palette.lavender100,
  },
  initials: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeight.bold,
    color: palette.white,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: palette.white,
  },
});
