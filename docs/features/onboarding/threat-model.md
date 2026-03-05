# Threat Model: AI Onboarding

## Scope

The onboarding chat screen and its data pipeline:
- `OnboardingChatScreen` → `useOnboarding` hook → `onboardingApi` → REST API + Supabase

---

## Assets at risk

| Asset | Sensitivity |
|---|---|
| Auth access token | Critical — must never be logged or exposed |
| User's onboarding answers (name, age range, personality) | PII — treat with care |
| `onboarding_completed` flag | High — corruption locks user out of app |
| Session state / Zustand store | Medium — wrong state causes bad UX routing |

---

## Threats & Mitigations

### T1 — Auth bypass (skip onboarding)

**Risk**: User navigates away from onboarding screen or manipulates app state to access Main without completing onboarding.

**MUST**: `gestureEnabled: false` on the Onboarding stack screen — back swipe disabled.
**MUST**: No back button rendered in `OnboardingChatScreen`.
**MUST**: `RootNavigator` derives routing from `authStore.user.onboardingCompleted`, which is always hydrated from `public.profiles` via `fetchProfile` — not from local store only.
**MUST NOT**: Allow navigation to Main until `onboardingCompleted = true` is confirmed from the server (Supabase RLS ensures server authority).

### T2 — Token leakage

**Risk**: Auth Bearer token logged, included in error messages, or sent to wrong endpoint.

**MUST NOT**: Log `Authorization` header or `access_token` value anywhere.
**MUST**: Token is only read inside `apiFetch` and never stored as a local variable outside that function scope.
**MUST**: Error messages returned by `apiFetch` are generic strings — no token fragments, internal IDs, or stack traces.
**MUST**: `API_BASE_URL` is explicitly set to a trusted domain; no dynamic URL construction with user input.

### T3 — Malicious API response

**Risk**: Backend returns a malformed or adversarial response shape that corrupts Zustand state (e.g., `NaN` in `currentQuestion`, XSS in `reply`).

**MUST**: Runtime shape guard in `useOnboarding.sendMessage` verifies `reply: string`, `questionIndex: number`, `isComplete: boolean` before writing to store.
**MUST NOT**: Use `as T` casts for fields that drive navigation decisions (`isComplete`) without validation.
**SHOULD**: Treat AI-generated `reply` content as untrusted for display purposes — React Native's `Text` component provides sufficient XSS isolation.

### T4 — Oversized user input payload

**Risk**: User pastes extremely long text, causing high backend processing cost or API errors.

**MUST**: `sanitizeMessage` from domain layer is called before any API call — truncates to 500 chars.
**MUST**: `TextInput maxLength={500}` enforced in UI as a second layer.
**MUST NOT**: Send raw `text.trim()` directly to the API without domain-layer sanitization.

### T5 — Resume-state integrity (mid-onboarding restart)

**Risk**: Restored message history from Supabase contains tampered `role` values.

**MUST**: `fetchOnboardingHistory` narrows `role` to `'user' | 'assistant'` using explicit equality checks before returning — any unexpected value is mapped to `'user'`.
**MUST**: Supabase RLS on `public.messages` ensures only the authenticated user's own messages are returned (`user_id = auth.uid()`).

### T6 — PII in logs or error surfaces

**Risk**: User's name, age range, or personality answers appear in error messages or console logs.

**MUST NOT**: Log message content anywhere in the data or hook layer.
**MUST**: Error messages are generic and user-safe — no answer content, no internal IDs.
**MUST**: Progress store is reset on logout (`onboardingStore.reset()` should be called from `useAuth.signOut`).

### T7 — Stuck completion state

**Risk**: `isComplete = true` in the store but `authStore.user.onboardingCompleted` is still `false` (e.g., `fetchProfile` failed). User sees completion screen but cannot proceed.

**MUST**: "Let's Go!" button calls `retryComplete()` which re-fetches the auth profile and updates the store.
**MUST**: Error banner is shown if retry fails so the user knows to try again.
**SHOULD**: On next app launch, `useAuth.initialize()` will always re-fetch the profile from Supabase, naturally recovering the state.

---

## Implementation checklist

- [x] `gestureEnabled: false` on Onboarding screen
- [x] No back button in `OnboardingChatScreen`
- [x] Bearer token not logged
- [x] Generic error messages (no token fragments, no PII)
- [x] `sanitizeMessage` wired in `useOnboarding.sendMessage` before API call
- [x] Runtime shape guard on `OnboardingMessageResponse` before writing to store
- [x] `fetchOnboardingHistory` narrows `role` field
- [x] Supabase RLS enforces `user_id = auth.uid()` on messages
- [x] "Let's Go!" completion button retries `fetchProfile` with error feedback
- [x] `onboardingStore.reset()` called on `signOut` (wired in `useAuth.signOut`)
