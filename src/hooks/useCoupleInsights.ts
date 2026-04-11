import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@store/authStore';
import { fetchCoupleInsightsRaw } from '@/data/insightsApi';
import { computeInsights } from '@/domain/insights/computeInsights';
import type { CoupleInsights, InsightsError } from '@/domain/insights/types';

export interface UseCoupleInsightsReturn {
    data: CoupleInsights | null;
    loading: boolean;
    refreshing: boolean;
    error: InsightsError | null;
    refresh: () => Promise<void>;
}

export function useCoupleInsights(): UseCoupleInsightsReturn {
    const coupleId = useAuthStore((s) => s.user?.coupleId ?? null);
    const [data, setData] = useState<CoupleInsights | null>(null);
    const [loading, setLoading] = useState<boolean>(coupleId !== null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<InsightsError | null>(null);

    const load = useCallback(
        async (isRefresh: boolean): Promise<void> => {
            if (!coupleId) {
                setError({ kind: 'no_couple' });
                setLoading(false);
                return;
            }
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);
            const res = await fetchCoupleInsightsRaw(coupleId);
            if (res.ok) {
                setData(computeInsights(res.data, new Date()));
            } else {
                setError(res.error);
            }
            if (isRefresh) setRefreshing(false);
            else setLoading(false);
        },
        [coupleId],
    );

    useEffect(() => {
        void load(false);
    }, [load]);

    const refresh = useCallback(async (): Promise<void> => {
        await load(true);
    }, [load]);

    return { data, loading, refreshing, error, refresh };
}
