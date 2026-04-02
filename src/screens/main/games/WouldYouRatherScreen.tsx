import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useHaptics } from '@hooks/useHaptics';
import { WYR_QUESTIONS } from '@/domain/games/wouldYouRatherQuestions';
import type { BinaryChoice } from '@/domain/games/types';
import { colors, gradients, radii, spacing, shadows, fontFamilies, fontSize, fontWeight } from '@/theme/tokens';

type Phase = 'intro' | 'p1' | 'pass' | 'p2' | 'reveal' | 'results';

export function WouldYouRatherScreen(): React.ReactElement {
    const navigation = useNavigation();
    const haptics = useHaptics();
    const [phase, setPhase] = useState<Phase>('intro');
    const [index, setIndex] = useState(0);
    const [p1Choice, setP1Choice] = useState<BinaryChoice | null>(null);
    const [matches, setMatches] = useState(0);

    const question = WYR_QUESTIONS[index];
    const total = WYR_QUESTIONS.length;

    const handleP1Pick = useCallback((choice: BinaryChoice) => {
        void haptics.medium();
        setP1Choice(choice);
        setPhase('pass');
    }, [haptics]);

    const handleP2Pick = useCallback((choice: BinaryChoice) => {
        void haptics.medium();
        if (p1Choice === choice) {
            setMatches((m) => m + 1);
            void haptics.success();
        }
        setPhase('reveal');
    }, [haptics, p1Choice]);

    const handleNext = useCallback(() => {
        void haptics.light();
        const nextIndex = index + 1;
        if (nextIndex >= total) {
            setPhase('results');
        } else {
            setIndex(nextIndex);
            setP1Choice(null);
            setPhase('p1');
        }
    }, [haptics, index, total]);

    if (phase === 'intro') {
        return (
            <SafeAreaView style={styles.safe}>
                <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.center}>
                    <Text style={styles.gameEmoji}>💬</Text>
                    <Text style={styles.gameTitle}>Would You Rather?</Text>
                    <Text style={styles.gameDesc}>
                        Take turns answering {total} relationship dilemmas.{'\n'}See how well you think alike — or spark a great conversation.
                    </Text>
                    <TouchableOpacity style={styles.startBtn} onPress={() => { void haptics.medium(); setPhase('p1'); }} activeOpacity={0.85}>
                        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGradient}>
                            <Text style={styles.startLabel}>Start — Player 1</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (phase === 'pass') {
        return (
            <SafeAreaView style={styles.safe}>
                <LinearGradient colors={gradients.heroWash} style={StyleSheet.absoluteFill} />
                <Animated.View entering={FadeIn.duration(300)} style={styles.center}>
                    <Text style={styles.passEmoji}>📱</Text>
                    <Text style={styles.passTitle}>Pass the phone</Text>
                    <Text style={styles.passSubtitle}>Player 1 has answered. Hand it to Player 2!</Text>
                    <TouchableOpacity style={styles.startBtn} onPress={() => { void haptics.light(); setPhase('p2'); }} activeOpacity={0.85}>
                        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGradient}>
                            <Text style={styles.startLabel}>I'm Player 2, ready!</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        );
    }

    if (phase === 'reveal') {
        const isMatch = p1Choice !== null && WYR_QUESTIONS[index] !== undefined;
        return (
            <SafeAreaView style={styles.safe}>
                <Animated.View entering={ZoomIn.duration(350)} style={styles.center}>
                    <Text style={styles.revealEmoji}>{isMatch ? '🎉' : '💬'}</Text>
                    <Text style={styles.revealTitle}>{isMatch ? 'Talk about it!' : 'Discuss!'}</Text>
                    <Text style={styles.revealSub}>{question.optionA}</Text>
                    <View style={styles.revealRow}>
                        <View style={[styles.revealBadge, p1Choice === 'A' ? styles.badgeA : styles.badgeB]}>
                            <Text style={styles.revealBadgeLabel}>P1: {p1Choice === 'A' ? 'A' : 'B'}</Text>
                        </View>
                    </View>
                    <Text style={styles.revealSub}>{question.optionB}</Text>
                    <TouchableOpacity style={styles.startBtn} onPress={handleNext} activeOpacity={0.85}>
                        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGradient}>
                            <Text style={styles.startLabel}>{index + 1 < total ? 'Next Question' : 'See Results'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        );
    }

    if (phase === 'results') {
        const pct = Math.round((matches / total) * 100);
        return (
            <SafeAreaView style={styles.safe}>
                <LinearGradient colors={gradients.heroWash} style={StyleSheet.absoluteFill} />
                <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
                    <Text style={styles.gameEmoji}>{pct >= 70 ? '🥰' : pct >= 40 ? '😄' : '💬'}</Text>
                    <Text style={styles.gameTitle}>{matches} / {total} matched</Text>
                    <Text style={styles.gameDesc}>
                        {pct >= 70
                            ? 'You think so much alike! Beautiful alignment.'
                            : pct >= 40
                            ? 'Nice mix! Your differences make for great conversations.'
                            : 'Lots to talk about — that\'s what makes you interesting!'}
                    </Text>
                    <TouchableOpacity style={styles.startBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGradient}>
                            <Text style={styles.startLabel}>Done</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        );
    }

    // p1 or p2 phase
    const isP1 = phase === 'p1';
    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.playerTag}>{isP1 ? 'Player 1' : 'Player 2'}</Text>
                <Text style={styles.progress}>{index + 1} / {total}</Text>
            </View>
            <Animated.View key={`${index}-${phase}`} entering={FadeIn.duration(280)} exiting={FadeOut.duration(180)} style={styles.questionWrap}>
                <Text style={styles.orLabel}>Would you rather…</Text>
                <ScrollView contentContainerStyle={styles.optionsContainer} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                        style={styles.optionCard}
                        activeOpacity={0.82}
                        onPress={() => isP1 ? handleP1Pick('A') : handleP2Pick('A')}
                    >
                        <LinearGradient colors={[colors.muted, colors.background]} style={styles.optionGradient}>
                            <Text style={styles.optionLabel}>{question.optionA}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <View style={styles.orDivider}><Text style={styles.orText}>OR</Text></View>
                    <TouchableOpacity
                        style={styles.optionCard}
                        activeOpacity={0.82}
                        onPress={() => isP1 ? handleP1Pick('B') : handleP2Pick('B')}
                    >
                        <LinearGradient colors={[colors.accentSoft, colors.background]} style={styles.optionGradient}>
                            <Text style={styles.optionLabel}>{question.optionB}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    back: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    backText: { fontFamily: fontFamilies.sans, fontSize: fontSize.base, color: colors.primary },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
    gameEmoji: { fontSize: 56 },
    gameTitle: { fontFamily: fontFamilies.sans, fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.foreground, textAlign: 'center' },
    gameDesc: { fontFamily: fontFamilies.sans, fontSize: fontSize.base, color: colors.foregroundMuted, textAlign: 'center', lineHeight: 22 },
    startBtn: { alignSelf: 'stretch', marginTop: spacing.md },
    startGradient: { borderRadius: radii.radiusFull, paddingVertical: spacing.lg, alignItems: 'center', ...shadows.glowPrimary },
    startLabel: { fontFamily: fontFamilies.sans, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.white },
    passEmoji: { fontSize: 48 },
    passTitle: { fontFamily: fontFamilies.sans, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.foreground },
    passSubtitle: { fontFamily: fontFamilies.sans, fontSize: fontSize.base, color: colors.foregroundMuted, textAlign: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
    playerTag: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
    progress: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, color: colors.gray },
    questionWrap: { flex: 1 },
    optionsContainer: { paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'], gap: spacing.md },
    orLabel: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, color: colors.gray, textAlign: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.md, letterSpacing: 0.5, textTransform: 'uppercase' },
    optionCard: { borderRadius: radii.radius, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, ...shadows.md },
    optionGradient: { padding: spacing.xl, minHeight: 100, justifyContent: 'center' },
    optionLabel: { fontFamily: fontFamilies.sans, fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.foreground, textAlign: 'center' },
    orDivider: { alignItems: 'center', marginVertical: spacing.xs },
    orText: { fontFamily: fontFamilies.sans, fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray, letterSpacing: 2 },
    revealEmoji: { fontSize: 56 },
    revealTitle: { fontFamily: fontFamilies.sans, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.foreground },
    revealSub: { fontFamily: fontFamilies.sans, fontSize: fontSize.base, color: colors.foregroundMuted, textAlign: 'center' },
    revealRow: { flexDirection: 'row', gap: spacing.md },
    revealBadge: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.radiusFull },
    badgeA: { backgroundColor: colors.muted },
    badgeB: { backgroundColor: colors.accentSoft },
    revealBadgeLabel: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.foreground },
});
