import React, { useRef, useEffect } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import Animated, {
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
} from 'react-native-reanimated';
import type { ChatMessage } from '@/types/index';
import { MessageBubble } from './MessageBubble';
import { colors, radii, spacing, fontFamilies, fontSize, fontWeight } from '@/theme/tokens';

interface MessageListProps {
    messages: ChatMessage[];
    isLoading: boolean;
    userAvatar?: string | null;
    userName?: string | null;
    partnerAvatar?: string | null;
}

export const MessageList: React.FC<MessageListProps> = React.memo(
    ({ messages, isLoading, userAvatar, userName, partnerAvatar }) => {
    const listRef = useRef<FlatList<ChatMessage>>(null);

    useEffect(() => {
        if (messages.length > 0 || isLoading) {
            listRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages.length, isLoading]);

    return (
        <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <MessageBubble message={item} userAvatar={userAvatar} userName={userName} partnerAvatar={partnerAvatar} />
            )}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyState />}
            ListFooterComponent={isLoading ? <TypingBubble /> : null}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
    );
});

MessageList.displayName = 'MessageList';

const EmptyState: React.FC = () => (
    <View style={styles.emptyWrapper}>
        <Text style={styles.emptyText}>How are you feeling today?</Text>
        <Text style={styles.emptySubtext}>I'm here to listen.</Text>
    </View>
);

const TypingBubble: React.FC = () => (
    <Animated.View entering={FadeIn.duration(200)} style={styles.typingWrapper}>
        <View style={styles.typingBubble}>
            <AnimatedDot delay={0} />
            <AnimatedDot delay={160} />
            <AnimatedDot delay={320} />
        </View>
    </Animated.View>
);

const AnimatedDot: React.FC<{ delay: number }> = ({ delay }) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withDelay(delay, withTiming(1, { duration: 500 })),
            -1,
            true,
        );
    }, [opacity, delay]);

    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return <Animated.View style={[styles.dot, animStyle]} />;
};

const styles = StyleSheet.create({
    content: {
        paddingVertical: spacing.md,
        paddingBottom: spacing.xl,
        flexGrow: 1,
    },
    emptyWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: spacing['2xl'],
    },
    emptyText: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.lg,
        fontWeight: fontWeight.semibold,
        color: colors.foreground,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    emptySubtext: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.regular,
        color: colors.gray,
        textAlign: 'center',
    },
    typingWrapper: {
        marginVertical: spacing.xs,
        marginHorizontal: spacing.lg,
        alignItems: 'flex-start',
    },
    typingBubble: {
        backgroundColor: colors.accentSoft,
        borderRadius: radii.radiusMd,
        borderBottomLeftRadius: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        gap: spacing.xs,
        alignItems: 'center',
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: radii.radiusFull,
        backgroundColor: colors.accent,
    },
});
