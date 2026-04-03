import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
    cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import GradientButton from '@components/ui/GradientButton';
import {
    colors,
    radii,
    spacing,
    fontFamilies,
    fontSize,
    fontWeight,
} from '@/theme/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 44;
const COLUMN_HEIGHT = ITEM_HEIGHT * 3; // 3 visible rows; centre row = selected

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SPRING_CONFIG = { damping: 18, stiffness: 180 } as const;

function daysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function parseIsoOrToday(iso?: string): Date {
    if (iso) {
        const d = new Date(iso + 'T12:00:00');
        if (!isNaN(d.getTime())) return d;
    }
    return new Date();
}

function isoFromParts(year: number, month: number, day: number): string {
    const y = year.toString().padStart(4, '0');
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ─── Haptics ──────────────────────────────────────────────────────────────────

// Called from the UI thread via runOnJS. Velocity (px/s) drives the style so
// fast flicks feel heavier — mimicking the iPhone native picker behaviour.
function hapticTick(absVelocity: number): void {
    if (absVelocity > 2000) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (absVelocity > 700) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (absVelocity > 150) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
        void Haptics.selectionAsync();
    }
}

// ─── Single Column ────────────────────────────────────────────────────────────
// Uses GestureDetector so the pan gesture is handled in RNGH's native system,
// preventing the outer FlatList (chat) from stealing the vertical scroll.

