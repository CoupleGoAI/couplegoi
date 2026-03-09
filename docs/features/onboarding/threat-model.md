# Feature: Onboarding Chat — Threat Model

> **Status**: Draft
> **Spec**: `docs/features/onboarding/spec.md`
> **Plan**: `docs/features/onboarding/plan.md`
> **Date**: 2026-03-09

---

## 1 · Threats

| # | Asset | Threat | Impact |
|---|---|---|---|
| T1 | Profile PII (name, birth_date, dating_start_date) | Edge function stores user-supplied PII without sanitization — script injection or oversized values corrupt profile data | Medium — corrupted profile data, potential XSS if rendered unsanitized elsewhere |
| T2 | Onboarding state (question progress) | Client sends crafted `questionIndex` or `isComplete` to skip questions — edge function trusts client-supplied progress | High — user bypasses mandatory onboarding, profile fields remain null |
| T3 | Auth session (JWT) | Edge function uses `client.auth.getUser()` (HS256) instead of Auth REST API (ES256) — all requests fail with 401 or auth is bypassed | High — broken auth or user impersonation |
| T4 | Messages table | Client or edge function inserts messages with wrong `user_id` — user impersonation in chat history | Medium — data integrity violation, messages attributed to wrong user |
| T5 | Profile fields | Edge function uses service_role client without verifying user identity — any authenticated user could write to any profile | Critical — unauthorized profile modification |
| T6 | Help focus enum | Client sends arbitrary string for help_focus — stored without validation, breaks downstream logic that expects canonical values | Low — data integrity issue, could cause runtime errors |
| T7 | Date fields | Client-supplied dates pass through to DB without server-side parsing — malformed dates, future dates, or impossible ages stored | Medium — invalid data in profile, breaks age-dependent features |
| T8 | Chat messages | Full API response bodies or user PII logged in client console — captured in device logs or crash reporters | Medium — PII exposure via logs |
| T9 | Onboarding flow | User kills app mid-request — partial state (message persisted, profile field not updated, or vice versa) makes onboarding non-resumable | Medium — stuck onboarding, user cannot proceed |
| T10 | Edge function | Replay attack — attacker replays a valid onboarding request to re-answer a question or overwrite a profile field | Low — profile field overwritten with same or different value |

---

## 2 · Requirements

### MUST (blockers)

- **MUST-1**: Edge function MUST verify JWT via Auth REST API (`/auth/v1/user`), never `client.auth.getUser()`. Rationale: ES256 JWT incompatibility (T3).
- **MUST-2**: Edge function MUST derive current question step from persisted profile fields (null = not answered), never from client-supplied `questionIndex`. Rationale: prevents skip attacks (T2).
- **MUST-3**: Edge function MUST validate and normalize all user input server-side: name (2–50 chars, letters/spaces/apostrophe/hyphen only), birth_date and dating_start_date via `chrono-node` (past dates, age 16–110, dating after birth), help_focus against canonical enum set. Rationale: T1, T6, T7.
- **MUST-4**: Edge function MUST use `user.id` from the Auth REST API response as the `user_id` for all DB operations — never accept `user_id` from the client request body. Rationale: T4, T5.
- **MUST-5**: Edge function MUST persist both the user message and the assistant reply in the same request, and update the profile field atomically where possible. If the profile update fails after messages are persisted, the function MUST return an error (the step derivation from profile nulls makes this resumable). Rationale: T9.
- **MUST-6**: Client MUST pass user input through `sanitizeMessage()` (trim + 500-char limit) before sending to the edge function. Rationale: defense-in-depth (T1).
- **MUST-7**: Client MUST NOT log tokens, PII, or full API response bodies. The existing `console.log('[onboarding] response:', ...)` in `onboardingApi.ts` MUST be removed. Rationale: T8.

### MUST-NOT (hard prohibitions)

- **MUST-NOT-1**: Edge function MUST NOT trust any client-supplied field for authorization or progress tracking (`questionIndex`, `isComplete`, `user_id`).
- **MUST-NOT-2**: Edge function MUST NOT use `client.auth.getUser()` for JWT verification (HS256 incompatibility with ES256 tokens).
- **MUST-NOT-3**: Edge function MUST NOT use service_role client without first verifying user identity via Auth REST API.
- **MUST-NOT-4**: Client MUST NOT parse or validate dates — all date logic is server-side only.
- **MUST-NOT-5**: Client MUST NOT display raw edge function error messages — map to generic user-facing strings.
- **MUST-NOT-6**: Edge function MUST NOT store `help_focus` values outside the canonical set (`communication`, `conflict`, `trust`, `emotional_connection`, `intimacy`, `other`).

---

## 3 · Checklist

```
- [ ] Tokens in expo-secure-store, never AsyncStorage (inherited from auth — no change needed)
- [ ] No console.log with tokens, PII, or full payloads (remove existing log in onboardingApi.ts)
- [ ] All external input validated server-side (name format, date parsing, help_focus enum)
- [ ] Error messages generic — no stack traces or internal IDs shown to user
- [ ] Sensitive state wiped on logout (onboardingStore.reset() called in useAuth.signOut)
- [ ] Edge function: JWT verified via Auth REST API (/auth/v1/user), not client.auth.getUser()
- [ ] Edge function: user_id derived from auth, never from request body
- [ ] Edge function: current step derived from profile field nulls, never from client input
- [ ] Edge function: chrono-node used for date parsing; dates validated (past, age range, ordering)
- [ ] Edge function: help_focus strictly validated against canonical enum set
- [ ] Edge function: verify_jwt = false in supabase/config.toml (already set)
- [ ] Client: sanitizeMessage() called before every sendOnboardingMessage()
- [ ] Client: no date parsing or validation logic — server is authoritative
- [ ] RLS enabled on profiles and messages tables (already set)
```
