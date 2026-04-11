import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    AccessibilityInfo,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
    colors,
    gradients,
    spacing,
    textStyles,
    fontFamilies,
    fontSize,
    fontWeight,
} from '@/theme/tokens';
import { useCoupleInsights } from '@hooks/useCoupleInsights';
import { pickInsightTip } from '@/domain/insights/tips';
import { ProgressRingHero } from '@/components/insights/ProgressRingHero';
import { StreakCard } from '@/components/insights/StreakCard';
import { DaysTogetherCard } from '@/components/insights/DaysTogetherCard';
import { StatTile } from '@/components/insights/StatTile';
import { CategoryBreakdown } from '@/components/insights/CategoryBreakdown';
import { BadgesGrid } from '@/components/insights/BadgesGrid';
import { InsightTip } from '@/components/insights/InsightTip';
import { InsightsSkeleton } from '@/components/insights/InsightsSkeleton';

function useReduceMotion(): boolean {
    const [reduced, setReduced] = useState<boolean>(false);
    useEffect(() => {
        let mounted = true;
        void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
            if (mounted) setReduced(v);
        });
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
        return () => {
            mounted = false;
            sub.remove();
        };
    }, []);
    return reduced;
}

export function UsScreen(): React.ReactElement {
    const { data, loading, refreshing, error, refresh } = useCoupleInsights();
    const reduceMotion = useReduceMotion();

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient
                colors={gradients.heroWash}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
            />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            void refresh();
                        }}
                        tintColor={colors.primary}
                    />
                }
            >
                <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
                    <Text style={styles.label}>Insights</Text>
                    <Text style={styles.title}>Us</Text>
                </Animated.View>

                {loading && !data ? (
                    <InsightsSkeleton />
                ) : error !== null && !data ? (
                    <ErrorState kind={error.kind} onRetry={() => void refresh()} />
                ) : data ? (
                    <InsightsContent data={data} reduceMotion={reduceMotion} />
                ) : null}

                <View style={styles.bottomPad} />
            </ScrollView>
        </SafeAreaView>
    );
}

interface ContentProps {
    data: ReturnType<typeof useCoupleInsights>['data'];
    reduceMotion: boolean;
}

function InsightsContent({ data, reduceMotion }: ContentProps): React.ReactElement | null {
    if (!data) return null;
    const compat = data.avgCompatibility !== null ? `${data.avgCompatibility}%` : '—';
    const matchRate = data.matchRate !== null ? `${Math.round(data.matchRate * 100)}%` : '—';

    return (
        <View style={styles.content}>
            <ProgressRingHero milestone={data.nextMilestone} reduceMotion={reduceMotion} />

            <View style={styles.row}>
                <StreakCard streak={data.streak} reduceMotion={reduceMotion} delayMs={100} />
                <DaysTogetherCard days={data.daysTogether} delayMs={180} />
            </View>

            <View style={styles.row}>
                <StatTile
                    icon="game-controller"
                    tint={colors.accent}
                    label="Games"
                    value={String(data.gamesPlayed)}
                    delayMs={240}
                />
                <StatTile
                    icon="chatbubbles"
                    tint={colors.primary}
                    label="Messages"
                    value={String(data.messagesExchanged)}
                    delayMs={280}
                />
            </View>
            <View style={styles.row}>
                <StatTile
                    icon="infinite"
                    tint={colors.accent}
                    label="Compatibility"
                    value={compat}
                    delayMs={320}
                />
                <StatTile
                    icon="checkmark-circle"
                    tint={colors.primary}
                    label="Match rate"
                    value={matchRate}
                    delayMs={360}
                />
            </View>

            <CategoryBreakdown
                categories={data.categories}
                delayMs={400}
                reduceMotion={reduceMotion}
            />

            <BadgesGrid badges={data.badges} delayMs={460} />

            <InsightTip text={pickInsightTip(data)} delayMs={560} />
        </View>
    );
}

interface ErrorProps {
    kind: 'no_couple' | 'network' | 'unknown';
    onRetry: () => void;
}

function ErrorState({ kind, onRetry }: ErrorProps): React.ReactElement {
    const title = kind === 'no_couple' ? 'No couple yet' : "Couldn't load insights";
    const subtitle =
        kind === 'no_couple'
            ? 'Pair with your partner to unlock your shared insights.'
            : 'Pull to refresh or tap retry.';
    return (
        <Animated.View entering={FadeInDown.duration(420)} style={styles.errorBox}>
            <Ionicons name="sparkles-outline" size={32} color={colors.primary} />
            <Text style={styles.errorTitle}>{title}</Text>
            <Text style={styles.errorSub}>{subtitle}</Text>
            {kind !== 'no_couple' && (
                <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.82}>
                    <Text style={styles.retryLabel}>Retry</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    container: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['2xl'],
    },
    header: { paddingTop: spacing.xl },
    label: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.gray,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    title: {
        ...textStyles.displaySm,
        color: colors.foreground,
        marginTop: spacing.xs,
    },
    content: { gap: spacing.lg },
    row: { flexDirection: 'row', gap: spacing.sm },
    bottomPad: { height: spacing['2xl'] },
    errorBox: {
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing['2xl'],
    },
    errorTitle: {
        ...textStyles.h2,
        color: colors.foreground,
        marginTop: spacing.sm,
    },
    errorSub: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        color: colors.gray,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    retryBtn: {
        marginTop: spacing.md,
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
        borderRadius: 999,
    },
    retryLabel: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.white,
    },
});
