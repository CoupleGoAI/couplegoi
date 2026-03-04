# Feature: Authentication — Architecture Plan

> **Status**: Draft  
> **Spec**: `docs/features/auth/spec.md`  
> **Author**: Architect Agent  
> **Date**: 2026-03-04

---

## 1 · Overview

Email/password authentication powered by **Supabase Auth**. The Supabase JS client handles all token lifecycle (access + refresh), with a custom storage adapter that persists tokens to `expo-secure-store`. No custom `/auth/*` endpoints — we use `supabase.auth.*` methods directly via a typed data layer.

### Navigation flow after implementation

```
App Launch → RootNavigator
  ├─ isInitialized=false → SplashScreen (loading spinner)
  ├─ isAuthenticated=false → AuthNavigator (Login ↔ Register)
  └─ isAuthenticated=true
       ├─ onboardingCompleted=false → OnboardingNavigator
       └─ onboardingCompleted=true → TabNavigator (Main)
```

---

## 2 · New dependencies

| Package                     | Purpose                                    | Type    |
| --------------------------- | ------------------------------------------ | ------- |
| `@supabase/supabase-js`     | Supabase client (auth, DB, realtime)       | runtime |
| `expo-secure-store`         | Secure token persistence                   | runtime |
| `react-native-url-polyfill` | URL polyfill required by supabase-js on RN | runtime |

Install command:

```bash
npx expo install @supabase/supabase-js expo-secure-store react-native-url-polyfill
```

No new dev dependencies required (`supabase` CLI already in devDeps).

---

## 3 · File inventory

### New files

| File                                  | Layer      | Purpose                                                        |
| ------------------------------------- | ---------- | -------------------------------------------------------------- |
| `src/data/supabase.ts`                | Data       | Supabase client singleton with secure storage adapter          |
| `src/data/auth.ts`                    | Data       | Typed wrappers around `supabase.auth.*` methods                |
| `src/data/apiClient.ts`               | Data       | Authenticated API helper for future use (Edge Functions, etc.) |
| `src/domain/auth/validation.ts`       | Domain     | Pure email/password validation functions                       |
| `src/store/authStore.ts`              | Store      | Auth state: user, session, flags                               |
| `src/hooks/useAuth.ts`                | Hooks      | Orchestrates auth data + auth store for UI consumption         |
| `src/screens/auth/LoginScreen.tsx`    | UI         | Email + password login form                                    |
| `src/screens/auth/RegisterScreen.tsx` | UI         | Email + password + confirm registration form                   |
| `src/navigation/AuthNavigator.tsx`    | Navigation | Login ↔ Register stack                                         |

### Modified files

| File                               | Change                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `src/navigation/RootNavigator.tsx` | 3-way switch: splash → auth → app (onboarding or main)                  |
| `src/navigation/types.ts`          | Add `AuthStackParamList`, `Auth` to `RootStackParamList`, screen props  |
| `src/store/appStore.ts`            | Replace `isOnboarded` with `onboardingCompleted` (sourced from profile) |
| `src/types/index.ts`               | Add auth-related types (`AuthUser`, `AuthSession`, `AuthError`, etc.)   |
| `package.json`                     | Add runtime deps                                                        |
| `babel.config.js`                  | Add `@data` and `@domain` path aliases                                  |
| `tsconfig.json`                    | Add `@data/*` and `@domain/*` path mappings                             |
| `App.tsx`                          | Import `react-native-url-polyfill/auto` at top                          |

### Files unchanged but affected

| File                                       | Impact                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `src/screens/onboarding/WelcomeScreen.tsx` | No longer the first screen; shown only post-auth                                     |
| `src/navigation/OnboardingNavigator.tsx`   | Remove `Welcome` + `CreateAccount` (replaced by auth screens). Start at `GenerateQR` |

---

## 4 · Architecture — layer-by-layer

### 4.1 · Types (`src/types/index.ts`)

```ts
// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Minimal user object derived from Supabase auth + profiles table */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  coupleId: string | null;
  createdAt: string;
}

/** Session data from Supabase (access + refresh token pair) */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  user: AuthUser;
}

/** Discriminated union for auth operation results */
export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AuthError };

/** Typed auth error with discriminated `code` */
export type AuthError =
  | { code: "INVALID_CREDENTIALS"; message: string }
  | { code: "EMAIL_ALREADY_EXISTS"; message: string }
  | { code: "WEAK_PASSWORD"; message: string }
  | { code: "NETWORK_ERROR"; message: string }
  | { code: "SESSION_EXPIRED"; message: string }
  | { code: "UNKNOWN"; message: string };

/** Validation result for form fields */
export interface ValidationResult {
  valid: boolean;
  error: string | null;
}
```

