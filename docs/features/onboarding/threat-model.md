# Feature: Onboarding Chat — Threat Model

> **Status**: Final  
> **Spec**: `docs/features/onboarding/spec.md`  
> **Plan**: `docs/features/onboarding/plan.md`  
> **Author**: Security Agent  
> **Date**: 2026-03-05

---

## 1 · Data Classification

| Data element               | Classification             | Storage location                                                     | Retention                               | Notes                                                                            |
| -------------------------- | -------------------------- | -------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| **First name**             | PII                        | `profiles.name` (Postgres) + `onboardingStore` (Zustand, in-memory)  | Account lifetime (DB), session (memory) | Displayed in assistant prompts; never logged client-side                         |
| **Birth date**             | PII / sensitive            | `profiles.birth_date` (Postgres)                                     | Account lifetime                        | Normalized to `YYYY-MM-DD`; reveals age — treat as sensitive PII                 |
| **Dating start date**      | PII                        | `profiles.dating_start_date` (Postgres)                              | Account lifetime                        | Normalized to `YYYY-MM-DD`                                                       |
| **Help focus**             | Personal / low sensitivity | `profiles.help_focus` (Postgres)                                     | Account lifetime                        | One of 6 canonical values; reveals relationship struggles — moderate sensitivity |
| **Onboarding messages**    | PII (user content)         | `messages` table (Postgres) + `onboardingStore` (Zustand, in-memory) | Account lifetime (DB), session (memory) | Contains raw user input for all questions; `conversation_type='onboarding'`      |
| **Access token (JWT)**     | SECRET                     | `expo-secure-store` via `supabase-js` adapter                        | ~15 min (auto-refresh)                  | Passed to edge function via `Authorization` header; never logged                 |
| **Refresh token**          | SECRET                     | `expo-secure-store` via `supabase-js` adapter                        | 30 days                                 | Managed by `supabase-js`; never accessed directly                                |
| **Service role key**       | SECRET / server-only       | Deno runtime `SUPABASE_SERVICE_ROLE_KEY` env var                     | N/A on client                           | Used by edge function admin client for profile writes; never exposed to client   |
| **User ID (UUID)**         | Internal identifier        | JWT claim + profile row                                              | Account lifetime                        | Used to scope all DB queries; not displayed to user                              |
| **Conversation type flag** | Non-sensitive              | `messages.conversation_type`                                         | Account lifetime                        | Distinguishes onboarding vs. AI chat messages                                    |

---

## 2 · Threat Model

