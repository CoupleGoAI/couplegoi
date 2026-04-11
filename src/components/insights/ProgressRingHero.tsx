import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Animated, {
    FadeIn,
    useAnimatedProps,
    useSharedValue,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, shadows, textStyles, fontFamilies, fontSize, fontWeight } from '@/theme/tokens';
import type { Milestone } from '@/domain/insights/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 208;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

interface Props {
    milestone: Milestone;
    reduceMotion: boolean;
}

export function ProgressRingHero({ milestone, reduceMotion }: Props): React.ReactElement {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = reduceMotion
            ? milestone.progress
            : withTiming(milestone.progress, { duration: 1000, easing: Easing.out(Easing.cubic) });
    }, [milestone.progress, reduceMotion, progress]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: CIRC * (1 - progress.value),
    }));

    const pct = Math.round(milestone.progress * 100);

    return (
        <Animated.View entering={FadeIn.duration(500)} style={styles.wrap}>
            <View style={styles.ringWrap}>
                <Svg width={SIZE} height={SIZE}>
                    <Defs>
                        <SvgLinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor={colors.primary} />
                            <Stop offset="1" stopColor={colors.accent} />
                        </SvgLinearGradient>
                    </Defs>
                    <Circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke={colors.accentSoft}
                        strokeWidth={STROKE}
                        fill="none"
                    />
                    <AnimatedCircle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke="url(#ringGrad)"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={`${CIRC} ${CIRC}`}
                        animatedProps={animatedProps}
                        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                    />
                </Svg>
                <View style={styles.center} pointerEvents="none">
                    <Ionicons name={milestone.icon} size={28} color={colors.primary} />
                    <Text style={styles.pct}>{pct}%</Text>
                    <Text style={styles.label}>{milestone.label}</Text>
                    <Text style={styles.sub}>
                        {milestone.current}/{milestone.target}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center', marginVertical: spacing.lg },
    ringWrap: {
        width: SIZE,
        height: SIZE,
        borderRadius: radii.radiusFull,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.glowPrimary,
    },
    center: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    pct: {
        ...textStyles.displaySm,
        color: colors.foreground,
        marginTop: spacing.xs,
    },
    label: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.foregroundMuted,
    },
    sub: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        color: colors.gray,
    },
});