### 4.2 · Data layer

#### 4.2.1 · Supabase client (`src/data/supabase.ts`)

Single source of truth for the Supabase client instance. Uses a custom storage adapter backed by `expo-secure-store` so that Supabase automatically persists and restores sessions from secure storage.

```ts
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "";

/**
 * Custom storage adapter for Supabase using expo-secure-store.
 * Supabase JS calls getItem/setItem/removeItem for session persistence.
 * All tokens stay in the secure enclave — never AsyncStorage.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> =>
    SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> =>
    SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for React Native (no browser URL)
  },
});
```

**Key decisions:**

- Environment variables via `EXPO_PUBLIC_*` prefix (Expo's built-in env var support).
- `detectSessionInUrl: false` — mandatory for React Native (no browser).
- `autoRefreshToken: true` — Supabase JS handles refresh automatically.
- `persistSession: true` — Supabase reads/writes via our `ExpoSecureStoreAdapter`.

#### 4.2.2 · Auth data functions (`src/data/auth.ts`)

Typed wrappers around `supabase.auth.*`. Returns `AuthResult<T>` discriminated unions — never throws.

```ts
import { supabase } from '@data/supabase';
import type { AuthResult, AuthUser, AuthSession, AuthError } from '@types/index';

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

/** Map Supabase user + profile to AuthUser */
function mapUser(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at: string }): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name: (supabaseUser.user_metadata?.['name'] as string) ?? null,
    avatarUrl: (supabaseUser.user_metadata?.['avatar_url'] as string) ?? null,
    onboardingCompleted: false, // Will be hydrated from profiles table
    coupleId: null,             // Will be hydrated from profiles table
    createdAt: supabaseUser.created_at,
  };
}

export async function signUp(email: string, password: string): Promise<AuthResult<AuthSession>> { ... }
export async function signIn(email: string, password: string): Promise<AuthResult<AuthSession>> { ... }
export async function signOut(): Promise<AuthResult<void>> { ... }
export async function getSession(): Promise<AuthResult<AuthSession | null>> { ... }
export async function fetchProfile(userId: string): Promise<AuthResult<AuthUser>> { ... }
```

**`fetchProfile`** queries `public.profiles` to get `onboarding_completed`, `couple_id`, `name`, `avatar_url` — data that lives in our DB, not in Supabase Auth metadata.

#### 4.2.3 · API client (`src/data/apiClient.ts`)

Thin wrapper for future authenticated requests to Supabase Edge Functions or PostgREST. Uses the Supabase client's built-in auth headers.

```ts
import { supabase } from "@data/supabase";

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
    if (data === null) return { ok: false, error: "No data returned" };
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export { supabase };
```

### 4.3 · Domain (`src/domain/auth/validation.ts`)

Pure functions — zero side effects, zero imports from data/store. Fully unit-testable.

```ts
import type { ValidationResult } from "@types/index";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) return { valid: false, error: "Email is required." };
  if (!EMAIL_REGEX.test(email.trim()))
    return { valid: false, error: "Enter a valid email address." };
  return { valid: true, error: null };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: "Password is required." };
  if (password.length < MIN_PASSWORD_LENGTH)
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  return { valid: true, error: null };
}

export function validatePasswordMatch(
  password: string,
  confirm: string,
): ValidationResult {
  if (confirm !== password)
    return { valid: false, error: "Passwords do not match." };
  return { valid: true, error: null };
}
```

### 4.4 · Store (`src/store/authStore.ts`)

Thin Zustand slice. Holds auth state only. No business logic, no side effects.

```ts
import { create } from "zustand";
import type { AuthUser } from "@types/index";

interface AuthState {
  /** Current authenticated user (null if logged out) */
  user: AuthUser | null;
  /** Whether an active session exists */
  isAuthenticated: boolean;
  /** Whether the initial session check has completed */
  isInitialized: boolean;
  /** Whether an auth operation is in progress */
  isLoading: boolean;
  /** Current auth error to display in UI */
  error: string | null;
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setAuthenticated: (value: boolean) => void;
  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setInitialized: (value) => set({ isInitialized: value }),
  setLoading: (value) => set({ isLoading: value }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
```

**Selector usage in UI:**

```ts
const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
const isInitialized = useAuthStore((s) => s.isInitialized);
const user = useAuthStore((s) => s.user);
const error = useAuthStore((s) => s.error);
```

### 4.5 · App store changes (`src/store/appStore.ts`)

**Rename** `isOnboarded` → `onboardingCompleted` to match the database column. Value is sourced from `profiles.onboarding_completed`, not set locally.

```diff
  interface AppStore {
-   isOnboarded: boolean;
+   onboardingCompleted: boolean;
    currentUser: User | null;
    ...
-   setOnboarded: (value: boolean) => void;
+   setOnboardingCompleted: (value: boolean) => void;
    ...
  }
```

Existing `reset()` method already resets to initial state — no change needed.

### 4.6 · Hook (`src/hooks/useAuth.ts`)

Orchestration layer between UI, auth data, auth store, and app store. This is the **only** entry point for auth operations in components.

```ts
import { useCallback, useEffect } from "react";
import { useAuthStore } from "@store/authStore";
import { useAppStore } from "@store/appStore";
import * as authData from "@data/auth";
import { supabase } from "@data/supabase";
import type { AuthError } from "@types/index";

export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setError = useAuthStore((s) => s.setError);
  const resetAuth = useAuthStore((s) => s.reset);

  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);
  const resetApp = useAppStore((s) => s.reset);

  /**
   * Hydrate user from Supabase auth + profiles table.
   * Called on session restore and after sign-in/sign-up.
   */
  const hydrateUser = useCallback(
    async (userId: string) => {
      const result = await authData.fetchProfile(userId);
      if (result.ok) {
        setUser(result.data);
        setOnboardingCompleted(result.data.onboardingCompleted);
      }
    },
    [setUser, setOnboardingCompleted],
  );

  /**
   * Initialize auth on app launch.
   * Supabase restores session from secure store automatically.
   * We listen to onAuthStateChange for the restored session event.
   */
  const initialize = useCallback(async () => {
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
      if (event === "SIGNED_IN" && session?.user) {
        await hydrateUser(session.user.id);
      }
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        resetAuth();
        resetApp();
      }
    });
    return () => subscription.unsubscribe();
  }, [hydrateUser, resetAuth, resetApp]);

  /** Sign up with email + password */
  const signUp = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      const result = await authData.signUp(email, password);
      if (!result.ok) {
        setError(result.error.message);
      }
      // hydrateUser will be called by onAuthStateChange listener
      setLoading(false);
      return result;
    },
    [setLoading, setError],
  );

  /** Sign in with email + password */
  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      const result = await authData.signIn(email, password);
      if (!result.ok) {
        setError(result.error.message);
      }
      setLoading(false);
      return result;
    },
    [setLoading, setError],
  );

  /** Sign out — wipe all stores + secure storage */
  const signOut = useCallback(async () => {
    setLoading(true);
    await authData.signOut();
    resetAuth();
    resetApp();
    setLoading(false);
  }, [setLoading, resetAuth, resetApp]);

  return { initialize, signUp, signIn, signOut };
}
```

**Key decisions:**

- `onAuthStateChange` is the single source of truth for session state changes. All sign-in/sign-up events flow through it.
- `hydrateUser` fetches the profile row to get `onboarding_completed` and `couple_id`.
- `signOut` resets **both** auth and app stores, ensuring complete state wipe.

### 4.7 · Navigation

#### 4.7.1 · Navigation types (`src/navigation/types.ts`)

Add new types:

```ts
// --- Auth Stack ---
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// --- Root Stack (updated) ---
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

// Navigation prop helpers (new)
export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;
export type LoginScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  "Login"
>;
export type RegisterScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  "Register"
>;
```

#### 4.7.2 · Auth navigator (`src/navigation/AuthNavigator.tsx`)

```ts
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';
import LoginScreen from '@screens/auth/LoginScreen';
import RegisterScreen from '@screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
```

#### 4.7.3 · Root navigator (`src/navigation/RootNavigator.tsx`)

Refactored to 3-way switch:

```tsx
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@navigation/types";
import { useAuthStore } from "@store/authStore";
import { useAppStore } from "@store/appStore";
import { useAuth } from "@hooks/useAuth";
import AuthNavigator from "@navigation/AuthNavigator";
import OnboardingNavigator from "@navigation/OnboardingNavigator";
import TabNavigator from "@navigation/TabNavigator";
import SplashScreen from "@screens/auth/SplashScreen"; // lightweight loading view

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);
  const { initialize } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "fade" }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !onboardingCompleted ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Note:** `SplashScreen` is a simple full-screen component with the app logo/gradient and an `ActivityIndicator`. Not a heavy screen — just prevents flash of login form during session restore. Can be implemented as an inline `<View>` or a minimal `@screens/auth/SplashScreen.tsx`.

#### 4.7.4 · Onboarding navigator changes

Remove `Welcome` and `CreateAccount` screens from the onboarding flow (their purpose is replaced by `LoginScreen` / `RegisterScreen`). The onboarding navigator now starts at `GenerateQR`:

```ts
// Updated initialRouteName
<Stack.Navigator initialRouteName="GenerateQR" ...>
  <Stack.Screen name="GenerateQR" component={GenerateQRScreen} />
  <Stack.Screen name="ScanQR" component={ScanQRScreen} />
  <Stack.Screen name="ConnectionConfirmed" component={ConnectionConfirmedScreen} />
</Stack.Navigator>
```

Update `OnboardingStackParamList` to remove `Welcome` and `CreateAccount`.

### 4.8 · Screens

#### 4.8.1 · Login screen (`src/screens/auth/LoginScreen.tsx`)

Layout (top to bottom):

1. App logo / hero area (gradient background, brand marks)
2. "Welcome back" heading
3. Email input (TextInput with `keyboardType="email-address"`, `autoCapitalize="none"`)
4. Password input (TextInput with `secureTextEntry`)
5. Inline field error text (per field, red, below each input)
6. General error banner (from `useAuthStore.error`)
7. `GradientButton` — "Log In" (loading state while `isLoading`)
8. "Don't have an account? Sign up" link → navigate to Register

**Keyboard handling:** Wrap in `KeyboardAvoidingView` + `ScrollView` so inputs aren't hidden. Use `behavior="padding"` on iOS.

**Styling:** NativeWind `className` only. Semantic colors from tokens. No hardcoded hex.

**Interactions:**

- Client-side validation via `validateEmail` / `validatePassword` before calling `signIn`.
- On validation failure: show inline errors, do NOT call API.
- On API failure: display `error` from auth store.
- On success: `onAuthStateChange` fires → `hydrateUser` → store updates → RootNavigator switches automatically.

#### 4.8.2 · Register screen (`src/screens/auth/RegisterScreen.tsx`)

Same layout as Login, plus:

- "Confirm password" field
- Validates all 3 fields: email, password, password match
- `GradientButton` — "Create Account"
- "Already have an account? Log in" link → navigate to Login

#### 4.8.3 · Splash screen (`src/screens/auth/SplashScreen.tsx`)

Minimal loading screen shown while `isInitialized === false`:

- Full-screen gradient background (brand gradient)
- App logo centered
- `ActivityIndicator` below logo
- No navigation, no interaction

---

## 5 · Session lifecycle

### 5.1 · App launch (session restore)

```
1. App mounts → RootNavigator renders
2. useAuth().initialize() called in useEffect
3. authData.getSession() → Supabase reads from ExpoSecureStoreAdapter
4. If valid session found:
   a. fetchProfile(userId) → get onboarding_completed, couple_id
   b. setUser(authUser) → isAuthenticated = true
   c. setOnboardingCompleted(profile.onboarding_completed)
5. setInitialized(true) → splash screen dismissed
6. RootNavigator switches to Auth / Onboarding / Main
```

### 5.2 · Token refresh

Handled **automatically** by Supabase JS client (`autoRefreshToken: true`). The client:

1. Tracks `expires_at` on the session
2. Refreshes ~60s before expiry
3. Writes new tokens to `ExpoSecureStoreAdapter`
4. Fires `onAuthStateChange('TOKEN_REFRESHED', newSession)`

No manual refresh logic needed.

### 5.3 · Session expiry (refresh token exhausted)

If the refresh token is expired (30-day window), Supabase JS will:

1. Fail to refresh → session becomes null
2. Fire `onAuthStateChange('SIGNED_OUT', null)`
3. Our listener calls `resetAuth()` + `resetApp()`
4. `isAuthenticated` → false → RootNavigator shows AuthNavigator

### 5.4 · Sign out

```
1. User taps "Log out" in ProfileScreen
2. useAuth().signOut() called
3. authData.signOut() → supabase.auth.signOut()
   - Supabase JS invalidates server session
   - Supabase JS calls ExpoSecureStoreAdapter.removeItem() for session keys
4. resetAuth() + resetApp() → all stores wiped
5. isAuthenticated → false → RootNavigator shows AuthNavigator
```

---

## 6 · Environment variables

Required in `.env` (not committed) and `app.json` / `eas.json` for builds:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
```

These are safe to embed in the client — the anon key is public, and RLS policies protect data. The URL is not secret.

**Do NOT embed the `service_role` key in the client.** Ever.

Add `.env` to `.gitignore`. Provide `.env.local` with placeholder keys.

---

## 7 · Path alias updates

### `babel.config.js`

Add to alias map:

```js
'@data': './src/data',
'@domain': './src/domain',
```

### `tsconfig.json`

Add to `paths`:

```json
"@data/*": ["src/data/*"],
"@domain/*": ["src/domain/*"]
```

---

## 8 · Security analysis

| Concern              | Mitigation                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Token storage        | expo-secure-store (iOS Keychain / Android Keystore). Never AsyncStorage.                                                 |
| Token in memory      | Only Supabase client holds the token internally. `authStore` does NOT store raw tokens — only `AuthUser` (no secrets).   |
| Network interception | HTTPS by default (Supabase). No custom HTTP endpoints.                                                                   |
| RLS enforcement      | Supabase RLS policies on `profiles` table ensure users can only read/update own profile or partner within same couple.   |
| Password policy      | Client validates ≥8 chars. Supabase Auth enforces its own server-side policy.                                            |
| Error leakage        | `mapAuthError` in data layer converts raw Supabase errors to user-safe messages. No stack traces, no internal IDs in UI. |
| Logout completeness  | `signOut` wipes: Supabase session (server + secure store), authStore, appStore. No residual state.                       |
| Session fixation     | Supabase issues new tokens on each sign-in. `detectSessionInUrl: false` prevents URL-based session injection.            |
| Env var exposure     | Only `SUPABASE_URL` and `SUPABASE_ANON_KEY` in client (public by design). `service_role` key never client-side.          |
| Input validation     | Email/password validated before API call. Prevents unnecessary network traffic and provides instant feedback.            |

---

## 9 · Error handling strategy

### 9.1 · Network errors

All auth data functions wrap calls in try/catch. Network failures return `{ ok: false, error: { code: 'NETWORK_ERROR', message: '...' } }`. UI shows a general error banner (not an alert).

### 9.2 · Auth-specific errors

Mapped by `mapAuthError()` to user-friendly messages. Displayed inline on forms.

| Supabase error              | Our code               | User message                                   |
| --------------------------- | ---------------------- | ---------------------------------------------- |
| "Invalid login credentials" | `INVALID_CREDENTIALS`  | "Incorrect email or password."                 |
| "User already registered"   | `EMAIL_ALREADY_EXISTS` | "An account with this email already exists."   |
| "Password should be..."     | `WEAK_PASSWORD`        | "Password does not meet requirements."         |
| Network/fetch failure       | `NETWORK_ERROR`        | "Network error. Please check your connection." |
| Unknown                     | `UNKNOWN`              | "Something went wrong. Please try again."      |

### 9.3 · State consistency

If `fetchProfile` fails after successful auth (edge case — DB issue), the user will be authenticated but `user` data will be incomplete. Handle by:

1. Setting a minimal `AuthUser` from Supabase auth data (email, id).
2. Retrying profile fetch on next app foreground.
3. Showing a non-blocking toast: "Couldn't load your profile. Some features may be limited."

---

## 10 · Testing plan

### 10.1 · Unit tests (`src/domain/auth/`)

| Test                               | Input                | Expected                                                             |
| ---------------------------------- | -------------------- | -------------------------------------------------------------------- |
| `validateEmail` — empty            | `""`                 | `{ valid: false, error: "Email is required." }`                      |
| `validateEmail` — invalid          | `"notanemail"`       | `{ valid: false, error: "Enter a valid email address." }`            |
| `validateEmail` — valid            | `"user@example.com"` | `{ valid: true, error: null }`                                       |
| `validatePassword` — short         | `"abc"`              | `{ valid: false, error: "Password must be at least 8 characters." }` |
| `validatePassword` — valid         | `"secure123"`        | `{ valid: true, error: null }`                                       |
| `validatePasswordMatch` — mismatch | `"a", "b"`           | `{ valid: false, error: "Passwords do not match." }`                 |
| `validatePasswordMatch` — match    | `"a", "a"`           | `{ valid: true, error: null }`                                       |

### 10.2 · Integration tests (hooks + store)

- Mock `supabase.auth.*` methods.
- Verify `useAuth.signIn` updates authStore correctly on success/failure.
- Verify `useAuth.signOut` resets both stores.
- Verify `useAuth.initialize` restores session and hydrates user.

### 10.3 · Manual test steps

| #   | Step                                    | Expected result                                            |
| --- | --------------------------------------- | ---------------------------------------------------------- |
| 1   | Fresh install, launch app               | Splash briefly → Login screen                              |
| 2   | Tap "Sign up" link                      | Navigate to Register screen                                |
| 3   | Submit empty form                       | Inline errors on all fields                                |
| 4   | Enter valid email, short password       | Inline error: "Password must be at least 8 characters."    |
| 5   | Enter mismatched passwords              | Inline error: "Passwords do not match."                    |
| 6   | Register with valid credentials         | Loading spinner → navigate to Onboarding (GenerateQR)      |
| 7   | Kill app, relaunch                      | Splash briefly → Onboarding (session restored)             |
| 8   | Complete onboarding, kill app, relaunch | Splash briefly → Main tabs (session + onboarding restored) |
| 9   | Log out from Profile                    | Navigate to Login screen                                   |
| 10  | Log in with existing credentials        | Loading spinner → Main tabs                                |
| 11  | Wait 15+ min (access token expiry)      | App still works (auto-refresh)                             |
| 12  | Register with existing email            | Inline error: "An account with this email already exists." |
| 13  | Log in with wrong password              | Inline error: "Incorrect email or password."               |
| 14  | Toggle airplane mode, try to log in     | Error: "Network error. Please check your connection."      |

---

## 11 · Implementation order (task breakdown)

Each step is a shippable, testable increment. Steps 1–4 are foundation (no UI). Steps 5–8 wire up the UI.

### Phase 1: Foundation (no UI changes)

| Step | File(s)                                            | Description                                                                       | Depends on |
| ---- | -------------------------------------------------- | --------------------------------------------------------------------------------- | ---------- |
| 1    | `package.json`, `babel.config.js`, `tsconfig.json` | Add deps, path aliases `@data`, `@domain`                                         | —          |
| 2    | `src/types/index.ts`                               | Add `AuthUser`, `AuthSession`, `AuthError`, `AuthResult`, `ValidationResult`      | —          |
| 3    | `.env`, `.env.local`, `App.tsx`                    | Env vars, URL polyfill import                                                     | 1          |
| 4    | `src/data/supabase.ts`                             | Supabase client singleton with secure store adapter                               | 1, 3       |
| 5    | `src/data/auth.ts`                                 | Auth data functions (`signUp`, `signIn`, `signOut`, `getSession`, `fetchProfile`) | 2, 4       |
| 6    | `src/data/apiClient.ts`                            | Typed query helper                                                                | 4          |
| 7    | `src/domain/auth/validation.ts`                    | Email/password validation pure functions                                          | 2          |
| 8    | `src/store/authStore.ts`                           | Auth Zustand slice                                                                | 2          |
| 9    | `src/store/appStore.ts`                            | Rename `isOnboarded` → `onboardingCompleted`                                      | —          |
| 10   | `src/hooks/useAuth.ts`                             | Auth orchestration hook                                                           | 5, 7, 8, 9 |

### Phase 2: Navigation + UI

| Step | File(s)                                  | Description                                                             | Depends on        |
| ---- | ---------------------------------------- | ----------------------------------------------------------------------- | ----------------- |
| 11   | `src/navigation/types.ts`                | Add `AuthStackParamList`, update `RootStackParamList`, add screen props | —                 |
| 12   | `src/screens/auth/LoginScreen.tsx`       | Login form screen                                                       | 7, 10, 11         |
| 13   | `src/screens/auth/RegisterScreen.tsx`    | Register form screen                                                    | 7, 10, 11         |
| 14   | `src/screens/auth/SplashScreen.tsx`      | Minimal splash/loading screen                                           | —                 |
| 15   | `src/navigation/AuthNavigator.tsx`       | Auth stack navigator                                                    | 11, 12, 13        |
| 16   | `src/navigation/OnboardingNavigator.tsx` | Remove Welcome + CreateAccount, start at GenerateQR                     | 11                |
| 17   | `src/navigation/RootNavigator.tsx`       | 3-way switch: splash → auth → app                                       | 8, 10, 14, 15, 16 |

### Phase 3: Polish + Cleanup

| Step | File(s)                              | Description                                                        | Depends on |
| ---- | ------------------------------------ | ------------------------------------------------------------------ | ---------- |
| 18   | `src/screens/main/ProfileScreen.tsx` | Add "Log out" button wired to `useAuth().signOut()`                | 10         |
| 19   | Tests                                | Unit tests for validation, integration tests for auth hook         | 7, 10      |
| 20   | Cleanup                              | Remove orphaned Welcome/CreateAccount imports, verify no dead code | 16, 17     |

---

## 12 · Open questions / decisions for implementation

| #   | Question                                                      | Recommended answer                                                                                                                                         |
| --- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Keep `WelcomeScreen.tsx` and `CreateAccountScreen.tsx` files? | Delete after migration. Their UX is replaced by Login/Register.                                                                                            |
| 2   | Should `authStore` store raw tokens?                          | **No.** Supabase client manages tokens internally via secure store adapter. `authStore` only holds `AuthUser` and boolean flags. No secrets in Zustand.    |
| 3   | `onboardingCompleted` — read from profile on every launch?    | **Yes.** Always read from `profiles` table via `fetchProfile`. Never trust local-only state for this flag.                                                 |
| 4   | Email confirmation required?                                  | **Not in MVP.** Supabase Auth can be configured to require email confirmation, but for MVP we set "Confirm email" to OFF in Supabase dashboard. Add later. |
| 5   | Deep link auth (magic link, OAuth)?                           | **Not in MVP.** `detectSessionInUrl: false`. Revisit when adding OAuth.                                                                                    |
| 6   | Biometric unlock?                                             | **Not in MVP.** Future enhancement — `expo-local-authentication` + session restore.                                                                        |

---

## Appendix A — Dependency graph

```
┌──────────────────────────────────────────────┐
│                    UI Layer                    │
│  LoginScreen  RegisterScreen  SplashScreen    │
│  RootNavigator  AuthNavigator                 │
└────────────────────┬─────────────────────────┘
                     │ uses
┌────────────────────▼─────────────────────────┐
│                 Hooks Layer                    │
│              useAuth.ts                        │
└───────┬────────────┬─────────────────────────┘
        │            │ uses
┌───────▼───┐  ┌─────▼─────────────────────────┐
│  Domain   │  │          Data Layer             │
│ validation│  │  auth.ts ← supabase.ts          │
│  .ts      │  │  apiClient.ts                   │
└───────────┘  └──────────┬────────────────────┘
                          │ reads/writes
                 ┌────────▼────────┐
                 │  expo-secure-   │
                 │  store          │
                 │  (via adapter)  │
                 └─────────────────┘
                          │
                 ┌────────▼────────┐
                 │  Supabase Auth  │
                 │  (cloud)        │
                 └─────────────────┘

Store (Zustand):
  authStore.ts ← written by useAuth hook
  appStore.ts  ← written by useAuth hook (onboardingCompleted)
```

---

## Appendix B — Supabase secure store key names

Supabase JS stores session data under specific keys. Our adapter delegates to expo-secure-store. Expected keys:

```
sb-<project-ref>-auth-token   → Full session JSON (access_token, refresh_token, etc.)
```

This is a single key containing the serialized session. `expo-secure-store` has a 2048-byte limit per key on some platforms — Supabase session JSON typically fits within this. If it exceeds the limit on older Android versions, consider chunking or using `expo-secure-store`'s `keychainAccessible` options.

**Monitoring:** Log a warning (not the value) if `setItem` fails due to size limits.
