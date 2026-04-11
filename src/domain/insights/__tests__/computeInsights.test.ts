import { computeInsights, computeStreak, computeDaysTogether } from '../computeInsights';
import type { CoupleInsightsRaw } from '../types';

function iso(y: number, m: number, d: number): string {
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
}

describe('computeStreak', () => {
    const now = new Date(Date.UTC(2026, 3, 10, 12, 0, 0)); // 2026-04-10

    it('returns zero for no activity', () => {
        expect(computeStreak([], now)).toEqual({
            current: 0,
            longest: 0,
            lastActiveISO: null,
        });
    });

    it('counts a single day today as current 1', () => {
        const r = computeStreak([iso(2026, 4, 10)], now);
        expect(r.current).toBe(1);
        expect(r.longest).toBe(1);
    });

    it('counts yesterday as still-current', () => {
        const r = computeStreak([iso(2026, 4, 9)], now);
        expect(r.current).toBe(1);
    });

    it('breaks current streak when gap > 1 day', () => {
        const r = computeStreak([iso(2026, 4, 7)], now);
        expect(r.current).toBe(0);
        expect(r.longest).toBe(1);
    });

    it('collapses duplicate same-day activity', () => {
        const r = computeStreak(
            [iso(2026, 4, 10), iso(2026, 4, 10), iso(2026, 4, 9), iso(2026, 4, 8)],
            now,
        );
        expect(r.current).toBe(3);
        expect(r.longest).toBe(3);
    });

    it('tracks longest across gaps', () => {
        const r = computeStreak(
            [
                iso(2026, 3, 1),
                iso(2026, 3, 2),
                iso(2026, 3, 3),
                iso(2026, 3, 4),
                iso(2026, 4, 9),
                iso(2026, 4, 10),
            ],
            now,
        );
        expect(r.longest).toBe(4);
        expect(r.current).toBe(2);
    });
});

describe('computeDaysTogether', () => {
    it('returns null for missing date', () => {
        expect(computeDaysTogether(null, new Date())).toBeNull();
    });
    it('computes full days', () => {
        const start = iso(2025, 1, 1);
        const now = new Date(Date.UTC(2025, 0, 11, 12));
        expect(computeDaysTogether(start, now)).toBe(10);
    });
    it('handles leap year boundary', () => {
        const start = iso(2024, 2, 28);
        const now = new Date(Date.UTC(2024, 2, 1, 12));
        expect(computeDaysTogether(start, now)).toBe(2);
    });
});

describe('computeInsights', () => {
    const now = new Date(Date.UTC(2026, 3, 10, 12));

    it('marks empty state with no activity', () => {
        const raw: CoupleInsightsRaw = {
            datingStartDate: null,
            sessions: [],
            results: [],
            messageDates: [],
        };
        const out = computeInsights(raw, now);
        expect(out.isEmpty).toBe(true);
        expect(out.streak.current).toBe(0);
        expect(out.badges.every((b) => !b.unlocked)).toBe(true);
        expect(out.nextMilestone.progress).toBe(0);
    });

    it('unlocks first-spark badge after one game', () => {
        const raw: CoupleInsightsRaw = {
            datingStartDate: iso(2025, 1, 1),
            sessions: [
                {
                    id: 's1',
                    gameType: 'would_you_rather',
                    status: 'completed',
                    createdAt: iso(2026, 4, 10),
                    lastActivityAt: iso(2026, 4, 10),
                    completedAt: iso(2026, 4, 10),
                },
            ],
            results: [{ compatibilityScore: 90, matchCount: 8, roundCount: 10 }],
            messageDates: [],
        };
        const out = computeInsights(raw, now);
        const firstSpark = out.badges.find((b) => b.id === 'first-spark');
        expect(firstSpark?.unlocked).toBe(true);
        expect(out.avgCompatibility).toBe(90);
        expect(out.matchRate).toBeCloseTo(0.8);
        expect(out.categories[0]?.pct).toBe(1);
        expect(out.streak.current).toBe(1);
    });
});
