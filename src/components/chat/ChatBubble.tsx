import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, spacing, fontFamilies, fontSize, fontWeight } from '@/theme/tokens';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

interface ChatBubbleProps {
  message: ChatMessage;
}

/** Formats a Unix-ms timestamp to "h:mm AM/PM" */
function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Chat message bubble.
 * - AI (assistant): left-aligned, muted background with soft border.
 * - User: right-aligned, brand gradient (pink → lavender), white text.
 */
export const ChatBubble = React.memo(({ message }: ChatBubbleProps) => {
  const isUser = message.role === 'user';
  const timeLabel = formatTime(message.createdAt);

  if (isUser) {
    return (
      <View style={styles.rowRight}>
        <View style={styles.userOuter}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.userBubble}
          >
            <Text style={styles.userText}>{message.content}</Text>
          </LinearGradient>
          <Text style={styles.timestamp}>{timeLabel}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rowLeft}>
      <View style={styles.aiOuter}>
        <View style={styles.aiBubble}>
          <Text style={styles.aiText}>{message.content}</Text>
        </View>
        <Text style={styles.timestamp}>{timeLabel}</Text>
      </View>
    </View>
  );
});

ChatBubble.displayName = 'ChatBubble';

// StyleSheet.create used because bubble max-widths (percentage), gradient container
// sizing, and precise border radii combinations aren't reliably expressible in NativeWind.
const styles = StyleSheet.create({
  rowLeft: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  rowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  aiOuter: {
    maxWidth: '78%',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  userOuter: {
    maxWidth: '78%',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  aiBubble: {
    backgroundColor: colors.muted,
    borderRadius: radii.radiusMd,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  userBubble: {
    borderRadius: radii.radiusMd,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  aiText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    color: colors.foreground,
    lineHeight: fontSize.base * 1.5,
  },
  userText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.white,
    lineHeight: fontSize.base * 1.5,
  },
  timestamp: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.xs,
    color: colors.gray,
  },
});
