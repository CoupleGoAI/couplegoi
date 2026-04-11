import type { GameType } from '@/types/games';
import type {
    Badge,
    CategoryStat,
    CoupleInsights,
    CoupleInsightsRaw,
    Milestone,
    StreakInfo,
} from './types';

const MS_PER_DAY = 86_400_000;

const GAME_TYPE_LABELS: Record<GameType, string> = {
    would_you_rather: 'Would You Rather',
    who_is_more_likely: 'Who Is More Likely',
    this_or_that: 'This or That',
    never_have_i_ever: 'Never Have I Ever',
};

function toUtcDayKey(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function daysBetweenUtc(a: Date, b: Date): number {
    const au = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
    const bu = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
    return Math.round((au - bu) / MS_PER_DAY);
}

export function computeStreak(activityISO: ReadonlyArray<string>, now: Date): StreakInfo {
    if (activityISO.length === 0) {
        return { current: 0, longest: 0, lastActiveISO: null };
    }

    const dayKeys = new Set<string>();
    let latest: Date | null = null;
    for (const iso of activityISO) {
        const key = toUtcDayKey(iso);
        if (!key) continue;
        dayKeys.add(key);
        const d = new Date(iso);
        if (latest === null || d.getTime() > latest.getTime()) latest = d;
    }
    if (latest === null || dayKeys.size === 0) {
        return { current: 0, longest: 0, lastActiveISO: null };
    }

    // Sort unique days ascending.
    const sortedDays: Date[] = [];
    for (const key of dayKeys) {
        const [y, m, d] = key.split('-').map(Number);
        sortedDays.push(new Date(Date.UTC(y, m, d)));
    }
    sortedDays.sort((a, b) => a.getTime() - b.getTime());

    // Longest run.
    let longest = 1;
    let run = 1;
    for (let i = 1; i < sortedDays.length; i += 1) {
        const gap = daysBetweenUtc(sortedDays[i], sortedDays[i - 1]);
        if (gap === 1) {
            run += 1;
            if (run > longest) longest = run;
        } else if (gap > 1) {
            run = 1;
        }
    }

    // Current streak — only valid if last active is today or yesterday.
    const lastDay = sortedDays[sortedDays.length - 1];
    const gapFromNow = daysBetweenUtc(now, lastDay);
    let current = 0;
    if (gapFromNow <= 1) {
        current = 1;
        for (let i = sortedDays.length - 2; i >= 0; i -= 1) {
            if (daysBetweenUtc(sortedDays[i + 1], sortedDays[i]) === 1) {
                current += 1;
            } else {
                break;
            }
        }
    }

    return { current, longest, lastActiveISO: latest.toISOString() };
}

export function computeDaysTogether(datingStartDate: string | null, now: Date): number | null {
    if (!datingStartDate) return null;
    const start = new Date(datingStartDate);
    if (Number.isNaN(start.getTime())) return null;
    const diff = daysBetweenUtc(now, start);
    return diff >= 0 ? diff : null;
}

function computeCategoryBreakdown(
    sessions: CoupleInsightsRaw['sessions'],
): ReadonlyArray<CategoryStat> {
    if (sessions.length === 0) return [];
    const counts = new Map<GameType, number>();
    for (const s of sessions) {
        counts.set(s.gameType, (counts.get(s.gameType) ?? 0) + 1);
    }
    const total = sessions.length;
    const out: CategoryStat[] = [];
    for (const [gameType, count] of counts.entries()) {
        out.push({
            gameType,
            label: GAME_TYPE_LABELS[gameType],
            count,
            pct: count / total,
        });
    }
    out.sort((a, b) => b.count - a.count);
    return out;
}

function computeCompatibility(
    results: CoupleInsightsRaw['results'],
): { avg: number | null; matchRate: number | null } {
    if (results.length === 0) return { avg: null, matchRate: null };
    let scoreSum = 0;
    let scoreCount = 0;
    let matches = 0;
    let rounds = 0;
    for (const r of results) {
        if (r.compatibilityScore !== null) {
            scoreSum += r.compatibilityScore;
            scoreCount += 1;
        }
        matches += r.matchCount;
        rounds += r.roundCount;
    }
    return {
        avg: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
        matchRate: rounds > 0 ? matches / rounds : null,
    };
}

function pickNextMilestone(base: Omit<CoupleInsights, 'badges' | 'nextMilestone'>): Milestone {
    const tiers: ReadonlyArray<Milestone> = [
        {
            id: 'streak-3',
            label: '3-day streak',
            current: base.streak.current,
            target: 3,
            icon: 'sparkles',
            progress: 0,
        },
        {
            id: 'streak-7',
            label: '7-day streak',
            current: base.streak.current,
            target: 7,
            icon: 'sparkles',
            progress: 0,
        },
        {
            id: 'games-10',
            label: '10 games played',
            current: base.gamesPlayed,
            target: 10,
            icon: 'game-controller',
            progress: 0,
        },
        {
            id: 'games-25',
            label: '25 games played',
            current: base.gamesPlayed,
            target: 25,
            icon: 'game-controller',
            progress: 0,
        },
        {
            id: 'streak-30',
            label: '30-day streak',
            current: base.streak.current,
            target: 30,
            icon: 'sparkles',
            progress: 0,
        },
    ];
    for (const t of tiers) {
        if (t.current < t.target) {
            return { ...t, progress: Math.min(1, t.current / t.target) };
        }
    }
    const last = tiers[tiers.length - 1];
    return { ...last, progress: 1 };
}

function buildBadges(base: Omit<CoupleInsights, 'badges' | 'nextMilestone'>): ReadonlyArray<Badge> {
    const defs: ReadonlyArray<Omit<Badge, 'unlocked' | 'progress'>> = [
        { id: 'first-spark', title: 'First Spark', description: 'Play your first game together', icon: 'flash', threshold: 1, currentValue: base.gamesPlayed },
        { id: 'duo-explorer', title: 'Duo Explorer', description: 'Complete 5 games together', icon: 'compass', threshold: 5, currentValue: base.gamesCompleted },
        { id: 'streak-keeper', title: 'Streak Keeper', description: 'Reach a 3-day streak', icon: 'sparkles', threshold: 3, currentValue: base.streak.longest },
        { id: 'week-warriors', title: 'Week Warriors', description: 'Reach a 7-day streak', icon: 'ribbon', threshold: 7, currentValue: base.streak.longest },
        { id: 'sync-souls', title: 'Sync Souls', description: 'Hit 80% compatibility', icon: 'infinite', threshold: 80, currentValue: base.avgCompatibility ?? 0 },
        { id: 'chatterbox', title: 'Chatterbox', description: 'Exchange 100 couple messages', icon: 'chatbubbles', threshold: 100, currentValue: base.messagesExchanged },
        { id: 'century', title: 'Century Club', description: '100 days together', icon: 'heart', threshold: 100, currentValue: base.daysTogether ?? 0 },
        { id: 'deep-divers', title: 'Deep Divers', description: 'Try 3 different game types', icon: 'layers', threshold: 3, currentValue: base.categories.length },
    ];
    return defs.map((d) => ({
        ...d,
        unlocked: d.currentValue >= d.threshold,
        progress: Math.min(1, d.currentValue / d.threshold),
    }));
}

export function computeInsights(raw: CoupleInsightsRaw, now: Date): CoupleInsights {
    const activity: string[] = [];
    for (const s of raw.sessions) activity.push(s.lastActivityAt);
    for (const m of raw.messageDates) activity.push(m);

    const streak = computeStreak(activity, now);
    const daysTogether = computeDaysTogether(raw.datingStartDate, now);
    const gamesPlayed = raw.sessions.length;
    const gamesCompleted = raw.sessions.filter((s) => s.status === 'completed').length;
    const categories = computeCategoryBreakdown(raw.sessions);
    const { avg, matchRate } = computeCompatibility(raw.results);

    let lastActivityISO: string | null = streak.lastActiveISO;
    if (raw.sessions.length > 0) {
        const latestSession = raw.sessions
            .map((s) => s.lastActivityAt)
            .sort()
            .pop() ?? null;
        if (latestSession && (!lastActivityISO || latestSession > lastActivityISO)) {
            lastActivityISO = latestSession;
        }
    }

    const base = {
        daysTogether,
        streak,
        gamesPlayed,
        gamesCompleted,
        messagesExchanged: raw.messageDates.length,
        avgCompatibility: avg,
        matchRate,
        categories,
        lastActivityISO,
        isEmpty: gamesPlayed === 0 && raw.messageDates.length === 0,
    };
    const badges = buildBadges(base);
    const nextMilestone = pickNextMilestone(base);
    return { ...base, badges, nextMilestone };
}