| #   | Asset                          | Threat                                                                                                                                                                    | Attacker                          | Entry point                                                        | Impact                                                                                 | Likelihood |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------- |
| T1  | Profile PII (name, DOB, dates) | **Profile data over-write via direct PostgREST** — attacker calls `supabase.from('profiles').update(...)` bypassing edge function to set arbitrary values                 | Authenticated malicious user      | Direct PostgREST API                                               | Profile corruption; bypass validation; write invalid dates/names                       | Medium     |
| T2  | Messages table                 | **Message injection via direct insert** — attacker inserts messages with `role='assistant'` or manipulated content directly via PostgREST, poisoning conversation history | Authenticated malicious user      | `supabase.from('messages').insert(...)`                            | Fake assistant messages displayed on resume; social-engineering-adjacent               | Medium     |
| T3  | Edge function input            | **Oversized payload / DoS** — attacker sends very large message bodies to exhaust edge function resources                                                                 | Authenticated user / bot          | `POST /functions/v1/onboarding-chat` body                          | Edge function CPU/memory exhaustion; degraded service                                  | Low        |
| T4  | Name field                     | **Stored content injection** — malicious name stored in `profiles.name` used unsanitized in assistant prompt strings or UI rendering                                      | Authenticated malicious user      | User message at step 0                                             | XSS in web contexts; misleading UI in RN; prompt injection if name ever reaches an LLM | Low        |
| T5  | Date parsing                   | **Date parser exploitation** — crafted input triggers `Date.parse` fallback with unexpected results (e.g., relative dates, timezone shifts)                               | Authenticated user                | User message at steps 1 & 2                                        | Incorrect birth/dating dates stored; minor data integrity issue                        | Low        |
| T6  | Help focus field               | **Enum bypass** — attacker sends raw PostgREST update to set `help_focus` to an arbitrary string, bypassing the canonical allowlist                                       | Authenticated malicious user      | Direct PostgREST API                                               | Invalid help_focus values in DB; downstream logic/display errors                       | Low        |
| T7  | Onboarding gate                | **Onboarding bypass** — attacker directly sets `onboarding_completed=true` via PostgREST, skipping all profile collection                                                 | Authenticated malicious user      | `supabase.from('profiles').update({ onboarding_completed: true })` | Incomplete profile; null fields cause downstream errors                                | Medium     |
| T8  | JWT / auth                     | **Missing or forged JWT** — request to edge function without valid auth                                                                                                   | Unauthenticated attacker          | HTTP request to edge function URL                                  | Unauthorized profile read/write                                                        | Medium     |
| T9  | Error responses                | **Information leakage in error messages** — edge function or client surfaces stack traces, SQL errors, or internal IDs                                                    | Any user                          | Error display in UI or network response body                       | Reveals internal architecture, table names, column names                               | Low        |
| T10 | Service role key               | **Service role key leakage** — key accidentally bundled in client code or logged in edge function                                                                         | Developer error                   | Source code / bundle / edge function logs                          | Full RLS bypass; unrestricted database access                                          | Low        |
| T11 | Onboarding messages            | **PII in logs** — user-submitted PII (name, DOB) logged via `console.log` in client code, edge function, or crash reporters                                               | Developer error / log aggregation | Client logs, Deno runtime logs, crash reporters                    | PII exposure to third parties                                                          | Medium     |
| T12 | Conversation history           | **Cross-user data access via RLS misconfiguration** — broken RLS policy allows user A to read user B's onboarding messages                                                | Authenticated malicious user      | `supabase.from('messages').select(...)` with manipulated filters   | Leak of another user's PII and conversation                                            | Low        |
| T13 | Session state                  | **Stale onboarding state after logout** — Zustand store not reset on sign-out; next user on shared device sees previous user's onboarding messages                        | Physical access / shared device   | Shared device, sign out → sign in as different user                | PII leakage of previous user's name, DOB, dates                                        | Medium     |
| T14 | Edge function                  | **Re-completion / replay attack** — attacker replays valid messages after onboarding is done, attempting to overwrite profile fields                                      | Authenticated malicious user      | Repeated `POST` to edge function                                   | Profile data corruption                                                                | Low        |
| T15 | `className` / styling          | **Dynamic className from untrusted input** — user-provided name interpolated into `className` or style strings                                                            | Authenticated user                | Profile name displayed in UI                                       | Unexpected styling / layout manipulation                                               | Low        |
| T16 | Network                        | **MITM on edge function calls** — attacker intercepts onboarding traffic on compromised network                                                                           | Network attacker                  | Public WiFi, rogue proxy                                           | Captured PII (name, DOB, dates), token interception                                    | Low        |
| T17 | Date fields                    | **Future/impossible date stored** — edge validation bypass via direct DB write stores future birth date or dating-start before birth                                      | Authenticated malicious user      | Direct PostgREST update                                            | Data integrity violation; downstream age calculations break                            | Low        |

---

## 3 · Security Requirements

### MUST (blockers — Implementer cannot ship without these)

