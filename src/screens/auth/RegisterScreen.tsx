import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '@components/ui/GradientButton';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@store/authStore';
import {
    validateEmail,
    validatePassword,
    validatePasswordMatch,
} from '@domain/auth/validation';
import { colors, gradients, radii, spacing, shadows, layout, fontFamilies, fontSize, fontWeight, textStyles } from '@/theme/tokens';
import type { RegisterScreenProps } from '@/navigation/types';

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [confirmFocused, setConfirmFocused] = useState(false);

    const { signUp } = useAuth();
    const isLoading = useAuthStore((s) => s.isLoading);
    const error = useAuthStore((s) => s.error);

    const handleRegister = async () => {
        setSubmitted(true);

        const emailResult = validateEmail(email);
        const passwordResult = validatePassword(password);
        const confirmResult = validatePasswordMatch(password, confirmPassword);

        setEmailError(emailResult.valid ? null : emailResult.error);
        setPasswordError(passwordResult.valid ? null : passwordResult.error);
        setConfirmError(confirmResult.valid ? null : confirmResult.error);

        if (!emailResult.valid || !passwordResult.valid || !confirmResult.valid) return;

        await signUp(email.trim(), password);
        // SR-15: Clear passwords from memory after submission
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <LinearGradient colors={gradients.heroWash} style={styles.container}>
            <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.inner}
                >
                    <ScrollView
                        contentContainerStyle={styles.scroll}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Back */}
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
                        </TouchableOpacity>

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.emoji}>✨</Text>
                            <Text style={styles.title}>Create account</Text>
                            <Text style={styles.subtitle}>
                                Start your couple journey together
                            </Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            {/* Email */}
                            <View style={styles.fieldGroup}>
                                <View style={[styles.inputWrap, emailFocused && styles.inputFocused, submitted && emailError && styles.inputError]}>
                                    <Ionicons
                                        name="mail-outline"
                                        size={20}
                                        color={emailFocused ? colors.primary : colors.gray}
                                    />
                                    <TextInput
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (submitted) {
                                                const result = validateEmail(text);
                                                setEmailError(result.valid ? null : result.error);
                                            }
                                        }}
                                        onFocus={() => setEmailFocused(true)}
                                        onBlur={() => setEmailFocused(false)}
                                        placeholder="Email address"
                                        placeholderTextColor={colors.gray}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoComplete="email"
                                        keyboardType="email-address"
                                        textContentType="emailAddress"
                                        returnKeyType="next"
                                        style={styles.input}
                                    />
                                </View>
                                {submitted && emailError && (
                                    <Text style={styles.errorText}>{emailError}</Text>
                                )}
                            </View>

                            {/* Password */}
                            <View style={styles.fieldGroup}>
                                <View style={[styles.inputWrap, passwordFocused && styles.inputFocused, submitted && passwordError && styles.inputError]}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={20}
                                        color={passwordFocused ? colors.primary : colors.gray}
                                    />
                                    <TextInput
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (submitted) {
                                                const result = validatePassword(text);
                                                setPasswordError(result.valid ? null : result.error);
                                            }
                                        }}
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => setPasswordFocused(false)}
                                        placeholder="Password"
                                        placeholderTextColor={colors.gray}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoComplete="new-password"
                                        textContentType="newPassword"
                                        returnKeyType="next"
                                        style={styles.input}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword((prev) => !prev)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.gray}
                                        />
                                    </TouchableOpacity>
                                </View>
                                {submitted && passwordError && (
                                    <Text style={styles.errorText}>{passwordError}</Text>
                                )}
                            </View>

                            {/* Confirm password */}
                            <View style={styles.fieldGroup}>
                                <View style={[styles.inputWrap, confirmFocused && styles.inputFocused, submitted && confirmError && styles.inputError]}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={20}
                                        color={confirmFocused ? colors.primary : colors.gray}
                                    />
                                    <TextInput
                                        value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            if (submitted) {
                                                const result = validatePasswordMatch(password, text);
                                                setConfirmError(result.valid ? null : result.error);
                                            }
                                        }}
                                        onFocus={() => setConfirmFocused(true)}
                                        onBlur={() => setConfirmFocused(false)}
                                        placeholder="Confirm password"
                                        placeholderTextColor={colors.gray}
                                        secureTextEntry={!showConfirm}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        autoComplete="new-password"
                                        textContentType="newPassword"
                                        returnKeyType="done"
                                        onSubmitEditing={() => { void handleRegister(); }}
                                        style={styles.input}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirm((prev) => !prev)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons
                                            name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.gray}
                                        />
                                    </TouchableOpacity>
                                </View>
                                {submitted && confirmError && (
                                    <Text style={styles.errorText}>{confirmError}</Text>
                                )}
                            </View>
                        </View>

                        {/* General error banner */}
                        {error && (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle" size={18} color={colors.error} />
                                <Text style={styles.errorBannerText}>{error}</Text>
                            </View>
                        )}

                        {/* CTA */}
                        <GradientButton
                            label="Create Account"
                            onPress={() => { void handleRegister(); }}
                            size="lg"
                            fullWidth
                            loading={isLoading}
                        />

                        {/* Login link */}
                        <TouchableOpacity
                            style={styles.linkRow}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.linkText}>
                                Already have an account?{' '}
                            </Text>
                            <Text style={styles.linkTextBold}>Log in</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safe: { flex: 1 },
    inner: { flex: 1 },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: layout.screenPaddingH,
        paddingBottom: spacing['2xl'],
        gap: spacing.xl,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
    header: {
        gap: spacing.md,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    emoji: { fontSize: 48 },
    title: {
        ...textStyles.displaySm,
        color: colors.foreground,
        textAlign: 'center',
    },
    subtitle: {
        ...textStyles.bodyMd,
        color: colors.gray,
        textAlign: 'center',
        maxWidth: 280,
    },
    form: {
        gap: spacing.lg,
    },
    fieldGroup: {
        gap: spacing.xs,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: radii.radiusMd,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.borderDefault,
        gap: spacing.md,
        ...shadows.sm,
    },
    inputFocused: {
        borderColor: colors.primary,
        ...shadows.md,
    },
    inputError: {
        borderColor: colors.error,
    },
    input: {
        flex: 1,
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.md,
        color: colors.foreground,
        fontWeight: fontWeight.medium,
    },
    errorText: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        color: colors.error,
        paddingLeft: spacing.lg,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.errorBg,
        borderRadius: radii.radiusSm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    errorBannerText: {
        flex: 1,
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        color: colors.error,
        fontWeight: fontWeight.medium,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    linkText: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        color: colors.gray,
    },
    linkTextBold: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: fontWeight.semibold,
    },
});
