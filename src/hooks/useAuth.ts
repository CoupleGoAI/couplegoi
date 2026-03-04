import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@store/authStore';
import * as authData from '@data/auth';
import { supabase } from '@data/supabase';

/** Auth operation result — no tokens exposed to UI */
type AuthOpResult = { ok: true; pendingConfirmation?: true } | { ok: false; error: { message: string } };

export function useAuth(): {
    initialize: () => Promise<void>;
    signUp: (email: string, password: string) => Promise<AuthOpResult>;
    signIn: (email: string, password: string) => Promise<AuthOpResult>;
    signOut: () => Promise<void>;
} {
    const setUser = useAuthStore((s) => s.setUser);
    const setInitialized = useAuthStore((s) => s.setInitialized);
    const setLoading = useAuthStore((s) => s.setLoading);
    const setError = useAuthStore((s) => s.setError);
    const resetAuth = useAuthStore((s) => s.reset);

    /**
     * Hydrate user from Supabase auth + profiles table.
     * Called on session restore and after sign-in/sign-up.
     */
    const hydrateUser = useCallback(
        async (userId: string): Promise<void> => {
            const result = await authData.fetchProfile(userId);
            if (result.ok) {
                setUser(result.data);
            }
        },
        [setUser],
    );

    /**
     * Initialize auth on app launch.
     * Supabase restores session from secure store automatically.
     */
    const initialize = useCallback(async (): Promise<void> => {
        try {
            const result = await authData.getSession();
            if (result.ok && result.data) {
                await hydrateUser(result.data.user.id);
            }
        } catch {
            // Session restore failed — user will see login screen
        } finally {
            setInitialized(true);
        }
    }, [hydrateUser, setInitialized]);

    /** Subscribe to Supabase auth state changes (token refresh, sign-out, etc.) */
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                await hydrateUser(session.user.id);
            }
            if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                resetAuth();
            }
        });

        return () => subscription.unsubscribe();
    }, [hydrateUser, resetAuth]);

    /** Sign up with email + password */
    const signUp = useCallback(
        async (email: string, password: string): Promise<AuthOpResult> => {
            setLoading(true);
            setError(null);
            const result = await authData.signUp(email, password);
            if (!result.ok) {
                if (result.error.code === 'EMAIL_CONFIRMATION_REQUIRED') {
                    setLoading(false);
                    return { ok: true, pendingConfirmation: true };
                }
                setError(result.error.message);
                setLoading(false);
                return { ok: false, error: { message: result.error.message } };
            }
            // hydrateUser will be called by onAuthStateChange listener
            setLoading(false);
            return { ok: true };
        },
        [setLoading, setError],
    );

    /** Sign in with email + password */
    const signIn = useCallback(
        async (email: string, password: string): Promise<AuthOpResult> => {
            setLoading(true);
            setError(null);
            const result = await authData.signIn(email, password);
            if (!result.ok) {
                setError(result.error.message);
                setLoading(false);
                return { ok: false, error: { message: result.error.message } };
            }
            setLoading(false);
            return { ok: true };
        },
        [setLoading, setError],
    );

    /** Sign out — wipe auth store + secure storage */
    const signOut = useCallback(async (): Promise<void> => {
        setLoading(true);
        await authData.signOut();
        resetAuth();
        setLoading(false);
    }, [setLoading, resetAuth]);

    return { initialize, signUp, signIn, signOut };
}
