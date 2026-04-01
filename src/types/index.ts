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
    birthDate: string | null;
    helpFocus: string | null;
    datingStartDate: string | null;
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
    | { code: 'PROFILE_NOT_FOUND'; message: string }
    | { code: 'UNKNOWN'; message: string };

/** Validation result for form fields */
export interface ValidationResult {
    valid: boolean;
    error: string | null;
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

/** Chat mode: solo conversation with AI, or couple mode (coming soon) */
export type ChatMode = 'single' | 'couple';

/** A single message in the AI chat conversation */
export interface ChatMessage {
    id: string;
    /** 'user' = current user, 'assistant' = AI, 'partner' = other user in couple mode */
    role: 'user' | 'assistant' | 'partner';
    text: string;
    timestamp: number;
    status?: 'sending' | 'sent' | 'error';
    /** Display name shown above partner bubbles in couple mode */
    senderName?: string;
    /** True for assistant messages received via realtime (triggers typewriter without emoji strip) */
    isNew?: boolean;
}

/** Result of calling the AI sendMessage function */
export type ChatResult =
    | { ok: true; reply: string }
    | { ok: false; error: string };

/** Result of fetching chat history from the server */
export type ChatHistoryResult =
    | { ok: true; data: ChatMessage[] }
    | { ok: false; error: string };

// ─── Interactive Message Payloads ─────────────────────────────────────────────

/**
 * Discriminated union for interactive chat messages.
 * Add new types here to extend the interactive message system.
 */
export type InteractivePayload =
    | { type: 'date-picker'; minDate?: string; maxDate?: string };
