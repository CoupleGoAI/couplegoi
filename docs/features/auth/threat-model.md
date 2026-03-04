# Feature: Authentication — Threat Model

> **Status**: Draft  
> **Spec**: `docs/features/auth/spec.md`  
> **Plan**: `docs/features/auth/plan.md`  
> **Author**: Security Agent  
> **Date**: 2026-03-04

---

## 1 · Data Classification

| Data element                                                       | Classification     | Storage location                                             | Retention                                    | Notes                                                                  |
| ------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------- |
| **Email address**                                                  | PII                | Supabase `auth.users` + `profiles.email`                     | Account lifetime                             | Displayed in profile UI; never logged client-side                      |
| **Password**                                                       | SECRET / transient | Never stored locally — transmitted over TLS to Supabase Auth | Transient (in-memory during form entry only) | Hashed server-side by Supabase (bcrypt). Never logged, never in store  |
| **Access token (JWT)**                                             | SECRET             | `expo-secure-store` via `ExpoSecureStoreAdapter`             | ~15 min (auto-refreshed)                     | Managed entirely by Supabase JS client. Never in Zustand, never logged |
| **Refresh token**                                                  | SECRET             | `expo-secure-store` via `ExpoSecureStoreAdapter`             | 30 days                                      | Managed entirely by Supabase JS client. Never in Zustand, never logged |
| **Session JSON blob**                                              | SECRET             | `expo-secure-store` (single key `sb-<ref>-auth-token`)       | Until sign-out or expiry                     | Contains both tokens + user metadata. ~1–2 KB                          |
| **User profile data** (name, avatar, onboarding status, couple_id) | PII                | Supabase `profiles` table; `authStore` (Zustand, in-memory)  | Account lifetime                             | Protected by RLS. No secrets — safe for Zustand                        |
| **Supabase URL**                                                   | PUBLIC             | Bundled via `EXPO_PUBLIC_SUPABASE_URL`                       | Permanent                                    | Safe for client embedding. Not a secret                                |
| **Supabase anon key**                                              | PUBLIC             | Bundled via `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`   | Permanent                                    | Grants no privilege beyond RLS-gated access. Safe for client           |
| **Supabase service_role key**                                      | SECRET / FORBIDDEN | Never on client                                              | N/A                                          | Only in server-side environments. Never bundled, never referenced      |
| **Validation errors**                                              | NON-SENSITIVE      | In-memory (component state)                                  | Ephemeral                                    | Generic user-facing messages only                                      |

---

## 2 · Threat Model