- **MUST-1**: Edge function verifies JWT via `supabase.auth.getUser()` before any database operation. User ID is derived exclusively from the verified JWT — never from the request body.
- **MUST-2**: Edge function enforces `MAX_MESSAGE_LENGTH = 500` on the server side, independent of client-side sanitization.
- **MUST-3**: Edge function uses the service role admin client only for controlled, scoped writes (`profiles` update with exact `eq('id', user.id)`, `messages` insert with verified `user_id`). The admin client is never returned or exposed.
- **MUST-4**: All error responses from the edge function are generic strings (`"Internal server error"`, `"Message too long"`, `"Invalid auth token"`). No stack traces, SQL error details, column names, or user IDs in response bodies.
- **MUST-5**: The `onboarding_completed` re-completion guard short-circuits at the top of the handler. Once `onboarding_completed=true`, no further profile writes occur.
- **MUST-6**: Name validation rejects all input that doesn't match `^[\p{L}\s'\-]+$/u` and enforces 2–50 char length. The validated value is used for profile storage — not the raw input.
- **MUST-7**: Date validation uses the custom parser with overflow guards (`isDateComponents` check). Birth date age must be 16–110. Dating start date must be strictly after birth date and before `now()`. No `eval`-like constructs.
- **MUST-8**: Help focus validation uses strict allowlist comparison (`HELP_OPTIONS` array). Normalized lowercase input must be an exact member.
- **MUST-9**: The Zustand `onboardingStore.reset()` is called on sign-out to wipe all in-memory messages and state.
- **MUST-10**: RLS is enabled on `profiles` and `messages` tables. Users can only `SELECT`/`UPDATE` their own profile and `SELECT`/`INSERT` their own messages.
- **MUST-11**: Client-side `fetchOnboardingHistory` validates the shape of each returned message (type checks on `id`, `role`, `content`, `created_at`) before rendering.
- **MUST-12**: Client-side `useOnboarding` hook validates the edge function response shape at runtime (`typeof reply === 'string'`, `typeof questionIndex === 'number'`, `typeof complete === 'boolean'`) before updating state.

### SHOULD (strongly recommended — document if skipped)

- **SHOULD-1**: Add a database-level `CHECK` constraint on `profiles.help_focus` to enforce the canonical enum values, preventing direct PostgREST writes of invalid values.
- **SHOULD-2**: Add a database-level `CHECK` constraint preventing `onboarding_completed = true` when `name`, `birth_date`, `dating_start_date`, or `help_focus` is `NULL`.
- **SHOULD-3**: Add a `CHECK` constraint on `profiles.birth_date` requiring it to be in the past.
- **SHOULD-4**: Rate-limit the `onboarding-chat` edge function (e.g., max 30 requests/minute per user) to prevent abuse.
- **SHOULD-5**: The `Date.parse` fallback in the edge function date parser should be removed or tightly constrained, as it accepts ambiguous/locale-dependent formats.
- **SHOULD-6**: Log only non-PII operational events in the edge function (e.g., step transitions by anonymized user ID), never message content, names, or dates.

### MUST-NOT (hard prohibitions)

- **MUST-NOT-1**: Never log tokens, user messages, PII (name, birth date, dating date), or full request/response bodies — on client or in edge function.
- **MUST-NOT-2**: Never store the service role key in client code, environment variables with `EXPO_PUBLIC_` prefix, or any client-accessible location.
- **MUST-NOT-3**: Never trust the `userId` from the client. All edge function operations derive `user.id` from the verified JWT.
- **MUST-NOT-4**: Never use `AsyncStorage` or `MMKV` for tokens or session data.
- **MUST-NOT-5**: Never interpolate user-provided values (e.g., `name`) into `className` props. Use data-binding (`{profile.name}` in `Text` children) only.
- **MUST-NOT-6**: Never expose raw SQL errors, Supabase error codes, or table/column names in UI error messages.
- **MUST-NOT-7**: Never allow the client to set `onboarding_completed`, `birth_date`, `dating_start_date`, or `help_focus` via direct PostgREST — these writes must go through the edge function. (Enforced by keeping the profile update policy general but relying on the edge function's service-role client for onboarding fields; see SHOULD-2 for defense-in-depth.)

---

## 4 · Mitigation Mapping

| Threat                                 | Mitigation                                                                                                                      | Layer                    | File/area                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| T1 — Profile over-write via PostgREST  | RLS `update` policy scopes to own profile; SHOULD-1/SHOULD-2 add CHECK constraints for defense-in-depth                         | Database                 | `supabase/schemas/02_profiles.sql`                                                   |
| T2 — Message injection with fake role  | RLS `insert` policy scopes to own `user_id`; assistant messages inserted only by edge function via service role                 | Database + Edge Function | `supabase/schemas/05_messages.sql`, `supabase/functions/onboarding-chat/index.ts`    |
| T3 — Oversized payload DoS             | `MAX_MESSAGE_LENGTH = 500` enforced server-side; client pre-truncates; SHOULD-4 rate limiting                                   | Edge Function + Client   | `onboarding-chat/index.ts`, `src/domain/onboarding/validation.ts`                    |
| T4 — Stored content injection via name | Regex validation `^[\p{L}\s'\-]+$/u` rejects non-letter chars; React Native `Text` children don't parse HTML                    | Edge Function + UI       | `onboarding-chat/index.ts`, `ChatBubble.tsx`                                         |
| T5 — Date parser exploitation          | Custom date parser with `isDateComponents` overflow guard; age bounds 16–110; past-only check                                   | Edge Function            | `onboarding-chat/index.ts` (`parseDate`, `validateBirthDate`, `validateDatingStart`) |
| T6 — Enum bypass for help_focus        | Strict allowlist in edge function; SHOULD-1 adds DB-level CHECK                                                                 | Edge Function + Database | `onboarding-chat/index.ts` (`validateHelpFocus`), `02_profiles.sql`                  |
| T7 — Onboarding bypass                 | Edge function short-circuits on `onboarding_completed=true`; SHOULD-2 CHECK constraint prevents NULL fields with completed=true | Edge Function + Database | `onboarding-chat/index.ts`, `02_profiles.sql`                                        |
| T8 — Missing/forged JWT                | `supabase.auth.getUser()` verification before any DB op; 401 on failure                                                         | Edge Function            | `onboarding-chat/index.ts` (line ~305–330)                                           |
| T9 — Information leakage in errors     | Generic error strings only; catch-all returns `"Internal server error"`; `apiClient.ts` maps error codes to user-safe messages  | Edge Function + Client   | `onboarding-chat/index.ts`, `src/data/apiClient.ts`                                  |
| T10 — Service role key leakage         | Key only in Deno env vars; never in `EXPO_PUBLIC_*`; never logged                                                               | Edge Function deployment | `.env` / Supabase dashboard secrets                                                  |
| T11 — PII in logs                      | No `console.log` of message content, name, or dates; generic catch block                                                        | Edge Function + Client   | All files                                                                            |
| T12 — Cross-user messages via RLS      | RLS `select` policy: `auth.uid() = user_id`; tested by verification plan                                                        | Database                 | `supabase/schemas/05_messages.sql`                                                   |
| T13 — Stale state after logout         | `onboardingStore.reset()` called in sign-out flow; verified by auth threat model                                                | Store                    | `src/store/onboardingStore.ts`, `src/hooks/useAuth.ts`                               |
| T14 — Re-completion / replay           | Edge function checks `onboarding_completed` at handler entry; returns completion response without further writes                | Edge Function            | `onboarding-chat/index.ts` (step 4 guard)                                            |
| T15 — className from untrusted input   | Name displayed only as `Text` children, never in `className`; enforced by code review                                           | UI                       | `OnboardingChatScreen.tsx`, `ChatBubble.tsx`                                         |
| T16 — MITM                             | All Supabase traffic over TLS (HTTPS); `supabase-js` enforces HTTPS URLs                                                        | Client + Network         | `src/data/supabase.ts`                                                               |
| T17 — Impossible dates via direct DB   | SHOULD-3 CHECK constraint on `birth_date`; edge function validates before write                                                 | Edge Function + Database | `onboarding-chat/index.ts`, `02_profiles.sql`                                        |

---

## 5 · Secure Implementation Checklist

```
- [ ] JWT verified via `supabase.auth.getUser()` before any DB read/write in edge function
- [ ] User ID derived exclusively from verified JWT — never from request body
- [ ] Service role key only in Deno env vars — never in client code or EXPO_PUBLIC_* vars
- [ ] MAX_MESSAGE_LENGTH (500) enforced server-side, independent of client
- [ ] Name regex: `^[\p{L}\s'\-]+$/u`, length 2–50, uses validated value (not raw input)
- [ ] Date parser uses overflow guard (isDateComponents); no eval-like constructs
- [ ] Birth date: must be in past, age 16–110
- [ ] Dating start date: must be after birth date and before now()
- [ ] Help focus: strict allowlist match against HELP_OPTIONS only
- [ ] Re-completion guard: onboarding_completed=true short-circuits before any write
- [ ] All error responses are generic — no stack traces, SQL errors, column names, or user IDs
- [ ] No console.log with tokens, PII (name, DOB, dates), or full payloads in client or edge function
- [ ] RLS enabled on profiles and messages — users can only access their own rows
- [ ] Client validates edge function response shape at runtime before updating store
- [ ] Client validates history items shape before rendering (fetchOnboardingHistory)
- [ ] onboardingStore.reset() called on sign-out (wipes in-memory messages + state)
- [ ] No className values constructed from untrusted input (user name, message content)
- [ ] Profile fields (name, birth_date, dating_start_date, help_focus) written only via edge function service-role client — not by client PostgREST calls
- [ ] Date.parse fallback reviewed and constrained (SHOULD-5)
```

---

## 6 · Verification Plan

| Check                               | Method                                                                                         | What to look for                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| JWT required                        | Manual test: call edge function without `Authorization` header                                 | Returns 401                                                 |
| JWT verified                        | Manual test: call with expired/invalid token                                                   | Returns 401, no DB side effects                             |
| User ID from JWT only               | Code review of `onboarding-chat/index.ts`                                                      | `user.id` used in all queries; no `req.body.userId`         |
| Message length enforced server-side | Edge function test: send 501-char message                                                      | Returns 400                                                 |
| Name validation                     | Unit test: `validateName("123")`, `validateName("")`, `validateName("A")`                      | All return `{ valid: false }`                               |
| Date overflow guard                 | Unit test: `parseDate("2024-02-30")` → rejects (Feb 30 overflows)                              | Returns `null`                                              |
| Birth date bounds                   | Unit test: `validateBirthDate("2025-01-01")` with age < 16                                     | Returns `{ valid: false }`                                  |
| Dating start > birth                | Unit test: `validateDatingStart("1990-01-01", "2000-01-01")`                                   | Returns `{ valid: false }`                                  |
| Help focus allowlist                | Unit test: `validateHelpFocus("hacking")`                                                      | Returns `{ valid: false }`                                  |
| Re-completion guard                 | Manual test: send message to edge function for completed user                                  | Returns completion response, no profile update              |
| No PII in logs                      | `grep -r 'console\.log\|console\.warn\|console\.error' src/ supabase/functions/` near PII vars | No matches with name, birth_date, message content           |
| Service role key not in client      | `grep -r 'SERVICE_ROLE\|service_role' src/`                                                    | Zero matches                                                |
| RLS on profiles                     | `SELECT * FROM profiles WHERE id != auth.uid()` as authenticated user                          | Returns 0 rows                                              |
| RLS on messages                     | `SELECT * FROM messages WHERE user_id != auth.uid()` as authenticated user                     | Returns 0 rows                                              |
| Generic error messages              | Review all `return json(...)` in edge function                                                 | No SQL errors, no column names, no stack traces             |
| Store reset on logout               | Code review: sign-out handler calls `onboardingStore.getState().reset()`                       | Confirmed in `useAuth.ts`                                   |
| Response shape validation           | Code review of `useOnboarding.ts` sendMessage handler                                          | Runtime type checks before state update                     |
| History shape validation            | Code review of `fetchOnboardingHistory`                                                        | `.filter()` with type guards before returning               |
| No className from user input        | `grep -rn 'className.*name\|className.*content\|className.*message' src/`                      | Zero matches with user-derived values                       |
| SHOULD-1: help_focus CHECK          | `\d profiles` in psql                                                                          | CHECK constraint on `help_focus` column                     |
| SHOULD-2: completion CHECK          | `\d profiles` in psql                                                                          | CHECK constraint preventing completed=true with NULL fields |
