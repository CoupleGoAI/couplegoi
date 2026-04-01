import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { InteractivePayload } from '@/types/index';
import { DatePickerMessage } from './DatePickerMessage';
import { spacing, shadows } from '@/theme/tokens';

interface InteractiveMessageBubbleProps {
    payload: InteractivePayload;
    onConfirm: (value: string) => void;
}

/**
 * Renders an interactive chat message (not owned by user or assistant).
 * Appears centered in the message list. Add new payload types here to extend.
 */
export const InteractiveMessageBubble: React.FC<InteractiveMessageBubbleProps> = ({
    payload,
    onConfirm,
}) => (
    <View style={styles.wrapper}>
        {payload.type === 'date-picker' && (
            <DatePickerMessage
                minDate={payload.minDate}
                maxDate={payload.maxDate}
                onConfirm={onConfirm}
            />
        )}
    </View>
);

InteractiveMessageBubble.displayName = 'InteractiveMessageBubble';

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        marginVertical: spacing.md,
        marginHorizontal: spacing.lg,
        ...shadows.sm,
    },
});
