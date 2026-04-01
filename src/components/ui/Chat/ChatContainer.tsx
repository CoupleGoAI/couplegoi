import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage, ChatMode } from '@/types/index';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import {
    colors,
    gradients,
    radii,
    spacing,
    layout,
    fontFamilies,
    fontSize,
    fontWeight,
} from '@/theme/tokens';

interface ChatContainerProps {
    messages: ChatMessage[];
    isLoading: boolean;
    mode: ChatMode;
    isCoupled?: boolean;
    userAvatar?: string | null;
    userName?: string | null;
    partnerAvatar?: string | null;
    onModeChange: (mode: ChatMode) => void;
    onSend: (text: string) => void;
    onBack?: () => void;
    error?: string | null;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
    messages,
    isLoading,
    mode,
    isCoupled = false,
    userAvatar,
    userName,
    partnerAvatar,
    onModeChange,
    onSend,
    onBack,
    error,
}) => (
    <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient
            colors={gradients.heroWash}
            style={styles.headerWash}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        />
        <Header onBack={onBack} />
        <ModeToggle mode={mode} isCoupled={isCoupled} onModeChange={onModeChange} />
        <KeyboardAvoidingView
            style={styles.body}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <MessageList
                    messages={messages}
                    isLoading={isLoading}
                    userAvatar={userAvatar}
                    userName={userName}
                    partnerAvatar={partnerAvatar}
                />
            {error !== null && error !== undefined && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
            <InputBar onSend={onSend} disabled={isLoading} />
        </KeyboardAvoidingView>
    </SafeAreaView>
);

ChatContainer.displayName = 'ChatContainer';

interface HeaderProps {
    onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBack }) => (
    <View style={styles.header}>
        {onBack !== undefined ? (
            <TouchableOpacity
                onPress={onBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.backButton}
            >
                <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
        ) : (
            <View style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>AI Companion</Text>
        <View style={styles.backButton} />
    </View>
);

interface ModeToggleProps {
    mode: ChatMode;
    isCoupled: boolean;
    onModeChange: (mode: ChatMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, isCoupled, onModeChange }) => (
    <View style={styles.toggleRow}>
        <View style={styles.toggleContainer}>
            <TouchableOpacity
                style={styles.toggleTab}
                onPress={() => onModeChange('single')}
                activeOpacity={0.8}
            >
                {mode === 'single' ? (
                    <LinearGradient
                        colors={gradients.brand}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.toggleActive}
                    >
                        <Text style={styles.toggleTextActive}>Solo</Text>
                    </LinearGradient>
                ) : (
                    <Text style={styles.toggleTextInactive}>Solo</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.toggleTab}
                onPress={() => isCoupled && onModeChange('couple')}
                activeOpacity={isCoupled ? 0.8 : 0.5}
                disabled={!isCoupled}
            >
                {mode === 'couple' ? (
                    <LinearGradient
                        colors={gradients.brand}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.toggleActive}
                    >
                        <Text style={styles.toggleTextActive}>Together</Text>
                    </LinearGradient>
                ) : isCoupled ? (
                    <Text style={styles.toggleTextInactive}>Together</Text>
                ) : (
                    <>
                        <Ionicons name="lock-closed" size={11} color={colors.gray} style={styles.lockIcon} />
                        <Text style={styles.toggleTextLocked}>Together</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    </View>
);

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerWash: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 180,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        height: layout.headerHeight,
    },
    backButton: {
        width: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.foreground,
    },
    toggleRow: {
        alignItems: 'center',
        paddingBottom: spacing.md,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.muted,
        borderRadius: radii.radiusFull,
        padding: 3,
    },
    toggleTab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: radii.radiusFull,
        minWidth: 96,
        gap: spacing.xs,
    },
    toggleActive: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: radii.radiusFull,
        minWidth: 96,
        marginHorizontal: -spacing.xl,
        marginVertical: -spacing.sm,
    },
    toggleTextActive: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semibold,
        color: colors.white,
    },
    toggleTextInactive: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.foregroundMuted,
    },
    toggleTextLocked: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: colors.gray,
    },
    lockIcon: {
        marginTop: 1,
    },
    body: {
        flex: 1,
    },
    errorBanner: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        backgroundColor: colors.errorBg,
        borderRadius: radii.radiusSm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    errorText: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.sm,
        color: colors.error,
    },
});
