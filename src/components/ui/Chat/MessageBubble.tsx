import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { ChatMessage } from '@/types/index';
import {
    colors,
    gradients,
    radii,
    spacing,
    fontFamilies,
    fontSize,
    fontWeight,
    shadows,
} from '@/theme/tokens';

// ─── Emoji Loop Strip ─────────────────────────────────────────────────────────

const EMOJI_POOL = ['💕', '✨', '🌸', '💫', '🫶', '💌', '🩷', '🌷'] as const;

function pickEmojis(messageId: string): string[] {
    const seed = messageId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return Array.from({ length: 5 }, (_, i) => EMOJI_POOL[(seed + i * 3) % EMOJI_POOL.length]);
}

const PulsingEmoji: React.FC<{ emoji: string; delay: number }> = ({ emoji, delay }) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withDelay(delay, withTiming(1, { duration: 450 })),
            -1,
            true,
        );
    }, [opacity, delay]);

    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return <Animated.Text style={[styles.emojiChar, animStyle]}>{emoji}</Animated.Text>;
};

interface EmojiLoopStripProps {
    messageId: string;
    isStreaming: boolean;
}

// Always stays in the DOM once rendered — manages its own opacity + height collapse
// so the bubble below never jumps.
const EmojiLoopStrip: React.FC<EmojiLoopStripProps> = React.memo(({ messageId, isStreaming }) => {
    const opacity = useSharedValue(1);
    // Sentinel value ≥ 999 means "unconstrained / auto height".
    // Once we begin collapsing we set it to the measured height then tween to 0.
    const animHeight = useSharedValue(999);
    const measuredHeightRef = useRef(0);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && measuredHeightRef.current === 0) {
            measuredHeightRef.current = h;
        }
    }, []);

    useEffect(() => {
        if (!isStreaming) {
            // 1. Fade out over 5 s
            opacity.value = withTiming(0, { duration: 5000 });

            // 2. After fade, pin to measured height, then smoothly collapse to 0
            //    (invisible at this point so the layout shift is imperceptible)
            const timer = setTimeout(() => {
                const h = measuredHeightRef.current > 0 ? measuredHeightRef.current : 40;
                animHeight.value = h; // instant — user can't see it (opacity = 0)
                requestAnimationFrame(() => {
                    animHeight.value = withTiming(0, { duration: 300 });
                });
            }, 5100);

            return () => clearTimeout(timer);
        }
    }, [isStreaming, opacity, animHeight]);

    const containerStyle = useAnimatedStyle(() => {
        if (animHeight.value >= 999) {
            // Normal flow — no height constraint
            return { opacity: opacity.value };
        }
        return {
            opacity: opacity.value,
            height: Math.max(0, animHeight.value),
            overflow: 'hidden',
        };
    });

    const emojis = pickEmojis(messageId);
    return (
        <Animated.View style={[styles.emojiStrip, containerStyle]} onLayout={onLayout}>
            {emojis.map((emoji, i) => (
                <PulsingEmoji key={i} emoji={emoji} delay={i * 120} />
            ))}
        </Animated.View>
    );
});
EmojiLoopStrip.displayName = 'EmojiLoopStrip';

// ─── Typewriter Typing Effect ─────────────────────────────────────────────────

const PUNCTUATION_PAUSE: Readonly<Record<string, number>> = {
    '.': 220,
    '!': 220,
    '?': 220,
    ',': 90,
};

// ─── Assistant Bubble with Typewriter + Glow ─────────────────────────────────

