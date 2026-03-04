import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { light, palette } from '../../theme/colors';
import { layout } from '../../theme/spacing';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  bg?: string;
}

export default function ScreenContainer({
  children,
  scrollable = false,
  refreshing = false,
  onRefresh,
  padded = true,
  style,
  contentStyle,
  bg,
}: ScreenContainerProps) {
  const bgColor = bg ?? light.bgPrimary;

  if (scrollable) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bgColor }, style]} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            padded && styles.padded,
            styles.scrollContent,
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.pink500}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgColor }, style]} edges={['top']}>
      <View style={[styles.container, padded && styles.padded, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: layout.tabBarHeight + 24,
  },
  padded: {
    paddingHorizontal: layout.screenPaddingH,
  },
});
