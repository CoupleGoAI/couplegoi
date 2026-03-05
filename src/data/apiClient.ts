import { supabase } from '@data/supabase';
import { API_BASE_URL } from '@data/config';

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Typed wrapper for Supabase PostgREST + Edge Function calls.
 * Supabase JS automatically attaches the session's access token
 * to all requests — no manual header management needed.
 */
export async function supabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: { message: string } | null }>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const { data, error } = await queryFn();
    if (error) return { ok: false, error: error.message };
    if (data === null) return { ok: false, error: 'No data returned' };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Authenticated fetch to the CoupleGoAI REST API.
 *
 * - Attaches Bearer token from the current Supabase session.
 * - Enforces a 10-second timeout via AbortController.
 * - Returns a discriminated Result<T, string> — never throws.
 * - SECURITY: tokens are never logged; only generic error messages surface.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      clearTimeout(timeoutId);
      return { ok: false, error: 'Session unavailable. Please sign in again.' };
    }

    // Token attached here — intentionally not logged anywhere
    const authHeader = `Bearer ${sessionData.session.access_token}`;
    const url = `${API_BASE_URL}${path}`;

    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        ...init.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) return { ok: false, error: 'Session expired. Please sign in again.' };
      if (response.status === 403) return { ok: false, error: 'You do not have access to this resource.' };
      if (response.status >= 500) return { ok: false, error: 'Server error. Please try again later.' };
      return { ok: false, error: 'Request failed. Please try again.' };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, error: 'Request timed out. Please check your connection.' };
    }
    return { ok: false, error: 'Network error. Please check your connection.' };
  }
}

export { supabase };
