import { supabase } from '@data/supabase';
import type { AuthResult, AuthUser, AuthSession, AuthError } from '@/types';

/** Map Supabase auth errors to our typed AuthError codes */
function mapAuthError(error: { message: string; status?: number }): AuthError {
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials'))
    return { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' };
  if (msg.includes('already registered') || msg.includes('already been registered'))
    return { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists.' };
  if (msg.includes('password'))
    return { code: 'WEAK_PASSWORD', message: 'Password does not meet requirements.' };
  if (msg.includes('network') || msg.includes('fetch'))
    return { code: 'NETWORK_ERROR', message: 'Network error. Please check your connection.' };

  return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
}

/** Map Supabase user to our AuthUser (profile fields default until hydrated) */
function mapUser(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  created_at: string;
}): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name: (supabaseUser.user_metadata?.['name'] as string) ?? null,
    avatarUrl: (supabaseUser.user_metadata?.['avatar_url'] as string) ?? null,
    onboardingCompleted: false,
    coupleId: null,
    createdAt: supabaseUser.created_at,
  };
}

/** Map Supabase session + user to our AuthSession */
function mapSession(session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    created_at: string;
  };
}): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
    user: mapUser(session.user),
  };
}

/** Sign up with email + password */
export async function signUp(
  email: string,
  password: string,
): Promise<AuthResult<AuthSession>> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) return { ok: false, error: mapAuthError(error) };
    if (!data.user)
      return { ok: false, error: { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' } };
    if (!data.session)
      return { ok: false, error: { code: 'EMAIL_CONFIRMATION_REQUIRED', message: 'Check your email and click the confirmation link to activate your account.' } };

    return { ok: true, data: mapSession(data.session) };
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Network error. Please check your connection.' } };
  }
}

/** Sign in with email + password */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult<AuthSession>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return { ok: false, error: mapAuthError(error) };
    if (!data.session)
      return { ok: false, error: { code: 'UNKNOWN', message: 'Login succeeded but no session was returned.' } };

    return { ok: true, data: mapSession(data.session) };
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Network error. Please check your connection.' } };
  }
}

/** Sign out — invalidate session on server + remove from secure store */
export async function signOut(): Promise<AuthResult<void>> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) return { ok: false, error: mapAuthError(error) };
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Network error. Please check your connection.' } };
  }
}

/** Get current session (restored from secure store by Supabase) */
export async function getSession(): Promise<AuthResult<AuthSession | null>> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) return { ok: false, error: mapAuthError(error) };
    if (!data.session) return { ok: true, data: null };

    return { ok: true, data: mapSession(data.session) };
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Network error. Please check your connection.' } };
  }
}

/**
 * Mark onboarding as complete in `public.profiles`.
 * Called when the user presses "Enter the app" on ConnectionConfirmedScreen.
 */
export async function markOnboardingComplete(userId: string): Promise<AuthResult<void>> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);

    if (error) return { ok: false, error: mapAuthError(error) };
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Network error. Please check your connection.' } };
  }
}

/**
 * Fetch the user's profile from `public.profiles` to get
 * `onboarding_completed`, `couple_id`, `name`, `avatar_url`.
 * Merges with Supabase auth data for a complete AuthUser.
 */
export async function fetchProfile(userId: string): Promise<AuthResult<AuthUser>> {
  try {
    // First get the auth user for base data
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user)
      return { ok: false, error: { code: 'SESSION_EXPIRED', message: 'Session expired. Please sign in again.' } };

    const baseUser = mapUser(authData.user);

    // Then hydrate from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, avatar_url, onboarding_completed, couple_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      // Profile row might not exist yet (just registered) — return base user
      return { ok: true, data: baseUser };
    }

    return {
      ok: true,
      data: {
        ...baseUser,
        name: (profile.name as string) ?? baseUser.name,
        avatarUrl: (profile.avatar_url as string) ?? baseUser.avatarUrl,
        onboardingCompleted: (profile.onboarding_completed as boolean) ?? false,
        coupleId: (profile.couple_id as string) ?? null,
      },
    };
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Network error. Please check your connection.' } };
  }
}