| #   | Threat                                                                                                                                                                                                   | STRIDE                             | Likelihood | Impact   | Risk       | Attack vector                                             | Affected assets                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- | -------- | ---------- | --------------------------------------------------------- | -------------------------------------- |
| T1  | **Token extraction from insecure storage** — Tokens stored in AsyncStorage or MMKV instead of expo-secure-store, allowing extraction on rooted/jailbroken devices or via backup                          | Information Disclosure             | Medium     | Critical | **High**   | Physical access, device backup extraction, rooted device  | Access token, refresh token            |
| T2  | **Token leakage via logging** — Tokens, passwords, or session JSON logged to console/crash reporter, captured in device logs or third-party analytics                                                    | Information Disclosure             | Medium     | Critical | **High**   | Log aggregation, device log access, crash report services | Access token, refresh token, password  |
| T3  | **Credential brute-force** — Attacker repeatedly attempts sign-in with common passwords against a known email                                                                                            | Spoofing                           | Medium     | High     | **High**   | Automated HTTP requests to Supabase Auth endpoint         | User account, email                    |
| T4  | **Session fixation / injection via deep links** — Attacker crafts a deep link containing a session token, tricking the app into adopting an attacker-controlled session                                  | Spoofing                           | Low        | Critical | **Medium** | Malicious deep link, social engineering                   | Session, user identity                 |
| T5  | **Stale session after logout** — Incomplete sign-out leaves tokens in secure store or state in Zustand, allowing session resurrection                                                                    | Elevation of Privilege             | Low        | High     | **Medium** | Shared device, physical access after logout               | Access token, refresh token, user data |
| T6  | **Sensitive data in error messages** — Stack traces, internal Supabase error codes, user IDs, or token fragments shown in UI or crash reports                                                            | Information Disclosure             | Medium     | Medium   | **Medium** | UI observation, crash report analysis                     | Internal IDs, error details            |
| T7  | **Man-in-the-middle on network requests** — Attacker intercepts auth traffic via compromised network, TLS stripping, or certificate pinning absence                                                      | Tampering / Information Disclosure | Low        | Critical | **Medium** | Public WiFi, compromised proxy, rogue CA                  | Credentials, tokens                    |
| T8  | **Race condition in auth state** — Concurrent `onAuthStateChange` events cause inconsistent store state (e.g., `isAuthenticated=true` with `user=null`)                                                  | Denial of Service                  | Low        | Medium   | **Low**    | Rapid token refresh + sign-out timing                     | App state consistency                  |
| T9  | **Profile data over-fetch / RLS bypass** — Missing or misconfigured RLS policies allow user to read/update other users' profiles                                                                         | Information Disclosure / Tampering | Low        | High     | **Medium** | Direct PostgREST queries with manipulated filters         | User PII, partner data                 |
| T10 | **Credential stuffing via reused passwords** — Users reuse passwords from breached services; attacker tries known email/password combos                                                                  | Spoofing                           | Medium     | High     | **High**   | Automated attacks using leaked credential databases       | User account                           |
| T11 | **Insecure password handling in memory** — Password string persists in JS heap after form submission, accessible via memory dump                                                                         | Information Disclosure             | Low        | Medium   | **Low**    | Memory forensics on physical device                       | Password                               |
| T12 | **Client-side validation bypass** — Attacker bypasses client-side email/password validation and submits malformed input directly to Supabase                                                             | Tampering                          | Low        | Low      | **Low**    | Modified app binary, direct API calls                     | Input integrity                        |
| T13 | **Untrusted input in className / style injection** — Dynamic user-controlled data (e.g., profile name) interpolated into NativeWind `className` props, causing unexpected styling or layout manipulation | Tampering                          | Low        | Low      | **Low**    | Crafted profile data containing Tailwind class names      | UI integrity                           |
| T14 | **expo-secure-store size limit exceeded** — Session JSON exceeds platform-specific size limits (~2 KB on some Android versions), causing silent storage failure and session loss                         | Denial of Service                  | Low        | Medium   | **Low**    | Large JWT claims, custom metadata                         | Session persistence                    |
| T15 | **Service role key leaked to client** — Developer accidentally embeds `SUPABASE_SERVICE_ROLE_KEY` in client code or env vars with `EXPO_PUBLIC_` prefix                                                  | Elevation of Privilege             | Low        | Critical | **High**   | Source code review, bundle decompilation                  | Full database access                   |

---

## 3 · Security Requirements

### MUST (mandatory — block release if violated)

| ID        | Requirement                                                                                                                                                                         | Rationale                                                                | Threats mitigated |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------- |
| **SR-1**  | All auth tokens (access, refresh, session blob) MUST be stored exclusively in `expo-secure-store`. Never AsyncStorage, MMKV, or Zustand.                                            | Platform-backed encryption (Keychain/Keystore)                           | T1                |
| **SR-2**  | `authStore` (Zustand) MUST NOT contain raw tokens, passwords, or session JSON. Only `AuthUser` object and boolean flags.                                                            | Zustand state is in-memory JS — easily inspectable                       | T1, T2            |
| **SR-3**  | Passwords MUST NOT be logged, stored, or persisted anywhere. Transient in form state only; cleared after submission.                                                                | Passwords are the highest-sensitivity transient data                     | T2, T11           |
| **SR-4**  | All `console.log`, crash reporters, and analytics MUST be audited to ensure no tokens, passwords, PII, or full request/response bodies are logged.                                  | Log files are a top exfiltration vector on mobile                        | T2                |
| **SR-5**  | `signOut()` MUST wipe: (a) Supabase server session, (b) expo-secure-store token keys, (c) `authStore.reset()`, (d) `appStore.reset()`, (e) any other feature stores with user data. | Prevents session resurrection on shared devices                          | T5                |
| **SR-6**  | `detectSessionInUrl` MUST be set to `false` in the Supabase client config.                                                                                                          | Prevents deep-link-based session injection in React Native               | T4                |
| **SR-7**  | Error messages displayed to users MUST be generic. No stack traces, Supabase internal error codes, user UUIDs, or token fragments.                                                  | Prevents information disclosure via UI                                   | T6                |
| **SR-8**  | `SUPABASE_SERVICE_ROLE_KEY` MUST NEVER appear in client code, environment variables with `EXPO_PUBLIC_` prefix, or any file included in the JS bundle.                              | Service role key bypasses all RLS                                        | T15               |
| **SR-9**  | All Supabase tables with user data MUST have RLS enabled, with policies that restrict row access to `auth.uid()` = owner (and partner for couple-scoped tables).                    | Prevents unauthorized data access even with valid anon key               | T9                |
| **SR-10** | Client-side input validation MUST exist for email and password fields (format, length). Server-side validation by Supabase Auth is the authoritative enforcement.                   | Defense in depth; client validation is UX, server validation is security | T12               |
| **SR-11** | All network communication with Supabase MUST use HTTPS. No HTTP fallback, no custom non-TLS endpoints.                                                                              | Prevents MitM attacks                                                    | T7                |
| **SR-12** | User-controlled data (profile name, email display) MUST NOT be interpolated into `className` props or used to construct dynamic style/class strings.                                | Prevents style injection via untrusted input                             | T13               |

