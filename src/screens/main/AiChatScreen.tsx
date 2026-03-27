import React, { useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ChatMode } from '@/types/index';
import type { RootNavProp } from '@navigation/types';
import { useAiChat } from '@hooks/useAiChat';
import { useAuthStore } from '@store/authStore';
import { ChatContainer } from '@components/ui/Chat';
import { colors, gradients } from '@/theme/tokens';

export function AiChatScreen(): React.ReactElement {
    const navigation = useNavigation<RootNavProp>();
    const coupleId = useAuthStore((s) => s.user?.coupleId);
    const [mode, setMode] = useState<ChatMode>('single');
    const { messages, isHistoryLoading, isStreaming, error, send } = useAiChat(mode);

    const handleSend = useCallback(
        (text: string) => {
            void send(text);
        },
        [send],
    );

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    if (isHistoryLoading && messages.length === 0) {
        return (
            <LinearGradient colors={gradients.heroWash} style={styles.loading}>
                <ActivityIndicator color={colors.primary} size="large" />
            </LinearGradient>
        );
    }

    return (
        <ChatContainer
            messages={messages}
            isLoading={isStreaming}
            mode={mode}
            isCoupled={coupleId !== null && coupleId !== undefined}
            onModeChange={setMode}
            onSend={handleSend}
            onBack={handleBack}
            error={error}
        />
    );
}

// StyleSheet used here because LinearGradient requires a style object for flex layout
const styles = StyleSheet.create({
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
