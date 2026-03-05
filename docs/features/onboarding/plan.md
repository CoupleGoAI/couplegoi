# Feature: Onboarding Chat — Architecture Plan

> **Status**: Final  
> **Spec**: `docs/features/onboarding/spec.md`  
> **Author**: Architect Agent  
> **Date**: 2026-03-05

---

## 1 · Overview

Deterministic, conversational onboarding that collects four profile fields (name, birth date, dating start date, help focus) via a chat UI after first login. No LLM — the `onboarding-chat` Supabase Edge Function is a state machine that sends predefined prompts, validates replies, persists messages + structured fields, and marks `profiles.onboarding_completed = true` on completion. The client is a thin chat shell.

**Layers touched:** Data (edge function + direct DB), Hooks, Store, Domain, UI (screen + chat components), Navigation, Types, Database (schema migration).

---

## 2 · Layer boundaries

| Layer      | Path pattern                                  | Responsibility                                                                 |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| UI         | `src/screens/main/OnboardingChatScreen.tsx`   | Render chat UI, progress dots, input bar, completion screen                    |
| UI         | `src/components/chat/ChatBubble.tsx`          | Shared presentational bubble (reused by AI chat)                               |
| UI         | `src/components/chat/TypingIndicator.tsx`     | Loading animation while waiting for server reply                               |
| Hooks      | `src/hooks/useOnboarding.ts`                  | Orchestrate init, message send, history restore, completion navigation         |
| Store      | `src/store/onboardingStore.ts`                | Thin Zustand slice: messages, currentQuestion, isComplete, loading, error      |
| Domain     | `src/domain/onboarding/validation.ts`         | Client-side sanitize (trim + 500-char cap) — server owns real validation       |
| Data       | `src/data/onboardingApi.ts`                   | `getOnboardingStatus()`, `sendOnboardingMessage()`, `fetchOnboardingHistory()` |
| Data       | `src/data/apiClient.ts`                       | `invokeEdgeFunction<T>()` wrapper (existing)                                   |
| Types      | `src/types/index.ts`                          | `AuthUser` (existing — includes `onboardingCompleted`)                         |
| Navigation | `src/navigation/RootNavigator.tsx`            | 3-way gate: auth → onboarding → main (existing)                                |
| Backend    | `supabase/functions/onboarding-chat/index.ts` | Deterministic state machine edge function                                      |
| Database   | `supabase/schemas/02_profiles.sql`            | Profiles table with `birth_date`, `dating_start_date`, `help_focus`            |
| Database   | `supabase/migrations/20260305000000_*.sql`    | Add missing columns to existing deployments                                    |

---

## 3 · File plan (exact paths)

### Already implemented

```
EXISTING (no changes needed):
  src/screens/main/OnboardingChatScreen.tsx
  src/components/chat/ChatBubble.tsx
  src/components/chat/TypingIndicator.tsx
  src/store/onboardingStore.ts
  src/data/onboardingApi.ts
  src/data/apiClient.ts
  src/domain/onboarding/validation.ts
  src/domain/onboarding/__tests__/validation.test.ts
  src/navigation/RootNavigator.tsx
  src/navigation/types.ts
  src/store/authStore.ts
  src/types/index.ts
```

### Implemented (edge function + schema)

```
NEW:
  supabase/schemas/02_profiles.sql                              — full profiles table DDL with onboarding columns
  supabase/migrations/20260305000000_add_onboarding_profile_fields.sql — idempotent ALTER for existing DBs

MODIFIED:
  supabase/functions/onboarding-chat/index.ts                   — replaced placeholder with deterministic state machine
```

### Required client-side fix

```
MODIFIED:
  src/hooks/useOnboarding.ts  — TOTAL_ONBOARDING_QUESTIONS: 5 → 4 (spec says 4 questions)
```

**Assumption**: The old constant `5` was from a previous spec revision that had 5 questions. The spec is authoritative: 4 questions.

---

## 4 · Type definitions

### Edge function contract (already consumed by client)

```ts
// Request body (sent to onboarding-chat)
interface OnboardingChatRequest {
  message?: string; // omitted/empty → start or resume
}

// Response body
interface OnboardingMessageResponse {
  reply: string; // assistant text to display
  questionIndex: number; // 0–4 (4 = complete)
  isComplete: boolean; // true only when all 4 answered
}
```

