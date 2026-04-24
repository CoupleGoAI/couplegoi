import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { useAnimatedStyle } from 'react-native-reanimated';
import DateTimePicker, {
    type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
    colors,
    gradients,
    radii,
    spacing,
    shadows,
    fontFamilies,
    fontSize,
    fontWeight,
    textStyles,
} from '@/theme/tokens';

// ── HeaderRow ────────────────────────────────────────────────────────────────

export const HeaderRow = React.memo(function HeaderRow({
    onBack,
}: {
    onBack: () => void;
}): React.ReactElement {
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBack} hitSlop={8}>
                <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.headerSpacer} />
        </View>
    );
});

// ── AvatarCircle ─────────────────────────────────────────────────────────────

interface AvatarCircleProps {
    initial: string;
    avatarUrl: string | null;
    isUploading: boolean;
    animStyle: ReturnType<typeof useAnimatedStyle>;
    onPress: () => void;
}

export const AvatarCircle = React.memo(function AvatarCircle({
    initial,
    avatarUrl,
    isUploading,
    animStyle,
    onPress,
}: AvatarCircleProps): React.ReactElement {
    return (
        <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.avatarTouchable}>
            <Animated.View style={[styles.avatarOuter, animStyle]}>
                {avatarUrl ? (
                    <Image
                        source={{ uri: avatarUrl }}
                        style={styles.avatarImage}
                    />
                ) : (
                    <LinearGradient
                        colors={gradients.brand}
                        style={styles.avatarGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.avatarInitial}>{initial}</Text>
                    </LinearGradient>
                )}

                {isUploading && (
                    <View style={styles.avatarOverlay}>
                        <ActivityIndicator color={colors.white} size="small" />
                    </View>
                )}

                <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={14} color={colors.primary} />
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
});

// ── FormSection ──────────────────────────────────────────────────────────────

interface FormSectionProps {
    delay: number;
    label: string;
    children: React.ReactNode;
}

export const FormSection = React.memo(function FormSection({
    delay,
    label,
    children,
}: FormSectionProps): React.ReactElement {
    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.section}>
            <Text style={styles.label}>{label}</Text>
            {children}
        </Animated.View>
    );
});

// ── ErrorBanner ──────────────────────────────────────────────────────────────

export const ErrorBanner = React.memo(function ErrorBanner({
    message,
}: {
    message: string;
}): React.ReactElement {
    return (
        <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{message}</Text>
        </View>
    );
});

// ── DateFieldRow ─────────────────────────────────────────────────────────────

interface DateFieldRowProps {
    label: string;
    value: Date | null;
    displayStr: string;
    showPicker: boolean;
    onPress: () => void;
    onChange: (event: DateTimePickerEvent, date?: Date) => void;
    maximumDate?: Date;
    minimumDate?: Date;
}

export const DateFieldRow = React.memo(function DateFieldRow({
    label,
    value,
    displayStr,
    showPicker,
    onPress,
    onChange,
    maximumDate,
    minimumDate,
}: DateFieldRowProps): React.ReactElement {
    return (
        <View>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
                style={styles.input}
                accessibilityLabel={label}
                accessibilityRole="button"
            >
                <Text style={displayStr ? styles.inputText : styles.inputPlaceholder}>
                    {displayStr || 'Set date'}
                </Text>
            </TouchableOpacity>

            {showPicker && (
                <View style={styles.pickerContainer}>
                    <DateTimePicker
                        value={value ?? new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onChange}
                        maximumDate={maximumDate}
                        minimumDate={minimumDate}
                        textColor={colors.foreground}
                        accentColor={colors.primary}
                    />
                    {Platform.OS === 'ios' && (
                        <TouchableOpacity
                            style={styles.pickerDone}
                            onPress={onPress}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
});

// ── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 88;
const CAMERA_ICON_SIZE = 28;

export const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        ...textStyles.h2,
        color: colors.foreground,
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: { width: 24 },
    scroll: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['2xl'],
    },
    avatarTouchable: { alignSelf: 'center', marginVertical: spacing.xl },
    avatarOuter: { position: 'relative' as const },
    avatarGradient: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: radii.radiusFull,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.glowPrimary,
    },
    avatarImage: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: radii.radiusFull,
    },
    avatarInitial: {
        fontFamily: fontFamilies.serifBold,
        fontSize: fontSize['3xl'],
        fontWeight: fontWeight.bold,
        color: colors.white,
    },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: radii.radiusFull,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: CAMERA_ICON_SIZE,
        height: CAMERA_ICON_SIZE,
        borderRadius: radii.radiusFull,
        backgroundColor: colors.background,
        borderWidth: 1.5,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: { marginTop: spacing.lg, gap: spacing.xs },
    label: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.foregroundMuted,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: radii.radiusMd,
        borderWidth: 1,
        borderColor: colors.borderDefault,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        ...shadows.sm,
    },
    inputText: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        color: colors.foreground,
    },
    inputPlaceholder: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        color: colors.gray,
    },
    textInput: {
        backgroundColor: colors.background,
        borderRadius: radii.radiusMd,
        borderWidth: 1,
        borderColor: colors.borderDefault,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        color: colors.foreground,
        ...shadows.sm,
    },
    hint: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        color: colors.gray,
        marginTop: spacing.xs,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.errorBg,
        borderRadius: radii.radiusSm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    errorText: {
        flex: 1,
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.error,
    },
    actions: { marginTop: spacing['2xl'], gap: spacing.lg },
    memoryBtn: {
        alignSelf: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.radiusFull,
        borderWidth: 1.5,
        borderColor: colors.borderDefault,
    },
    memoryLabel: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.foregroundMuted,
    },
    secondaryRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    secondaryBtn: {
        alignItems: 'center',
    },
    disconnectBtn: {
        alignSelf: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.radiusFull,
        borderWidth: 1.5,
        borderColor: colors.error,
    },
    disconnectLabel: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.error,
    },
    deleteBtn: {
        alignSelf: 'center',
        marginTop: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.radiusFull,
    },
    deleteLabel: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.gray,
        textDecorationLine: 'underline',
    },
    logoutBtn: {
        alignSelf: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.radiusFull,
        borderWidth: 1.5,
        borderColor: colors.gray,
    },
    logoutLabel: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.gray,
    },
    pickerContainer: {
        marginTop: spacing.sm,
        backgroundColor: colors.background,
        borderRadius: radii.radiusMd,
        borderWidth: 1,
        borderColor: colors.borderDefault,
        overflow: 'hidden',
    },
    pickerDone: {
        alignSelf: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    pickerDoneText: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
    },
});
