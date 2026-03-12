/**
 * CoupleGoAI — Global Type Definitions
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Minimal user object derived from Supabase auth + profiles table */
export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    onboardingCompleted: boolean;
    coupleSetupCompleted: boolean;
    coupleId: string | null;
    createdAt: string;
}

/** Session data from Supabase (access + refresh token pair) */
export interface AuthSession {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    user: AuthUser;
}

/** Discriminated union for auth operation results */
export type AuthResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: AuthError };

/** Typed auth error with discriminated `code` */
export type AuthError =
    | { code: 'INVALID_CREDENTIALS'; message: string }
    | { code: 'EMAIL_ALREADY_EXISTS'; message: string }
    | { code: 'WEAK_PASSWORD'; message: string }
    | { code: 'NETWORK_ERROR'; message: string }
    | { code: 'SESSION_EXPIRED'; message: string }
    | { code: 'EMAIL_CONFIRMATION_REQUIRED'; message: string }
    | { code: 'UNKNOWN'; message: string };

/** Validation result for form fields */
export interface ValidationResult {
    valid: boolean;
    error: string | null;
}