Already defined in `src/data/onboardingApi.ts` — no change.

### Profile columns (database)

```sql
name                text      -- step 0
birth_date          date      -- step 1 (YYYY-MM-DD)
dating_start_date   date      -- step 2 (YYYY-MM-DD)
help_focus          text      -- step 3 (canonical enum string)
onboarding_completed boolean  -- set true at step 4
```

### Client store shape (existing, no change)

```ts
interface OnboardingState {
  messages: OnboardingMessage[];
  isComplete: boolean;
  currentQuestion: number; // 0-based
  isLoading: boolean;
  error: string | null;
}

interface OnboardingMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number; // unix ms
}
```

### Help focus enum (backend-validated)

```ts
type HelpFocus =
  | "communication"
  | "conflict"
  | "trust"
  | "emotional_connection"
  | "intimacy"
  | "other";
```

---

## 5 · Data flow

### Happy path (first-time user, all 4 answers valid)

```
1. User logs in → RootNavigator sees onboardingCompleted=false → shows OnboardingChatScreen
2. useOnboarding mounts:
   a. getOnboardingStatus() → { completed: false, currentQuestion: 0 }
   b. isInitializing → false
3. Screen effect fires sendMessage('') → triggers initial greeting
4. Hook calls sendOnboardingMessage('') → invokeEdgeFunction('onboarding-chat', { message: '' })
5. Edge function:
   a. Auth: verify JWT → get user.id
   b. Load profile → deriveStep() = 0 (name is null)
   c. Empty message → return greeting prompt, persist as assistant message
   d. Response: { reply: "Hey there! 💕 ...", questionIndex: 0, isComplete: false }
6. Hook adds assistant bubble to store, updates currentQuestion=0
7. User types "Seva" → handleSend → sendMessage("Seva")
8. Hook calls sendOnboardingMessage("Seva")
9. Edge function:
   a. Store user message in messages table
   b. validateName("Seva") → { valid: true, value: "Seva" }
   c. Update profiles.name = "Seva"
   d. Next step = 1 → generate birth date prompt
   e. Store assistant message
   f. Response: { reply: "Love that, Seva! ✨ ...", questionIndex: 1, isComplete: false }
10. Repeat for steps 1→2→3
11. At step 3 (help focus), valid answer triggers:
    a. Update profiles.help_focus + profiles.onboarding_completed = true
    b. Response: { reply: "You're all set, Seva! 🎉 ...", questionIndex: 4, isComplete: true }
12. Hook sets isComplete=true, calls authData.fetchProfile(userId)
13. fetchProfile returns updated AuthUser with onboardingCompleted=true
14. authStore.setUser(updatedUser) → RootNavigator reacts → navigates to Main
```

### Invalid answer path

```
7b. User types "123" for name
8b. Edge function: validateName("123") → { valid: false }
    → store user message, store re-ask message
    → Response: { reply: "Just your first name...", questionIndex: 0, isComplete: false }
9b. Hook adds re-ask bubble, questionIndex stays 0
10b. User retries with valid name
```

### Resume path (app killed mid-onboarding)

```
1. User opens app → session restored → onboardingCompleted=false
2. useOnboarding mounts:
   a. getOnboardingStatus() → { completed: false, currentQuestion: 2 }
   b. serverQuestion > 0 → fetchOnboardingHistory(userId)
   c. History loaded → setMessages([...restored messages])
   d. isInitializing → false
3. Screen effect: messages.length > 0, so hasTriggeredFirst stays false
   → BUT isEmpty check means greeting won't re-fire
   → User sees restored conversation at correct step
4. Edge function derives step from profile columns (not message count):
   name="Seva", birth_date="1997-03-12", dating_start_date=null → step=2
```

---

## 6 · State management

### `useOnboardingStore` (existing — no changes)

```ts
// Shape
{
  messages: OnboardingMessage[];
  isComplete: boolean;
  currentQuestion: number;
  isLoading: boolean;
  error: string | null;
}

// Actions
addMessage, setMessages, setIsComplete, setCurrentQuestion, setLoading, setError, reset
```

**Selectors used by hook** (each accessed individually per Zustand rules):