### SHOULD (strongly recommended — document exception if skipped)

| ID        | Requirement                                                                                                                                            | Rationale                                                                                      | Threats mitigated |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------- |
| **SR-13** | SHOULD implement rate limiting awareness: detect repeated `INVALID_CREDENTIALS` errors and show progressive delay messaging or suggest password reset. | UX countermeasure against brute-force (server-side rate limiting is Supabase's responsibility) | T3, T10           |
| **SR-14** | SHOULD log a warning (value omitted) if `expo-secure-store` `setItem` fails, to detect storage limit issues.                                           | Early detection of T14                                                                         | T14               |
| **SR-15** | SHOULD clear password field values from React state after sign-in/sign-up submission completes (success or failure).                                   | Minimizes window of password exposure in JS heap                                               | T11               |
| **SR-16** | SHOULD add email confirmation flow in a post-MVP release to prevent account creation with unowned email addresses.                                     | Prevents impersonation and spam accounts                                                       | T3                |
| **SR-17** | SHOULD implement certificate pinning for Supabase endpoints in production builds.                                                                      | Hardens against MitM with rogue CA certs                                                       | T7                |
| **SR-18** | SHOULD add a `lastAuthError` timestamp to detect and log unusual patterns of repeated auth failures (without logging PII).                             | Anomaly detection for credential stuffing                                                      | T10               |

### MUST NOT (hard prohibitions)

| ID        | Prohibition                                                                                                                                                                 | Rationale                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **SR-19** | MUST NOT use `AsyncStorage` or `MMKV` for any auth-related secret (tokens, passwords, session data).                                                                        | These are not encrypted at rest                           |
| **SR-20** | MUST NOT log the value of any token, password, session JSON, or full API response body — even in `__DEV__` mode.                                                            | Dev logs can persist and be captured                      |
| **SR-21** | MUST NOT embed `SUPABASE_SERVICE_ROLE_KEY` anywhere in the mobile client codebase, configs, or build environment accessible to the bundle.                                  | Full DB admin bypass                                      |
| **SR-22** | MUST NOT display raw Supabase error messages to users. All errors pass through `mapAuthError()`.                                                                            | Internal error details aid attackers                      |
| **SR-23** | MUST NOT store `isAuthenticated` or auth state in persistent client storage (AsyncStorage, MMKV, secure store). Auth state is derived from Supabase session on each launch. | Prevents stale auth state; session is the source of truth |
| **SR-24** | MUST NOT disable or weaken RLS policies on any table containing user data.                                                                                                  | RLS is the primary authorization layer                    |

---

## 4 · Mitigation Mapping

| Threat                                        | Primary mitigation                                                             | Secondary mitigation                                                                                | Residual risk                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **T1** Token extraction from insecure storage | SR-1: expo-secure-store only (Keychain/Keystore)                               | SR-2: No tokens in Zustand; SR-19: No AsyncStorage                                                  | Low — rooted devices with physical access can still extract Keychain, but requires sophisticated attack                       |
| **T2** Token leakage via logging              | SR-4: Audit all logging; SR-20: Hard ban on token/password logging             | SR-3: Passwords never stored; Remove all `console.log` in prod builds                               | Low — requires developer discipline; add lint rule or Babel plugin to strip `console.*` in prod                               |
| **T3** Credential brute-force                 | Supabase Auth built-in rate limiting (server-side)                             | SR-13: Client-side progressive delay UX; SR-10: Input validation reduces invalid requests           | Low — Supabase handles rate limiting; no custom endpoint to bypass                                                            |
| **T4** Session fixation via deep links        | SR-6: `detectSessionInUrl: false`                                              | No URL-based auth flows in MVP                                                                      | Negligible — attack vector completely disabled                                                                                |
| **T5** Stale session after logout             | SR-5: Full wipe (server + secure store + all Zustand stores)                   | onAuthStateChange listener catches server-side sign-out                                             | Low — wipe is synchronous and comprehensive; edge case if app crashes mid-signout                                             |
| **T6** Sensitive data in error messages       | SR-7: Generic error messages; SR-22: `mapAuthError()` required                 | SR-4: No logging of raw errors                                                                      | Negligible — all error paths go through mapping function                                                                      |
| **T7** MitM on network requests               | SR-11: HTTPS enforced by Supabase                                              | SR-17: Certificate pinning (post-MVP)                                                               | Low — standard TLS is sufficient for MVP; pinning hardens further                                                             |
| **T8** Race condition in auth state           | Sequential state updates in `onAuthStateChange` handler                        | `setInitialized` gate prevents UI from rendering before hydration completes                         | Low — Supabase JS serializes auth events; Zustand updates are synchronous                                                     |
| **T9** Profile data over-fetch / RLS bypass   | SR-9: RLS enabled on all tables; policies restrict to `auth.uid()` and partner | SR-24: Never disable RLS                                                                            | Negligible — RLS is enforced server-side regardless of client behavior                                                        |
| **T10** Credential stuffing                   | Supabase Auth rate limiting                                                    | SR-13: Progressive delay UX; SR-16: Email confirmation (post-MVP); SR-18: Failure pattern detection | Medium — depends on Supabase rate limiting config; no custom server-side controls in MVP                                      |
| **T11** Password in JS heap                   | SR-15: Clear password from state after submission                              | SR-3: Never persist passwords                                                                       | Low — JS heap extraction requires physical access + debugging tools                                                           |
| **T12** Client-side validation bypass         | SR-10: Server-side validation by Supabase Auth is authoritative                | Client validation is defense-in-depth only                                                          | Negligible — server always validates                                                                                          |
| **T13** className / style injection           | SR-12: Never interpolate user data into className                              | Always render user text inside `<Text>` components, never as class strings                          | Negligible — NativeWind compiles classes at build time; runtime injection has minimal impact but rule prevents any edge cases |
| **T14** Secure store size limit               | SR-14: Log warning on storage failure                                          | Monitor Supabase session size; avoid custom claims that inflate JWT                                 | Low — default Supabase JWT size is well within limits                                                                         |
| **T15** Service role key leaked               | SR-8: Hard ban on client-side usage; SR-21: Never in `EXPO_PUBLIC_*`           | Code review, grep CI check for `service_role` in client code                                        | Negligible if process followed — catastrophic if violated                                                                     |

---

## 5 · Secure Implementation Checklist

This checklist must be verified before the auth feature is merged.

### 5.1 · Data layer (`src/data/supabase.ts`)

- [ ] `ExpoSecureStoreAdapter` uses only `expo-secure-store` APIs (`getItemAsync`, `setItemAsync`, `deleteItemAsync`)
- [ ] `storage: ExpoSecureStoreAdapter` is set in Supabase client config
- [ ] `detectSessionInUrl: false` is set
- [ ] `autoRefreshToken: true` is set
- [ ] `persistSession: true` is set
- [ ] Environment variables use `EXPO_PUBLIC_` prefix only for URL and anon key
- [ ] No `service_role` key appears anywhere in `src/` or in env vars prefixed with `EXPO_PUBLIC_`
- [ ] No `console.log` of token values, session objects, or passwords

### 5.2 · Data layer (`src/data/auth.ts`)

- [ ] All auth functions return `AuthResult<T>` — never throw
- [ ] `mapAuthError()` converts all Supabase errors to generic, user-safe messages
- [ ] No raw Supabase error `.message` is passed to UI without mapping
- [ ] `signUp` / `signIn` do not log email, password, or response tokens
- [ ] `signOut` calls `supabase.auth.signOut()` (invalidates server session + clears secure store)
- [ ] `fetchProfile` uses Supabase client (which attaches auth headers automatically) — no manual token handling

### 5.3 · Store (`src/store/authStore.ts`)

- [ ] Store contains only `AuthUser | null`, boolean flags, and `error: string | null`
- [ ] No `accessToken`, `refreshToken`, or `session` fields in the store interface
- [ ] `reset()` method returns all fields to initial state (user=null, isAuthenticated=false, etc.)

### 5.4 · Hook (`src/hooks/useAuth.ts`)

- [ ] `signOut()` calls in order: `authData.signOut()` → `resetAuth()` → `resetApp()` → reset any other feature stores (chatStore, gameStore)
- [ ] `onAuthStateChange` listener handles `SIGNED_OUT` event by wiping all stores
- [ ] `initialize()` wrapped in try/catch — failure results in showing login screen, not crashing
- [ ] No tokens are passed through the hook interface — only `AuthUser` and operation results

### 5.5 · Domain (`src/domain/auth/validation.ts`)

- [ ] Pure functions — no imports from `@data/*`, `@store/*`, or `@hooks/*`
- [ ] Email regex rejects empty/whitespace-only input
- [ ] Password minimum length enforced (≥8 characters)
- [ ] No passwords or emails are logged inside validation functions

### 5.6 · Screens (`src/screens/auth/LoginScreen.tsx`, `RegisterScreen.tsx`)

- [ ] Password fields use `secureTextEntry={true}`
- [ ] No `console.log` of form values
- [ ] Error display uses `authStore.error` only (never raw error objects)
- [ ] Client-side validation runs before any network call
- [ ] Loading state (`isLoading`) prevents double-submission
- [ ] No user-controlled data interpolated into `className` props
- [ ] Password field state is cleared after submission (success or failure) — SR-15
- [ ] `autoCapitalize="none"` and `autoCorrect={false}` on email and password fields
- [ ] `textContentType="emailAddress"` / `textContentType="password"` for iOS autofill support

### 5.7 · Navigation (`src/navigation/RootNavigator.tsx`)

- [ ] 3-way switch based on `isInitialized`, `isAuthenticated`, `onboardingCompleted`
- [ ] `isInitialized=false` shows splash (prevents flash of auth screen)
- [ ] Auth state derived from Supabase session — not from persistent local flags
- [ ] No navigation to authenticated screens is possible without `isAuthenticated=true`

### 5.8 · Environment & build

- [ ] `.env` is in `.gitignore`
- [ ] `.env.local` contains placeholder values (not real keys)
- [ ] No `service_role` key in any `EXPO_PUBLIC_*` variable
- [ ] `react-native-url-polyfill/auto` imported at app entry point (before Supabase client)
- [ ] Grep CI check: no occurrence of `service_role` in `src/` directory

### 5.9 · Database (Supabase)

- [ ] `profiles` table has RLS enabled
- [ ] SELECT policy: own profile only (`auth.uid() = id`) + partner via `couple_id` match
- [ ] INSERT policy: own profile only
- [ ] UPDATE policy: own profile only
- [ ] No DELETE policy on profiles (accounts are managed via Supabase Auth admin)
- [ ] `pairing_tokens` table: SELECT own only; INSERT/UPDATE/DELETE restricted to service role

---

## 6 · Verification Plan

### 6.1 · Automated verification

| Check                         | Method                                                                                                                 | When                          | Target                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| **No tokens in Zustand**      | Grep `src/store/authStore.ts` for `accessToken\|refreshToken\|session`                                                 | PR CI                         | Must return 0 matches                                        |
| **No AsyncStorage for auth**  | Grep `src/` for `AsyncStorage` co-located with auth/token/session                                                      | PR CI                         | Must return 0 matches                                        |
| **No service_role in client** | Grep entire `src/` and `*.env*` for `service_role\|SERVICE_ROLE`                                                       | PR CI                         | Must return 0 matches (outside comments/docs)                |
| **No console.log of secrets** | Grep `src/data/auth.ts`, `src/data/supabase.ts`, `src/hooks/useAuth.ts` for `console\.(log\|warn\|error\|debug\|info)` | PR CI                         | Must return 0 matches, or only SR-14 storage-failure warning |
| **mapAuthError coverage**     | Unit test: pass each known Supabase error string → verify mapped output                                                | Unit test suite               | All error codes produce generic messages                     |
| **Validation pure functions** | Unit test `validateEmail`, `validatePassword`, `validatePasswordMatch`                                                 | Unit test suite               | 100% branch coverage                                         |
| **signOut completeness**      | Integration test: mock stores, call signOut, assert all stores reset                                                   | Integration test              | All stores return to initial state                           |
| **RLS policies**              | SQL test: attempt SELECT/UPDATE on another user's profile row with authenticated role                                  | Supabase test suite or manual | All unauthorized operations return 0 rows or error           |

### 6.2 · Manual verification

| #   | Test scenario                | Steps                                                                                         | Expected result                                                                  | Threats validated |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------- |
| 1   | **Token storage location**   | Register → inspect device storage (not secure store) for token keys                           | No tokens in AsyncStorage, SharedPreferences, or plist                           | T1                |
| 2   | **Token not in Zustand**     | Register → use React DevTools / Flipper to inspect Zustand state                              | `authStore` contains `user` (AuthUser), boolean flags, `error` — no raw tokens   | T1, T2            |
| 3   | **Logout completeness**      | Login → Logout → check expo-secure-store keys + Zustand state                                 | All secure store auth keys removed; all stores reset to initial                  | T5                |
| 4   | **Session persistence**      | Login → kill app → relaunch                                                                   | App restores session from secure store → lands on correct screen (no login)      | T1, T8            |
| 5   | **Session expiry handling**  | Login → wait for access token to expire (or mock short expiry) → make API call                | Token auto-refreshes silently; if refresh token also expired → redirect to login | T5, T8            |
| 6   | **Wrong password**           | Enter valid email + wrong password → submit                                                   | Generic error: "Incorrect email or password." — no Supabase error codes visible  | T6                |
| 7   | **Duplicate registration**   | Register → register same email again                                                          | Generic error: "An account with this email already exists."                      | T6                |
| 8   | **Network failure**          | Enable airplane mode → attempt login                                                          | Generic error: "Network error. Please check your connection."                    | T6, T7            |
| 9   | **Password not logged**      | Open Metro console → register with password → search console output                           | No passwords, tokens, or PII in console output                                   | T2                |
| 10  | **Deep link injection**      | Construct a deep link with a session token → open in app                                      | App ignores URL-based session (`detectSessionInUrl: false`)                      | T4                |
| 11  | **RLS enforcement**          | Using Supabase client with User A's token, query User B's profile directly                    | RLS returns 0 rows (not an error — just empty result)                            | T9                |
| 12  | **Double-submit prevention** | Tap "Log In" rapidly multiple times                                                           | Button shows loading state; only one network request fires                       | T8                |
| 13  | **className injection**      | Set profile name to a Tailwind class string (e.g., `"bg-red-500 p-10"`) → navigate to profile | Name displayed as text; no style changes applied                                 | T13               |
| 14  | **Secure text entry**        | Observe password field on screen                                                              | Characters masked, no autocomplete suggestions for password content              | T2                |
| 15  | **Service role key absence** | Search entire built JS bundle for `service_role` or known service role key prefix             | No matches                                                                       | T15               |

### 6.3 · Periodic / release verification

| Check                                                                                          | Frequency                      | Owner              |
| ---------------------------------------------------------------------------------------------- | ------------------------------ | ------------------ |
| Review Supabase Auth rate limiting config                                                      | Each release                   | Security / Backend |
| Verify RLS policies match plan after schema migrations                                         | Each migration                 | Security / Backend |
| Audit `expo-secure-store` usage — confirm no new AsyncStorage usage for secrets                | Each release                   | Security review    |
| Dependency audit (`npm audit` / `pnpm audit`) for `@supabase/supabase-js`, `expo-secure-store` | Monthly                        | DevOps             |
| Review error mapping — ensure new Supabase error strings are captured by `mapAuthError`        | After Supabase client upgrades | Implementer        |

---

## Appendix A — STRIDE-per-Element Summary

| Element                | Spoofing | Tampering | Repudiation | Info Disclosure       | DoS | Elevation |
| ---------------------- | -------- | --------- | ----------- | --------------------- | --- | --------- |
| Login form             | T3, T10  | T12       | —           | T2, T11               | —   | —         |
| Supabase Auth endpoint | T3, T10  | —         | —           | T7                    | T3  | —         |
| Token storage          | —        | —         | —           | T1                    | T14 | T5        |
| Zustand auth store     | —        | —         | —           | T1 (if tokens stored) | T8  | —         |
| RLS policies           | —        | T9        | —           | T9                    | —   | T9        |
| Error display          | —        | —         | —           | T6                    | —   | —         |
| Deep link handler      | T4       | —         | —           | —                     | —   | T4        |
| Environment config     | —        | —         | —           | T15                   | —   | T15       |
| UI className props     | —        | T13       | —           | —                     | —   | —         |
