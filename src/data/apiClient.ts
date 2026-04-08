import { supabase } from '@data/supabase';
import { log } from '@utils/logger';

/**
 * Typed wrapper for Supabase PostgREST queries.
 * Supabase JS automatically attaches the session's access token
 * to all requests — no manual header management needed.
 */
export async function supabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: { message: string } | null }>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      log.error('supabaseQuery', 'Query failed', { error: error.message });
      return { ok: false, error: error.message };
    }
    if (data === null) return { ok: false, error: 'No data returned' };
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    log.error('supabaseQuery', 'Query threw', { error: msg });
    return { ok: false, error: msg };
  }
}

/**
 * Typed wrapper for Supabase Edge Function invocations.
 *
 * Explicitly retrieves the current session's access token and passes it
 * in the Authorization header. This avoids a React Native edge case where
 * `supabase.functions.invoke()` may fall back to the anon key when the
 * in-memory session hasn't been populated yet (e.g. SecureStore restore in
 * flight), which causes the edge function to return 401.
 *
 * - Returns a discriminated Result<T, string> — never throws.
 * - SECURITY: tokens are never logged; only generic error messages surface.
 */
export async function invokeEdgeFunction<T>(
  functionName: string,
  body?: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    // Explicitly retrieve the session so we can attach the JWT ourselves.
    // supabase.functions.invoke() would normally do this internally, but in
    // React Native the in-memory session may not yet be populated when the
    // async SecureStore restore is still in progress — in that case supabase-js
    // silently falls back to the anon key, which the edge function rejects (401).
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.access_token) {
      log.warn('edgeFunction', 'No session for edge call', { fn: functionName });
      return { ok: false, error: 'Session expired. Please sign in again.' };
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: body ?? {},
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
    });

    if (error) {
      const status = typeof error.status === 'number' ? error.status : 0;
      const msg = typeof error.message === 'string' ? error.message : '';

      log.error('edgeFunction', `${functionName} failed`, {
        status,
        message: msg,
        // Log the raw error data if it exists (e.g. edge function returned JSON error)
        responseData: typeof data === 'object' && data !== null ? data : undefined,
      });

      if (status === 401 || msg.includes('JWT') || msg.includes('auth'))
        return { ok: false, error: 'Session expired. Please sign in again.' };
      if (status === 403 || msg.includes('forbidden'))
        return { ok: false, error: 'You do not have access to this resource.' };
      return { ok: false, error: 'Request failed. Please try again.' };
    }

    if (data === null || data === undefined) {
      log.warn('edgeFunction', `${functionName} returned null`, { fn: functionName });
      return { ok: false, error: 'No data returned' };
    }

    log.debug('edgeFunction', `${functionName} OK`, { fn: functionName });
    return { ok: true, data: data as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    log.error('edgeFunction', `${functionName} threw`, { error: msg });
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
}

export { supabase };