- `s.messages`, `s.isComplete`, `s.currentQuestion`, `s.isLoading`, `s.error`
- All action selectors: `s.addMessage`, `s.setMessages`, etc.

**Resets on logout**: `reset()` called via auth logout flow (existing pattern in `useAuth`).

### `useAuthStore` (existing — consumed, not modified)

- `s.user?.onboardingCompleted` drives `RootNavigator` gate.
- `s.setUser` called after onboarding completion to trigger navigation.

---

## 7 · Navigation changes

**No new screens or routes.** Existing `RootNavigator` already implements the 3-way gate:

```tsx
!isAuthenticated       → Auth stack
!onboardingCompleted   → OnboardingChatScreen (gestureEnabled: false)
else                   → Main (PlaceholderScreen)
```

After completion, `authStore.user.onboardingCompleted` flips to `true`, and React Navigation reactively switches to `Main`.

**Deep links**: None for onboarding. The screen is gated by auth state, not by route.

---

## 8 · Error handling

### Typed error paths

| Error source                    | Handling                                                                  |
| ------------------------------- | ------------------------------------------------------------------------- |
| Edge function 401               | `invokeEdgeFunction` returns `{ ok: false, error: "Session expired..." }` |
| Edge function 400               | Message too long — generic "Request failed" from apiClient                |
| Edge function 500               | Generic "Request failed" — hook sets `error` state                        |
| Network failure                 | apiClient catches → `"Network error..."` → hook sets error                |
| Profile fetch fail (completion) | `retryComplete()` shows retry UI on completion screen                     |
| Malformed response              | Runtime shape guard in hook rejects non-conforming response               |

### UI states

| State            | What renders                                            |
| ---------------- | ------------------------------------------------------- |
| Initializing     | Gradient background + spinner + "Getting things ready…" |
| Empty + error    | Empty state card with "Connection issue" + retry button |
| Chat + error     | Error banner below message list                         |
| Loading          | TypingIndicator below messages, input disabled          |
| Complete         | Completion screen with "Let's Go!" button               |
| Complete + error | Completion screen + error banner + retry button         |

---

## 9 · Security considerations

| Concern              | Mitigation                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------- |
| JWT verification     | Edge function verifies via `supabase.auth.getUser()` before any DB ops                      |
| Service role key     | Used only server-side for controlled writes; never exposed to client                        |
| Input length         | Client caps at 500 chars; edge function rejects > 500                                       |
| Name injection       | Regex-validated: letters/spaces/apostrophes/hyphens only                                    |
| Date parsing abuse   | Custom parser with overflow guards; no eval-like constructs                                 |
| Help focus injection | Strict allowlist match; normalized lowercase                                                |
| Message storage      | `conversation_type='onboarding'` prevents cross-contamination with chat                     |
| RLS                  | Users can only read/insert own messages; edge function uses service role for profile writes |
| Error messages       | Generic strings only; no PII, stack traces, or internal IDs                                 |
| Onboarding bypass    | `RootNavigator` gates on `onboardingCompleted`; edge function checks profile server-side    |
| Re-completion attack | Edge function short-circuits if `onboarding_completed=true`                                 |

**Detailed threat model**: Deferred to Security agent (`docs/features/onboarding/threat-model.md`).

---

## 10 · Performance considerations

### Memoization

- `ProgressDots`: `React.memo` (existing) — avoids re-render on message list changes.
- `ChatBubble`: `React.memo` (verify in component) — critical for FlatList item rendering.
- `handleSend`, `renderMessage`, `keyExtractor`: wrapped in `useCallback` (existing).

### List rendering

- `FlatList` with `keyExtractor` (existing).
- `scrollToEnd` debounced with 100ms timeout (existing).
- No `getItemLayout` — bubble heights vary. Acceptable for ≤20 messages.

### Animation

- No custom Reanimated animations in onboarding. `TypingIndicator` uses light CSS-style animation via RN Animated (existing).
- Screen transitions use native-stack `fade` animation (existing).

### Bundle impact

- Edge function: zero client bundle impact (runs server-side).
- Schema migration: zero client impact.
- No new client dependencies.

### Network

- Initialization: 1–2 parallel DB queries (profile + message count).
- Resume: 1 additional query (message history).
- Each send: 1 edge function invocation.
- Completion: 1 additional profile fetch (to refresh auth store).