interface ColumnProps {
    data: string[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

const PickerColumn: React.FC<ColumnProps> = React.memo(({ data, selectedIndex, onSelect }) => {
    // translateY = 0 → item 0 centred (items are offset by ITEM_HEIGHT padding at top)
    // translateY = -i * ITEM_HEIGHT → item i centred
    const translateY = useSharedValue(-selectedIndex * ITEM_HEIGHT);
    const startY = useSharedValue(0);
    // Tracks which item last triggered a haptic so we fire once per item tick
    const lastHapticIndex = useSharedValue(selectedIndex);

    // Sync position when selectedIndex is changed externally (e.g. day clamp on month change)
    useEffect(() => {
        const target = -selectedIndex * ITEM_HEIGHT;
        if (Math.abs(translateY.value - target) > 1) {
            translateY.value = withSpring(target, SPRING_CONFIG);
        }
        // translateY is a stable SharedValue ref — omitting from deps is intentional
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIndex]);

    const maxT = 0; // item 0 at centre
    const minT = -(data.length - 1) * ITEM_HEIGHT; // last item at centre

    const pan = Gesture.Pan()
        .onBegin(() => {
            cancelAnimation(translateY);
            startY.value = translateY.value;
            lastHapticIndex.value = Math.max(0, Math.min(data.length - 1, Math.round(-translateY.value / ITEM_HEIGHT)));
        })
        .onUpdate((e) => {
            const clamped = Math.max(minT, Math.min(maxT, startY.value + e.translationY));
            translateY.value = clamped;

            // Fire one haptic each time the centred item changes
            const current = Math.max(0, Math.min(data.length - 1, Math.round(-clamped / ITEM_HEIGHT)));
            if (current !== lastHapticIndex.value) {
                lastHapticIndex.value = current;
                runOnJS(hapticTick)(Math.abs(e.velocityY));
            }
        })
        .onEnd((e) => {
            // Project forward using velocity to pick the landing item naturally
            const projected = translateY.value + e.velocityY * 0.1;
            const raw = -projected / ITEM_HEIGHT;
            const snapped = Math.max(0, Math.min(data.length - 1, Math.round(raw)));
            translateY.value = withSpring(-snapped * ITEM_HEIGHT, SPRING_CONFIG);
            runOnJS(onSelect)(snapped);
        });

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <GestureDetector gesture={pan}>
            <View style={styles.column}>
                {/* Highlight band sits behind items in the vertical centre */}
                <View style={styles.selectionBand} pointerEvents="none" />
                <Animated.View style={[styles.columnItems, animStyle]}>
                    {data.map((item, index) => {
                        const isSelected = index === selectedIndex;
                        return (
                            <View key={index} style={styles.item}>
                                <Text
                                    style={[
                                        styles.itemText,
                                        isSelected ? styles.itemTextSelected : styles.itemTextMuted,
                                    ]}
                                >
                                    {item}
                                </Text>
                            </View>
                        );
                    })}
                </Animated.View>
            </View>
        </GestureDetector>
    );
});
PickerColumn.displayName = 'PickerColumn';

// ─── Date Picker Message ──────────────────────────────────────────────────────

interface DatePickerMessageProps {
    title?: string;
    minDate?: string;
    maxDate?: string;
    onConfirm: (isoDate: string) => void;
}

export const DatePickerMessage: React.FC<DatePickerMessageProps> = ({
    title,
    minDate,
    maxDate,
    onConfirm,
}) => {
    const maxBound = parseIsoOrToday(maxDate);
    const minBound = minDate ? parseIsoOrToday(minDate) : new Date(1900, 0, 1);
    const initial = maxBound;
    const maxYear = maxBound.getFullYear();
    const minYear = minBound.getFullYear();

    const YEARS = Array.from(
        { length: maxYear - minYear + 1 },
        (_, i) => String(maxYear - i),
    );

    const [monthIdx, setMonthIdx] = useState(initial.getMonth());
    const [dayIdx, setDayIdx] = useState(initial.getDate() - 1); // 0-based
    const [yearIdx, setYearIdx] = useState(0); // index 0 = maxYear

    const currentYear = maxYear - yearIdx;
    const monthMinIdx = currentYear === minYear ? minBound.getMonth() : 0;
    const monthMaxIdx = currentYear === maxYear ? maxBound.getMonth() : 11;
    const clampedMonthIdx = Math.max(monthMinIdx, Math.min(monthIdx, monthMaxIdx));

    const maxDaysInMonth = daysInMonth(clampedMonthIdx, currentYear);
    const dayMin = currentYear === minYear && clampedMonthIdx === minBound.getMonth()
        ? minBound.getDate()
        : 1;
    const dayMax = currentYear === maxYear && clampedMonthIdx === maxBound.getMonth()
        ? maxBound.getDate()
        : maxDaysInMonth;
    const clampedDayIdx = Math.max(dayMin - 1, Math.min(dayIdx, dayMax - 1));

    const allowedMonths = MONTHS.slice(monthMinIdx, monthMaxIdx + 1);
    const DAYS = Array.from({ length: dayMax - dayMin + 1 }, (_, i) =>
        String(dayMin + i).padStart(2, '0'),
    );

    useEffect(() => {
        if (monthIdx !== clampedMonthIdx) {
            setMonthIdx(clampedMonthIdx);
        }
        // We intentionally compare against the calculated bounds and sync if out of range.
    }, [monthIdx, clampedMonthIdx]);

    useEffect(() => {
        if (dayIdx !== clampedDayIdx) {
            setDayIdx(clampedDayIdx);
        }
        // Keep day aligned when year/month changes narrow the available range.
    }, [dayIdx, clampedDayIdx]);

    const handleConfirm = useCallback(() => {
        onConfirm(isoFromParts(currentYear, clampedMonthIdx, clampedDayIdx + 1));
    }, [clampedDayIdx, clampedMonthIdx, currentYear, onConfirm]);

    return (
        <View style={styles.card}>
            <Text style={styles.label}>{title || 'Select a date'}</Text>
            <View style={styles.columnsRow}>
                <PickerColumn
                    data={allowedMonths}
                    selectedIndex={clampedMonthIdx - monthMinIdx}
                    onSelect={(idx) => setMonthIdx(monthMinIdx + idx)}
                />
                <View style={styles.columnDivider} />
                <PickerColumn
                    data={DAYS}
                    selectedIndex={clampedDayIdx - (dayMin - 1)}
                    onSelect={(idx) => setDayIdx(dayMin - 1 + idx)}
                />
                <View style={styles.columnDivider} />
                <PickerColumn data={YEARS} selectedIndex={yearIdx} onSelect={setYearIdx} />
            </View>
            <GradientButton
                label="Confirm date"
                onPress={handleConfirm}
                size="sm"
                fullWidth
                style={styles.confirmButton}
            />
        </View>
    );
};

DatePickerMessage.displayName = 'DatePickerMessage';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background,
        borderRadius: radii.radiusMd,
        borderWidth: 1,
        borderColor: colors.borderDefault,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        width: 280,
    },
    label: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.medium,
        color: colors.gray,
        textAlign: 'center',
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    columnsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    column: {
        flex: 1,
        height: COLUMN_HEIGHT,
        overflow: 'hidden',
    },
    // Items start at y = ITEM_HEIGHT (padding) so item-0 sits in the centre slot
    columnItems: {
        paddingTop: ITEM_HEIGHT,
        paddingBottom: ITEM_HEIGHT,
    },
    selectionBand: {
        position: 'absolute',
        top: ITEM_HEIGHT,      // vertically centred in the 3-row column
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        backgroundColor: colors.muted,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.primaryLight,
        borderRadius: radii.radiusSm,
    },
    columnDivider: {
        width: spacing.sm,
    },
    item: {
        height: ITEM_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemText: {
        fontFamily: fontFamilies.sans,
        fontSize: fontSize.base,
        fontWeight: fontWeight.regular,
    },
    itemTextSelected: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.foreground,
    },
    itemTextMuted: {
        color: colors.gray,
        opacity: 0.45,
    },
    confirmButton: {
        marginTop: spacing.xs,
    },
});
