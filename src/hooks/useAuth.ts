import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@store/authStore';
import { useOnboardingStore } from '@store/onboardingStore';
import { usePairingStore } from '@store/pairingStore';
import { useCoupleSetupStore } from '@store/coupleSetupStore';
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
    const resetOnboarding = useOnboardingStore((s) => s.reset);
    const resetPairing = usePairingStore((s) => s.reset);
    const resetCoupleSetup = useCoupleSetupStore((s) => s.reset);

    /**
     * Hydrate user from Supabase auth + profiles table.
     * Called on session restore and after sign-in/sign-up.
     *
     * - Profile found      → set user, proceed normally
     * - PROFILE_NOT_FOUND  → profile row was deleted; force sign-out so the
     *                         session is cleared from SecureStore and the auth
     *                         screen is shown instead of a broken app state
     * - Network/other error → use a minimal fallback so the user is not
     *                         incorrectly signed out due to a transient error
     */
    const hydrateUser = useCallback(
        async (userId: string, email?: string): Promise<void> => {
            const result = await authData.fetchProfile(userId);

            if (result.ok) {
                setUser(result.data);
                return;
            }

            if (
                result.error.code === 'PROFILE_NOT_FOUND' ||
                result.error.code === 'SESSION_EXPIRED'
            ) {
                // Profile deleted or session invalid — clear SecureStore and all
                // stores so RootNavigator routes to the auth screen.
                await authData.signOut();
                resetAuth();
                resetOnboarding();
                resetPairing();
                resetCoupleSetup();
                return;
            }

            // Transient error (network, RLS) — keep a minimal user so the
            // user is not logged out on a bad network day.
            setUser({
                id: userId,
                email: email ?? '',
                name: null,
                avatarUrl: null,
                birthDate: null,
                helpFocus: null,
                datingStartDate: null,
                onboardingCompleted: false,
                coupleSetupCompleted: false,
                coupleId: null,
                createdAt: new Date().toISOString(),
            });
        },
        [setUser, resetAuth, resetOnboarding, resetPairing, resetCoupleSetup],
    );

    /**
     * Initialize auth on app launch.
     * Supabase restores session from secure store automatically.
     */
    const initialize = useCallback(async (): Promise<void> => {
        try {
            const result = await authData.getSession();
            if (result.ok && result.data) {
                await hydrateUser(result.data.user.id, result.data.user.email);
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
                await hydrateUser(session.user.id, session.user.email);
            }
            if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                resetAuth();
                resetOnboarding();
                resetPairing();
                resetCoupleSetup();
            }
        });

        return () => subscription.unsubscribe();
    }, [hydrateUser, resetAuth, resetOnboarding, resetPairing, resetCoupleSetup]);

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

    /** Sign out — wipe auth store + onboarding store + pairing store + secure storage */
    const signOut = useCallback(async (): Promise<void> => {
        await authData.signOut();
        resetAuth();
        resetOnboarding();
        resetPairing();
        resetCoupleSetup();
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setInitialized(true);
    }, [setInitialized, resetAuth, resetOnboarding, resetPairing, resetCoupleSetup]);

    return { initialize, signUp, signIn, signOut };
}
