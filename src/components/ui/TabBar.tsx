import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BreathingButton, BREATHING_RING_SIZE } from './BreathingButton';
import { colors, radii, spacing, shadows } from '@/theme/tokens';

const PILL_HEIGHT = 64;
const FLOAT_MARGIN = 12;
const BUTTON_RISE = 20; // how much button center sits above pill top

interface TabConfig {
    readonly route: string;
    readonly icon: string;
    readonly activeIcon: string;
    readonly color: string;
}

const TAB_CONFIG: readonly TabConfig[] = [
    { route: 'Nest',    icon: 'home-outline',            activeIcon: 'home',            color: colors.primary },
    { route: 'Play',    icon: 'game-controller-outline',  activeIcon: 'game-controller',  color: colors.accent },
    { route: 'Us',      icon: 'people-outline',           activeIcon: 'people',           color: colors.accent },
    { route: 'Profile', icon: 'person-outline',           activeIcon: 'person',           color: colors.primary },
];

interface TabIconButtonProps {
    routeName: string;
    isActive: boolean;
    onPress: () => void;
}

const TabIconButton: React.FC<TabIconButtonProps> = ({ routeName, isActive, onPress }) => {
    const cfg = TAB_CONFIG.find((t) => t.route === routeName);
    if (!cfg) return null;

    return (
        <Pressable
            onPress={onPress}
            style={styles.tabButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <Ionicons
                name={(isActive ? cfg.activeIcon : cfg.icon) as keyof typeof Ionicons.glyphMap}
                size={24}
                color={isActive ? cfg.color : colors.gray}
            />
            {isActive && <View style={[styles.activeDot, { backgroundColor: cfg.color }]} />}
        </Pressable>
    );
};

interface TabBarProps extends BottomTabBarProps {
    onChatPress: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ state, navigation, onChatPress }) => {
    const insets = useSafeAreaInsets();
    const bottomPad = Math.max(insets.bottom, spacing.sm);

    // Container must be tall enough to not clip the rising button
    const containerHeight = bottomPad + FLOAT_MARGIN + PILL_HEIGHT + BUTTON_RISE + BREATHING_RING_SIZE / 2;

    // Center button: wrapper bottom = (bottomPad + FLOAT_MARGIN) + pill_center + BUTTON_RISE - ring_half
    const buttonBottom = bottomPad + FLOAT_MARGIN + PILL_HEIGHT / 2 + BUTTON_RISE - BREATHING_RING_SIZE / 2;

    const activeRoute = state.routes[state.index].name;

    const leftRoutes = state.routes.filter((r) => r.name === 'Nest' || r.name === 'Play');
    const rightRoutes = state.routes.filter((r) => r.name === 'Us' || r.name === 'Profile');

    return (
        <View style={{ height: containerHeight }}>
            {/* Floating pill */}
            <View
                style={[
                    styles.pill,
                    { bottom: bottomPad + FLOAT_MARGIN },
                ]}
            >
                {/* Left tabs */}
                <View style={styles.tabGroup}>
                    {leftRoutes.map((route) => (
                        <TabIconButton
                            key={route.key}
                            routeName={route.name}
                            isActive={activeRoute === route.name}
                            onPress={() => {
                                navigation.navigate(route.name);
                            }}
                        />
                    ))}
                </View>

                {/* Center spacer (room for the button) */}
                <View style={styles.centerSlot} />

                {/* Right tabs */}
                <View style={styles.tabGroup}>
                    {rightRoutes.map((route) => (
                        <TabIconButton
                            key={route.key}
                            routeName={route.name}
                            isActive={activeRoute === route.name}
                            onPress={() => {
                                navigation.navigate(route.name);
                            }}
                        />
                    ))}
                </View>
            </View>

            {/* Rising breathing button */}
            <View style={[styles.centerButtonWrap, { bottom: buttonBottom }]}>
                <BreathingButton onPress={onChatPress} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    pill: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        height: PILL_HEIGHT,
        backgroundColor: colors.background,
        borderRadius: radii.radiusFull,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.md,
    },
    tabGroup: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    centerSlot: {
        width: BREATHING_RING_SIZE + spacing.md,
    },
    tabButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        paddingVertical: spacing.sm,
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    centerButtonWrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
});
