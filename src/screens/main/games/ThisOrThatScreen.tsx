import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useHaptics } from '@hooks/useHaptics';
import { TOT_QUESTIONS } from '@/domain/games/thisOrThatQuestions';
import type { BinaryChoice } from '@/domain/games/types';
import { colors, gradients, radii, spacing, shadows, fontFamilies, fontSize, fontWeight } from '@/theme/tokens';

type Phase = 'intro' | 'p1' | 'pass' | 'p2' | 'results';

export function ThisOrThatScreen(): React.ReactElement {
    const navigation = useNavigation();
    const haptics = useHaptics();
    const [phase, setPhase] = useState<Phase>('intro');
    const [index, setIndex] = useState(0);
    const [p1Answers, setP1Answers] = useState<BinaryChoice[]>([]);
    const [p2Answers, setP2Answers] = useState<BinaryChoice[]>([]);

    const question = TOT_QUESTIONS[index];
    const total = TOT_QUESTIONS.length;

    const handleP1Pick = useCallback((choice: BinaryChoice) => {
        void haptics.light();
        const next = [...p1Answers, choice];
        setP1Answers(next);
        const nextIndex = index + 1;
        if (nextIndex >= total) {
            setIndex(0);
            setPhase('pass');
        } else {
            setIndex(nextIndex);
        }
    }, [haptics, p1Answers, index, total]);

    const handleP2Pick = useCallback((choice: BinaryChoice) => {
        void haptics.light();
        const next = [...p2Answers, choice];
        setP2Answers(next);
        const nextIndex = index + 1;
        if (nextIndex >= total) {
            void haptics.success();
            setP2Answers(next);
            setPhase('results');
        } else {
            setIndex(nextIndex);
        }
    }, [haptics, p2Answers, index, total]);

    const matchCount = p1Answers.filter((a, i) => a === p2Answers[i]).length;
    const pct = p2Answers.length > 0 ? Math.round((matchCount / total) * 100) : 0;

    if (phase === 'intro') {
        return (
            <SafeAreaView style={styles.safe}>
                <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.center}>
                    <Text style={styles.gameEmoji}>⚡</Text>
                    <Text style={styles.gameTitle}>This or That</Text>
                    <Text style={styles.gameDesc}>
                        Quick-fire! Each partner picks their preference for {total} pairs.{'\n'}Find out how much you have in common.
                    </Text>
                    <TouchableOpacity
                        style={styles.fullBtn}
                        onPress={() => { void haptics.medium(); setPhase('p1'); }}
                        activeOpacity={0.85}
                    >
                        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                            <Text style={styles.btnLabel}>Start — Player 1</Text>
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
                    <Text style={styles.gameEmoji}>📱</Text>
                    <Text style={styles.gameTitle}>Pass to Player 2</Text>
                    <Text style={styles.gameDesc}>Player 1 is done. Hand the phone over!</Text>
                    <TouchableOpacity
                        style={styles.fullBtn}
                        onPress={() => { void haptics.light(); setPhase('p2'); }}
                        activeOpacity={0.85}
                    >
                        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                            <Text style={styles.btnLabel}>I'm Player 2, ready!</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        );
    }

    if (phase === 'results') {
        return (
            <SafeAreaView style={styles.safe}>
                <LinearGradient colors={gradients.heroWash} style={StyleSheet.absoluteFill} />
                <Animated.View entering={ZoomIn.duration(400)} style={styles.center}>
                    <Text style={styles.gameEmoji}>{pct >= 70 ? '🥰' : pct >= 40 ? '😄' : '🤔'}</Text>
                    <Text style={styles.gameTitle}>{pct}% match</Text>
                    <Text style={styles.matchDetail}>{matchCount} of {total} in common</Text>
                    <Text style={styles.gameDesc}>
                        {pct >= 70
                            ? 'So much in common — you just get each other!'
                            : pct >= 40
                            ? 'A great blend of shared tastes and happy differences.'
                            : 'Opposites attract! Lots to discover about each other.'}
                    </Text>
                    <View style={styles.breakdown}>
                        {TOT_QUESTIONS.map((q, i) => (
                            <View key={q.id} style={styles.breakdownRow}>
                                <Text style={styles.breakdownQ} numberOfLines={1}>{q.optionA} / {q.optionB}</Text>
                                <Text style={[styles.breakdownMatch, p1Answers[i] === p2Answers[i] ? styles.matchYes : styles.matchNo]}>
                                    {p1Answers[i] === p2Answers[i] ? '✓' : '✗'}
                                </Text>
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity style={styles.fullBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                            <Text style={styles.btnLabel}>Done</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        );
    }

    // p1 or p2 picking phase
    const isP1 = phase === 'p1';
    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.playerTag}>{isP1 ? 'Player 1' : 'Player 2'}</Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((index) / total) * 100}%` }]} />
                </View>
                <Text style={styles.progressLabel}>{index + 1}/{total}</Text>
            </View>
            <Animated.View key={`${index}-${phase}`} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.pickArea}>
                <TouchableOpacity
                    style={styles.pickCard}
                    activeOpacity={0.82}
                    onPress={() => isP1 ? handleP1Pick('A') : handleP2Pick('A')}
                >
                    <LinearGradient colors={[colors.muted, colors.background]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.pickGradient}>
                        <Text style={styles.pickText}>{question.optionA}</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <View style={styles.orBadge}><Text style={styles.orText}>OR</Text></View>
                <TouchableOpacity
                    style={styles.pickCard}
                    activeOpacity={0.82}
                    onPress={() => isP1 ? handleP1Pick('B') : handleP2Pick('B')}
                >
                    <LinearGradient colors={[colors.accentSoft, colors.background]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.pickGradient}>
                        <Text style={styles.pickText}>{question.optionB}</Text>
                    </LinearGradient>
                </TouchableOpacity>
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
    matchDetail: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, color: colors.gray },
    fullBtn: { alignSelf: 'stretch' },
    btnGradient: { borderRadius: radii.radiusFull, paddingVertical: spacing.lg, alignItems: 'center', ...shadows.glowPrimary },
    btnLabel: { fontFamily: fontFamilies.sans, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.white },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
    playerTag: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary, width: 72 },
    progressBar: { flex: 1, height: 4, backgroundColor: colors.borderLight, borderRadius: radii.radiusFull, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radii.radiusFull },
    progressLabel: { fontFamily: fontFamilies.sans, fontSize: fontSize.xs, color: colors.gray, width: 36, textAlign: 'right' },
    pickArea: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'], gap: spacing.sm, justifyContent: 'center' },
    pickCard: { flex: 1, borderRadius: radii.radius, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm },
    pickGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    pickText: { fontFamily: fontFamilies.sans, fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.foreground, textAlign: 'center' },
    orBadge: { alignItems: 'center', paddingVertical: spacing.xs },
    orText: { fontFamily: fontFamilies.sans, fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray, letterSpacing: 2 },
    breakdown: { alignSelf: 'stretch', gap: spacing.xs },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
    breakdownQ: { flex: 1, fontFamily: fontFamilies.sans, fontSize: fontSize.xs, color: colors.foregroundMuted },
    breakdownMatch: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, fontWeight: fontWeight.bold, width: 20, textAlign: 'center' },
    matchYes: { color: colors.success },
    matchNo: { color: colors.error },
});
