import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { light } from '../../theme/colors';

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
    backgroundColor: light.borderLight,
  },
  lightDivider: {
    backgroundColor: 'rgba(228,228,231,0.4)',
  },
});
