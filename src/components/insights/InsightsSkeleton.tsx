import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { colors, radii, spacing } from '@/theme/tokens';

function Block({ height, width }: { height: number; width: number | string }): React.ReactElement {
    const o = useSharedValue(0.5);
    useEffect(() => {
        o.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    }, [o]);
    const style = useAnimatedStyle(() => ({ opacity: o.value }));
    return (
        <Animated.View
            style={[
                {
                    height,
                    width: width as number,
                    backgroundColor: colors.accentSoft,
                    borderRadius: radii.radiusMd,
                },
                style,
            ]}
        />
    );
}

export function InsightsSkeleton(): React.ReactElement {
    return (
        <View style={styles.wrap}>
            <View style={styles.ring}>
                <Block height={208} width={208} />
            </View>
            <View style={styles.row}>
                <Block height={88} width={'48%'} />
                <Block height={88} width={'48%'} />
            </View>
            <Block height={90} width={'100%'} />
            <Block height={180} width={'100%'} />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: spacing.lg },
    ring: { alignItems: 'center', marginVertical: spacing.md },
    row: { flexDirection: 'row', gap: spacing.sm },
});