---

## 11 · Test strategy

### Domain logic (unit tests)

Already exists: `src/domain/onboarding/__tests__/validation.test.ts` — covers `sanitizeMessage`, `isNonEmptyMessage`, `isWithinLengthLimit`, `isValidUserMessage`.

### Edge function (integration tests — manual or Deno test)

| Test case                          | Expected                                                  |
| ---------------------------------- | --------------------------------------------------------- |
| Empty message, fresh user          | Returns greeting prompt, questionIndex=0                  |
| Valid name                         | Persists to profile, returns birth date prompt, qI=1      |
| Invalid name (numbers)             | Returns re-ask, questionIndex stays 0                     |
| Valid birth date (various formats) | Parses correctly, persists YYYY-MM-DD, qI=2               |
| Birth date in future               | Re-ask                                                    |
| Birth date unreasonable age        | Re-ask (age < 16 or > 110)                                |
| Valid dating start                 | After birth, in past → persists, qI=3                     |
| Dating start before birth          | Re-ask                                                    |
| Valid help focus                   | Persists, sets onboarding_completed=true, isComplete=true |
| Invalid help focus                 | Re-ask with options list                                  |
| Already-completed user             | Short-circuits with completion message                    |
| Resume mid-flow (empty message)    | Returns correct current question based on profile         |
| No auth header                     | 401                                                       |
| Message > 500 chars                | 400                                                       |

### Hook (renderHook)

| Test case                           | Expected                                                  |
| ----------------------------------- | --------------------------------------------------------- |
| Mount with fresh user               | isInitializing → true, then false; messages empty         |
| Mount with mid-onboarding           | History restored; currentQuestion matches server          |
| sendMessage valid                   | User bubble added, AI bubble added, questionIndex updated |
| sendMessage invalid                 | User bubble added, re-ask bubble added, index unchanged   |
| Completion triggers profile refresh | isComplete=true, authStore.user updated                   |

### E2E seams

- `sendOnboardingMessage` is the single API call — easily mockable.
- `getOnboardingStatus` + `fetchOnboardingHistory` are direct DB reads — mockable via Supabase test helpers or MSW.

---

## 12 · Client-side fix required

### `TOTAL_ONBOARDING_QUESTIONS` mismatch

The hook currently exports `TOTAL_ONBOARDING_QUESTIONS = 5` but the spec defines **4 questions** and the edge function uses `TOTAL_QUESTIONS = 4`. The progress dots and "X of Y" indicator will be wrong.

**Fix**: Change `TOTAL_ONBOARDING_QUESTIONS` from `5` to `4` in `src/hooks/useOnboarding.ts`.

The onboarding store comment also says "Total: 5" — update to "Total: 4".

---

## 13 · Database changes

### New table DDL: `supabase/schemas/02_profiles.sql`

Adds the full `profiles` table definition with columns needed for onboarding:

| Column              | Type   | Purpose                     |
| ------------------- | ------ | --------------------------- |
| `birth_date`        | `date` | Question 2 — normalized     |
| `dating_start_date` | `date` | Question 3 — normalized     |
| `help_focus`        | `text` | Question 4 — canonical enum |

These columns were referenced in the spec but missing from the schema files. The schema README already listed `profiles` with `age_range` as a placeholder — the new columns replace that concept with the spec's actual fields.

### Migration: `supabase/migrations/20260305000000_add_onboarding_profile_fields.sql`

Idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for each new column. Safe to run against existing databases.

---

## 14 · Assumptions

1. The `profiles` table already exists in deployed databases (created by `handle_new_user()` trigger) but may lack the three new columns. The migration handles this.
2. `age_range` column in the README was a placeholder — not used anywhere in code. The spec uses `birth_date` instead.
3. The client code (screen, hook, store, data layer) is already implemented and working with the documented edge function contract. Only the `TOTAL_ONBOARDING_QUESTIONS` constant needs correction.
4. The `onboarding-chat` edge function uses the **service role key** for writes. `SUPABASE_SERVICE_ROLE_KEY` is available as an env var in all Supabase Edge Function runtimes by default.
5. Date parsing does not use `chrono-node` (spec suggestion) — a lightweight custom parser is used instead to avoid Deno dependency complexity. Supports ISO, US, EU, and natural-language month formats.
