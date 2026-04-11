import type { GameType } from '@/types/games';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = keyof typeof Ionicons.glyphMap;

export interface CoupleInsightsRaw {
    datingStartDate: string | null;
    sessions: ReadonlyArray<{
        id: string;
        gameType: GameType;
        status: 'waiting' | 'active' | 'completed' | 'cancelled';
        createdAt: string;
        lastActivityAt: string;
        completedAt: string | null;
    }>;
    results: ReadonlyArray<{
        compatibilityScore: number | null;
        matchCount: number;
        roundCount: number;
    }>;
    messageDates: ReadonlyArray<string>;
}

export interface StreakInfo {
    current: number;
    longest: number;
    lastActiveISO: string | null;
}

export interface CategoryStat {
    gameType: GameType;
    label: string;
    count: number;
    pct: number;
}

export interface Badge {
    id: string;
    title: string;
    description: string;
    icon: IoniconName;
    unlocked: boolean;
    progress: number;
    threshold: number;
    currentValue: number;
}

export interface Milestone {
    id: string;
    label: string;
    current: number;
    target: number;
    icon: IoniconName;
    progress: number;
}

export interface CoupleInsights {
    daysTogether: number | null;
    streak: StreakInfo;
    gamesPlayed: number;
    gamesCompleted: number;
    messagesExchanged: number;
    avgCompatibility: number | null;
    matchRate: number | null;
    categories: ReadonlyArray<CategoryStat>;
    badges: ReadonlyArray<Badge>;
    nextMilestone: Milestone;
    lastActivityISO: string | null;
    isEmpty: boolean;
}

export type InsightsError =
    | { kind: 'no_couple' }
    | { kind: 'network' }
    | { kind: 'unknown' };

export type InsightsResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: InsightsError };
