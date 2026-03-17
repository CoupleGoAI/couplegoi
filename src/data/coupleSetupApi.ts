import { supabase } from '@data/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface CoupleSetupResponse {
    reply?: string;
    questionIndex?: number;
    isComplete?: boolean;
    error?: string;
}

type ApiSuccess = { ok: true; data: CoupleSetupResponse };
type ApiFailure = {
    ok: false;
    error: string;
    status?: number;
    rawBody?: string;
    details?: unknown;
};

export async function sendCoupleSetupMessage(
    message: string,
): Promise<ApiSuccess | ApiFailure> {
    const requestId = `couple-setup-${Date.now()}`;

    try {
        console.info(`[${requestId}] sendCoupleSetupMessage:start`, { message });

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error(`[${requestId}] getSession error`, sessionError);
            return {
                ok: false,
                error: `getSession failed: ${sessionError.message}`,
                details: sessionError,
            };
        }

        const token = sessionData.session?.access_token;

        if (!token) {
            console.error(`[${requestId}] No access token found`);
            return { ok: false, error: 'Not signed in' };
        }

        const url = `${SUPABASE_URL}/functions/v1/couple-setup`;
        const payload = { message };

        console.info(`[${requestId}] POST ${url}`, {
            payload,
            hasToken: !!token,
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify(payload),
        });

        const rawBody = await response.text();

        console.info(`[${requestId}] response received`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            rawBody,
        });

        let parsed: CoupleSetupResponse | null = null;

        try {
            parsed = rawBody ? (JSON.parse(rawBody) as CoupleSetupResponse) : null;
        } catch (parseError) {
            console.error(`[${requestId}] Failed to parse JSON response`, {
                parseError,
                rawBody,
            });

            return {
                ok: false,
                status: response.status,
                error: `Server returned non-JSON response (${response.status})`,
                rawBody,
                details: parseError,
            };
        }

        if (!response.ok) {
            const preciseError =
                parsed?.error ||
                `HTTP ${response.status}: ${response.statusText || 'Request failed'}`;

            console.error(`[${requestId}] Function returned error`, {
                status: response.status,
                parsed,
                rawBody,
            });

            return {
                ok: false,
                status: response.status,
                error: preciseError,
                rawBody,
                details: parsed,
            };
        }

        if (parsed?.error) {
            console.error(`[${requestId}] Function returned application error`, parsed);

            return {
                ok: false,
                status: response.status,
                error: parsed.error,
                rawBody,
                details: parsed,
            };
        }

        console.info(`[${requestId}] sendCoupleSetupMessage:success`, parsed);

        return {
            ok: true,
            data: parsed ?? {},
        };
    } catch (err) {
        const error =
            err instanceof Error
                ? {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                }
                : err;

        console.error(`[${requestId}] sendCoupleSetupMessage:exception`, error);

        return {
            ok: false,
            error:
                err instanceof Error
                    ? `Network/client exception: ${err.message}`
                    : 'Unknown network/client exception',
            details: error,
        };
    }
}