import { supabase } from '@data/supabase';
import { runtimeConfig } from '@/config/runtimeConfig';

const SUPABASE_URL = runtimeConfig.supabaseUrl;
const SUPABASE_ANON_KEY = runtimeConfig.supabaseAnonKey;

export interface CoupleSetupResponse {
    reply?: string;
    questionIndex?: number;
    isComplete?: boolean;
    error?: string;
}

type ApiSuccess = { ok: true; data: CoupleSetupResponse };
type ApiFailure = { ok: false; error: string; status?: number };

export async function sendCoupleSetupMessage(
    message: string,
): Promise<ApiSuccess | ApiFailure> {
    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            return { ok: false, error: 'Session error. Please sign in again.' };
        }

        const token = sessionData.session?.access_token;

        if (!token) {
            return { ok: false, error: 'Not signed in' };
        }

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

        let parsed: CoupleSetupResponse | null = null;

        try {
            const text = await response.text();
            parsed = text ? (JSON.parse(text) as CoupleSetupResponse) : null;
        } catch {
            return {
                ok: false,
                status: response.status,
                error: `Server returned an unexpected response (${response.status})`,
            };
        }

        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                error: parsed?.error ?? `Request failed (${response.status})`,
            };
        }

        if (parsed?.error) {
            return { ok: false, status: response.status, error: parsed.error };
        }

        return { ok: true, data: parsed ?? {} };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Network error',
        };
    }
}