const AssistantBubble: React.FC<{ text: string; isStreaming: boolean }> = React.memo(
    ({ text, isStreaming }) => {
        const [displayed, setDisplayed] = useState(() => (isStreaming ? '' : text));
        const bufferRef = useRef(text);
        const displayedLenRef = useRef(isStreaming ? 0 : text.length);
        const rafRef = useRef<number | null>(null);
        const nextFireRef = useRef<number>(0);

        // Keep buffer current as chunks arrive
        useEffect(() => {
            bufferRef.current = text;
        }, [text]);

        // Fast-forward to full text when streaming ends
        useEffect(() => {
            if (!isStreaming) {
                if (rafRef.current !== null) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = null;
                }
                setDisplayed(bufferRef.current);
                displayedLenRef.current = bufferRef.current.length;
            }
        }, [isStreaming]);

        // RAF-driven typing loop
        useEffect(() => {
            if (!isStreaming) return;

            function tick(ts: number): void {
                if (displayedLenRef.current >= bufferRef.current.length) {
                    rafRef.current = requestAnimationFrame(tick);
                    return;
                }
                if (ts < nextFireRef.current) {
                    rafRef.current = requestAnimationFrame(tick);
                    return;
                }
                displayedLenRef.current += 1;
                const next = bufferRef.current.slice(0, displayedLenRef.current);
                setDisplayed(next);
                const lastChar = next[next.length - 1] ?? '';
                const pause = PUNCTUATION_PAUSE[lastChar] ?? 0;
                nextFireRef.current = ts + 25 + Math.random() * 25 + pause;
                rafRef.current = requestAnimationFrame(tick);
            }

            rafRef.current = requestAnimationFrame(tick);
            return () => {
                if (rafRef.current !== null) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = null;
                }
            };
        }, [isStreaming]);

        // Glow pulse while streaming (effect E)
        const glowRadius = useSharedValue(4);
        const glowOpacity = useSharedValue(0);

        useEffect(() => {
            if (isStreaming) {
                glowOpacity.value = withTiming(0.5, { duration: 300 });
                glowRadius.value = withRepeat(
                    withTiming(12, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                    -1,
                    true,
                );
            } else {
                glowOpacity.value = withTiming(0, { duration: 500 });
                glowRadius.value = withTiming(4, { duration: 500 });
            }
        }, [isStreaming, glowRadius, glowOpacity]);

        const glowStyle = useAnimatedStyle(() => ({
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: glowRadius.value,
            shadowOpacity: glowOpacity.value,
        }));

        return (
            <Animated.View
                style={[
                    styles.bubble,
                    styles.bubbleAssistant,
                    { elevation: isStreaming ? 6 : 0 },
                    glowStyle,
                ]}
            >
                <Text style={styles.textAssistant}>{displayed}</Text>
            </Animated.View>
        );
    },
);
AssistantBubble.displayName = 'AssistantBubble';

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
    message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message }) => {
    const isUser = message.role === 'user';
    const isPartner = message.role === 'partner';
    const isAssistant = message.role === 'assistant';
    const isStreaming = isAssistant && message.status === 'sending';

    // Frozen at mount: true only for messages that were streaming when added.
    // Prevents emoji strip from ever appearing on history messages.
    const [showEmojiStrip] = useState(isStreaming);

    return (
        <Animated.View
            entering={FadeInUp.duration(260).springify()}
            style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}
        >
            {isUser ? (
                <LinearGradient
                    colors={gradients.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bubble, styles.bubbleUser]}
                >
                    <Text style={styles.textUser}>{message.text}</Text>
                </LinearGradient>
            ) : isPartner ? (
                <>
                    {message.senderName !== undefined && (
                        <Text style={styles.senderLabel}>{message.senderName}</Text>
                    )}
                    <View style={[styles.bubble, styles.bubblePartner]}>
                        <Text style={styles.textPartner}>{message.text}</Text>
                    </View>
                </>
            ) : (
                <>
                    {showEmojiStrip && (
                        <EmojiLoopStrip messageId={message.id} isStreaming={isStreaming} />
                    )}
                    <AssistantBubble text={message.text} isStreaming={isStreaming} />
                </>
            )}
        </Animated.View>
    );
});

MessageBubble.displayName = 'MessageBubble';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    wrapper: {
        marginVertical: spacing.xs,
        marginHorizontal: spacing.lg,
    },
    wrapperUser: { alignItems: 'flex-end' },
    wrapperAssistant: { alignItems: 'flex-start' },
    bubble: {
        maxWidth: '78%',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radii.radiusMd,
    },
    bubbleUser: {
        borderBottomRightRadius: spacing.xs,
        ...shadows.glowPrimary,
    },
    bubbleAssistant: {
        backgroundColor: colors.accentSoft,
        borderBottomLeftRadius: spacing.xs,
    },
    bubblePartner: {
        backgroundColor: colors.muted,
        borderBottomLeftRadius: spacing.xs,
    },
    textPartner: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.regular,
        color: colors.foreground,
        lineHeight: fontSize.base * 1.5,
    },
    senderLabel: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
        color: colors.gray,
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
    },
    textUser: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.regular,
        color: colors.white,
        lineHeight: fontSize.base * 1.5,
    },
    textAssistant: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.regular,
        color: colors.foreground,
        lineHeight: fontSize.base * 1.5,
    },
    emojiStrip: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    emojiChar: {
        fontSize: 16,
    },
});
