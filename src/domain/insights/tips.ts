import type { CoupleInsights } from './types';

export function pickInsightTip(data: CoupleInsights): string {
    if (data.isEmpty) {
        return 'Play your first game together to light up your first spark.';
    }
    if (data.streak.current === 0) {
        return 'Share a game or a chat today to restart your spark streak.';
    }
    if (data.matchRate !== null && data.matchRate < 0.4) {
        return 'Low match rate? Try a new category — variety unlocks surprises.';
    }
    if (data.gamesCompleted < 5) {
        return 'Finishing games unlocks compatibility insights — try one more.';
    }
    if (data.categories.length < 3) {
        return 'Try a new game type to unlock the Deep Divers badge.';
    }
    return 'Keep showing up for each other — small sparks become bright streaks.';
}
