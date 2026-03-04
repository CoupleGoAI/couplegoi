# Implementation Notes: Authentication

## Summary

Email/password authentication using Supabase Auth, with persistent sessions stored in `expo-secure-store`. The Supabase JS client manages the full token lifecycle (sign-up, sign-in, refresh, sign-out) via a custom secure storage adapter. Navigation gates now follow a 3-way switch: splash → auth → app (onboarding or main tabs). All auth operations flow through a single `useAuth` orchestration hook.

## Files changed

### New

- `src/data/supabase.ts` — Supabase client singleton with `ExpoSecureStoreAdapter` backed by expo-secure-store
- `src/data/auth.ts` — Typed wrappers around `supabase.auth.*` returning `AuthResult<T>` discriminated unions
- `src/data/apiClient.ts` — Generic typed query helper for future PostgREST/Edge Function calls
- `src/domain/auth/validation.ts` — Pure email/password/confirm-match validation functions
- `src/store/authStore.ts` — Auth Zustand slice: user, isAuthenticated, isInitialized, isLoading, error
- `src/hooks/useAuth.ts` — Orchestration hook: initialize, signUp, signIn, signOut, hydrateUser, onAuthStateChange
- `src/screens/auth/LoginScreen.tsx` — Email + password login form with validation + error states
- `src/screens/auth/RegisterScreen.tsx` — Email + password + confirm registration form
- `src/screens/auth/SplashScreen.tsx` — Minimal loading screen during session restore
- `src/navigation/AuthNavigator.tsx` — Stack navigator (Login ↔ Register)
- `.env.local` — Placeholder Supabase env vars

### Modified

- `src/types/index.ts` — Added AuthUser, AuthSession, AuthError, AuthResult, ValidationResult
- `src/store/appStore.ts` — Renamed `isOnboarded` → `onboardingCompleted`, `setOnboarded` → `setOnboardingCompleted`
- `src/navigation/types.ts` — Added AuthStackParamList, updated RootStackParamList, removed Welcome/CreateAccount from OnboardingStackParamList
- `src/navigation/RootNavigator.tsx` — 3-way auth switch (splash → auth → onboarding → main), calls initialize() on mount
- `src/navigation/OnboardingNavigator.tsx` — Removed Welcome/CreateAccount screens, starts at GenerateQR
- `src/screens/main/ProfileScreen.tsx` — Logout now uses useAuth().signOut() for complete state wipe
- `src/screens/onboarding/ConnectionConfirmedScreen.tsx` — Updated setOnboarded → setOnboardingCompleted
- `tsconfig.json` — Added @data/_ and @domain/_ path aliases
- `babel.config.js` — Added @data and @domain aliases
- `App.tsx` — Added react-native-url-polyfill/auto import

### Dead code (to be deleted)

- `src/screens/onboarding/WelcomeScreen.tsx` — Replaced by LoginScreen
- `src/screens/onboarding/CreateAccountScreen.tsx` — Replaced by RegisterScreen

## Security requirements satisfied

- [x] SR-1: Tokens stored in expo-secure-store via ExpoSecureStoreAdapter (never AsyncStorage)
- [x] SR-2: authStore holds only AuthUser + booleans — no raw tokens in Zustand
- [x] SR-3: Passwords never stored locally — transient in React state, cleared after submission (SR-15)
- [x] SR-4: Zero console.log calls in any auth-related file
- [x] SR-5: signOut() wipes Supabase session + authStore + appStore + chatStore + gameStore
- [x] SR-6: detectSessionInUrl: false in Supabase client config
- [x] SR-7: All errors pass through mapAuthError() — generic messages only
- [x] SR-8: No service_role key in client code
- [x] SR-9: RLS already enabled on profiles/couples tables (from existing schema)
- [x] SR-10: Client-side validation for email (format) and password (≥8 chars) before API call
- [x] SR-11: HTTPS enforced by Supabase client
- [x] SR-12: No user-controlled data in className props
- [x] SR-15: Password field state cleared after every submission attempt (success or failure)
- [x] SR-19: No AsyncStorage/MMKV for secrets
- [x] SR-20: No logging of tokens/passwords/PII
- [x] SR-22: All Supabase errors mapped via mapAuthError()
- [x] SR-23: Auth state derived from Supabase session, not persistent local storage

## How to test

### Prerequisites

1. Install new dependencies: `npx expo install @supabase/supabase-js expo-secure-store react-native-url-polyfill`
2. Create `.env` file with your Supabase project credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
   ```
3. Ensure Supabase project has:
   - Email auth enabled (Dashboard → Auth → Settings)
   - "Confirm email" disabled for MVP
   - The database schema from `supabase/schemas/` applied

### Manual test steps

1. Fresh install, launch app → SplashScreen briefly → LoginScreen
2. Tap "Sign up" link → RegisterScreen
3. Submit empty form → inline validation errors on all fields
4. Enter valid email, password < 8 chars → "Password must be at least 8 characters."
5. Enter mismatched passwords → "Passwords do not match."
6. Register with valid credentials → loading spinner → navigate to Onboarding (GenerateQR)
7. Kill app, relaunch → SplashScreen briefly → Onboarding (session restored)
8. Complete onboarding, kill app, relaunch → SplashScreen briefly → Main tabs
9. Profile → "Disconnect & Log Out" → confirm → LoginScreen
10. Log in with existing credentials → Main tabs
11. Register with existing email → "An account with this email already exists."
12. Log in with wrong password → "Incorrect email or password."
13. Toggle airplane mode, try to log in → "Network error. Please check your connection."

## Tests added

- Domain validation unit tests to be added: `src/domain/auth/__tests__/validation.test.ts`
- Auth hook integration tests to be added: `src/hooks/__tests__/useAuth.test.ts`

## Known limitations / follow-ups

- WelcomeScreen.tsx and CreateAccountScreen.tsx are dead code — must be manually deleted (`rm src/screens/onboarding/WelcomeScreen.tsx src/screens/onboarding/CreateAccountScreen.tsx`)
- No "Forgot password" flow (per spec: not in MVP)
- No email confirmation (Supabase setting must be disabled for MVP)
- No biometric unlock
- No certificate pinning (SHOULD for production)
- chatStore and gameStore have `clearMessages()`/`endGame()` but no formal `reset()` — consider adding

## Review P0 fixes applied

- **P0 #1-6 (path aliases)**: Replaced deep relative imports with path aliases in all 6 auth files
- **P0 #7 (`as any` gradient casts)**: Fixed gradient typing at source (`tokens.ts` + `colors.ts`) — removed `readonly` and `as const` so arrays are `string[]` compatible with `LinearGradient`. Removed all `as any` casts across the entire codebase (not just auth files)
- **P0 #8 (hardcoded hex)**: Added `errorBg` token to `tokens.ts`, `colors.ts`, and `tailwind.config.js`, referenced from screens
- **P0 #9 (token exposure via hook)**: Changed `useAuth` signUp/signIn return type from `AuthResult<AuthSession>` to `AuthOpResult` (`{ ok: true }` or `{ ok: false, error: { message } }`) — no tokens ever leave the hook

## Review P1 fixes applied

- **P1 #1-2 (password clearing)**: Passwords are now cleared after every submission attempt, regardless of success or failure (per SR-15)
