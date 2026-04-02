import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, radii, spacing, shadows, fontFamilies, fontSize } from '@/theme/tokens';

interface InputBarProps {
    onSend: (text: string) => void;
    disabled: boolean;
    placeholder?: string;
}

export const InputBar: React.FC<InputBarProps> = React.memo(({ onSend, disabled, placeholder }) => {
    const [text, setText] = useState('');
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    const sendAnimStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed || disabled) return;

        scale.value = withSequence(
            withTiming(1.12, { duration: 200, easing: Easing.out(Easing.cubic) }),
            withSpring(1, { damping: 14, stiffness: 180 }),
        );
        // Quintic ease-out: high initial angular velocity decelerates like a wheel losing momentum
        // 720° = 2 full rotations, ends at same visual position as 0° so instant reset is seamless
        rotation.value = withSequence(
            withTiming(720, { duration: 900, easing: Easing.out(Easing.poly(5)) }),
            withTiming(0, { duration: 0 }),
        );

        onSend(trimmed);
        setText('');
    }, [text, disabled, onSend, scale, rotation]);

    const canSend = text.trim().length > 0 && !disabled;

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder={placeholder ?? 'Say something...'}
                placeholderTextColor={colors.gray}
                selectionColor={colors.primary}
                multiline
                maxLength={2000}
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={handleSend}
                textAlignVertical="top"
                editable={!disabled}
            />
            <Animated.View style={sendAnimStyle}>
                <TouchableOpacity
                    onPress={handleSend}
                    disabled={!canSend}
                    activeOpacity={0.75}
                    style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                    <LinearGradient
                        colors={canSend ? gradients.brand : gradients.disabled}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sendGradient}
                    >
                        <Ionicons name="heart" size={22} color={colors.white} />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
});

InputBar.displayName = 'InputBar';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.borderDefault,
    },
    input: {
        flex: 1,
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        color: colors.foreground,
        backgroundColor: colors.muted,
        borderRadius: radii.radiusMd,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        maxHeight: 120,
        minHeight: 48,
        textAlignVertical: 'top',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: radii.radiusFull,
        overflow: 'hidden',
        marginBottom: 2,
        ...shadows.glowPrimary,
    },
    sendButtonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
        elevation: 0,
    },
    sendGradient: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
