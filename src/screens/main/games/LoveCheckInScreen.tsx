import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useHaptics } from '@hooks/useHaptics';
import { CHECKIN_PROMPTS } from '@/domain/games/loveCheckInPrompts';
import { colors, gradients, radii, spacing, shadows, fontFamilies, fontSize, fontWeight } from '@/theme/tokens';

type Phase = 'intro' | 'p1' | 'pass' | 'p2' | 'reveal';

export function LoveCheckInScreen(): React.ReactElement {
    const navigation = useNavigation();
    const haptics = useHaptics();
    const [phase, setPhase] = useState<Phase>('intro');
    const [promptIndex, setPromptIndex] = useState(0);
    const [p1Answers, setP1Answers] = useState<string[]>(['', '', '']);
    const [p2Answers, setP2Answers] = useState<string[]>(['', '', '']);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<TextInput>(null);

    const prompts = CHECKIN_PROMPTS;
    const total = prompts.length;
    const currentPrompt = prompts[promptIndex];

    const handleNext = useCallback(() => {
        if (draft.trim().length === 0) return;
        void haptics.light();
        if (phase === 'p1') {
            const updated = [...p1Answers];
            updated[promptIndex] = draft.trim();
            setP1Answers(updated);
            if (promptIndex + 1 < total) {
                setPromptIndex(promptIndex + 1);
                setDraft('');
            } else {
                setPromptIndex(0);
                setDraft('');
                setPhase('pass');
            }
        } else if (phase === 'p2') {
            const updated = [...p2Answers];
            updated[promptIndex] = draft.trim();
            setP2Answers(updated);
            if (promptIndex + 1 < total) {
                setPromptIndex(promptIndex + 1);
                setDraft('');
            } else {
                void haptics.success();
                setP2Answers(updated);
                setPhase('reveal');
            }
        }
    }, [draft, haptics, phase, promptIndex, total, p1Answers, p2Answers]);

    if (phase === 'intro') {
        return (
            <SafeAreaView style={styles.safe}>
                <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.center}>
                    <Text style={styles.gameEmoji}>💝</Text>
                    <Text style={styles.gameTitle}>Love Check-In</Text>
                    <Text style={styles.gameDesc}>
                        Each partner answers {total} heartfelt prompts privately.{'\n'}Then reveal your answers together.
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
                    <Text style={styles.gameDesc}>Player 1's answers are saved. Hand it over!</Text>
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

    if (phase === 'reveal') {
        return (
            <SafeAreaView style={styles.safe}>
                <LinearGradient colors={gradients.heroWash} style={StyleSheet.absoluteFill} />
                <ScrollView contentContainerStyle={styles.revealScroll} showsVerticalScrollIndicator={false}>
                    <Animated.View entering={FadeIn.duration(400)}>
                        <Text style={styles.revealEmoji}>🥰</Text>
                        <Text style={styles.gameTitle}>Read together</Text>
                        <Text style={styles.revealSubtitle}>Take turns reading your answers out loud.</Text>
                        {prompts.map((p, i) => (
                            <View key={p.id} style={styles.revealCard}>
                                <Text style={styles.revealPrompt}>{p.prompt}</Text>
                                <View style={styles.revealAnswerRow}>
                                    <View style={styles.revealAnswerBox}>
                                        <Text style={styles.revealPlayerLabel}>Player 1</Text>
                                        <Text style={styles.revealAnswer}>{p1Answers[i] ?? '—'}</Text>
                                    </View>
                                    <View style={[styles.revealAnswerBox, styles.revealAnswerBoxAlt]}>
                                        <Text style={styles.revealPlayerLabel}>Player 2</Text>
                                        <Text style={styles.revealAnswer}>{p2Answers[i] ?? '—'}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.fullBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                                <Text style={styles.btnLabel}>Done ♥</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // p1 or p2 input phase
    const isP1 = phase === 'p1';
    const canSubmit = draft.trim().length > 0;
    const isLastPrompt = promptIndex + 1 >= total;

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.header}>
                    <Text style={styles.playerTag}>{isP1 ? 'Player 1' : 'Player 2'}</Text>
                    <Text style={styles.progress}>{promptIndex + 1} / {total}</Text>
                </View>
                <Animated.View key={`${promptIndex}-${phase}`} entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={styles.inputArea}>
                    <Text style={styles.promptText}>{currentPrompt.prompt}</Text>
                    <TextInput
                        ref={inputRef}
                        style={styles.textInput}
                        placeholder={currentPrompt.placeholder}
                        placeholderTextColor={colors.gray}
                        multiline
                        value={draft}
                        onChangeText={setDraft}
                        autoFocus
                        maxLength={300}
                    />
                    <TouchableOpacity
                        style={[styles.fullBtn, !canSubmit && styles.btnDisabled]}
                        onPress={handleNext}
                        disabled={!canSubmit}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={canSubmit ? gradients.brand : gradients.disabled}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.btnLabel}>{isLastPrompt ? (isP1 ? 'Done, pass to Player 2' : 'Reveal answers') : 'Next'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
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
    fullBtn: { alignSelf: 'stretch' },
    btnDisabled: { opacity: 0.55 },
    btnGradient: { borderRadius: radii.radiusFull, paddingVertical: spacing.lg, alignItems: 'center', ...shadows.glowPrimary },
    btnLabel: { fontFamily: fontFamilies.sans, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.white },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    playerTag: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
    progress: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, color: colors.gray },
    inputArea: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg },
    promptText: { fontFamily: fontFamilies.sans, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.foreground, lineHeight: 28 },
    textInput: {
        flex: 1,
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.md,
        color: colors.foreground,
        backgroundColor: colors.muted,
        borderRadius: radii.radiusMd,
        padding: spacing.lg,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    revealScroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing['2xl'], gap: spacing.lg, alignItems: 'center' },
    revealEmoji: { fontSize: 48, textAlign: 'center', marginBottom: spacing.sm },
    revealSubtitle: { fontFamily: fontFamilies.sans, fontSize: fontSize.base, color: colors.foregroundMuted, textAlign: 'center', marginBottom: spacing.lg },
    revealCard: { backgroundColor: colors.background, borderRadius: radii.radius, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm, marginBottom: spacing.md, alignSelf: 'stretch' },
    revealPrompt: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
    revealAnswerRow: { flexDirection: 'row', gap: spacing.md },
    revealAnswerBox: { flex: 1, backgroundColor: colors.muted, borderRadius: radii.radiusSm, padding: spacing.md },
    revealAnswerBoxAlt: { backgroundColor: colors.accentSoft },
    revealPlayerLabel: { fontFamily: fontFamilies.sans, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary, marginBottom: spacing.xs },
    revealAnswer: { fontFamily: fontFamilies.sans, fontSize: fontSize.sm, color: colors.foreground, lineHeight: 20 },
});
