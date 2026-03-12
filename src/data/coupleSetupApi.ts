// =============================================================================
// coupleSetupApi.ts — plain fetch to couple-setup edge function
// =============================================================================

import { supabase } from '@data/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoupleSetupResponse {
    reply: string;
    questionIndex: number;
    isComplete: boolean;
    error?: string;
}

// ─── Send message (edge function via plain fetch) ────────────────────────────

export async function sendCoupleSetupMessage(
    message: string,
): Promise<{ ok: true; data: CoupleSetupResponse } | { ok: false; error: string }> {
    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session?.access_token) {
            return { ok: false, error: 'Not signed in' };
        }

        const token = sessionData.session.access_token;
        const url = `${SUPABASE_URL}/functions/v1/couple-setup`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ message }),
        });

        const data = await response.json() as CoupleSetupResponse;

        if (!response.ok || data.error) {
            return { ok: false, error: data.error ?? 'Request failed' };
        }

        return { ok: true, data };
    } catch {
        return { ok: false, error: 'Network error' };
    }
}
