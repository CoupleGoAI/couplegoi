# Feature: Onboarding Chat — Architecture Plan

> **Status**: Draft
> **Spec**: `docs/features/onboarding/spec.md`
> **Date**: 2026-03-09

---

## 1 · What & why

After first login (`onboarding_completed === false`), the user enters a mandatory chat flow that collects four profile fields (name, birth date, dating start date, help focus) through a conversational UI. The "assistant" is a deterministic state machine in the `onboarding-chat` Edge Function — no LLM. The backend owns all validation, normalization, and prompt generation; the client is a thin chat shell with a typing indicator and tappable chips for the help-type question.

---

## 2 · Files

### Already implemented

| File | Layer | Status |
|---|---|---|
| `src/store/onboardingStore.ts` | Store | ✅ Complete |
| `src/hooks/useOnboarding.ts` | Hooks | ⚠️ References `getOnboardingStatus` and `fetchOnboardingHistory` — not yet exported from data layer |
| `src/data/onboardingApi.ts` | Data | ⚠️ Only `sendOnboardingMessage` exists |
| `src/domain/onboarding/validation.ts` | Domain | ✅ Complete |
| `src/domain/onboarding/__tests__/validation.test.ts` | Tests | ✅ Complete |
| `src/screens/main/OnboardingChatScreen.tsx` | UI | ⚠️ Missing help-type chips + client-side typing delay |
| `src/components/chat/ChatBubble.tsx` | UI | ✅ Complete |
| `src/components/chat/TypingIndicator.tsx` | UI | ✅ Complete |
| `src/navigation/RootNavigator.tsx` | Navigation | ✅ Routes to Onboarding when `!onboardingCompleted` |
| `src/navigation/types.ts` | Navigation | ✅ `Onboarding` route defined |
| `supabase/functions/onboarding-chat/index.ts` | Edge Function | ⚠️ Minimal stub — no conversation logic |

### New files

```
NEW:
  src/components/chat/HelpTypeChips.tsx       # Tappable chip row for help-type question
```

### Modified files

```
MODIFIED:
  src/data/onboardingApi.ts                   # Add getOnboardingStatus(), fetchOnboardingHistory()
  src/screens/main/OnboardingChatScreen.tsx    # Render HelpTypeChips when currentQuestion === 3; add typing delay
  src/hooks/useOnboarding.ts                  # Minor: add sendChip helper that passes chip value as message
  supabase/functions/onboarding-chat/index.ts # Full state-machine implementation
```

---

## 3 · Types

### Edge function request / response (already defined client-side)

```ts
// Request body (POST)
interface OnboardingChatRequest {
  message?: string; // omit or empty → return current question (start/resume)
}

// Response body
interface OnboardingResponse {
  reply: string;          // assistant message to display
  questionIndex: number;  // 0..3 — current step after processing
  isComplete: boolean;    // true when all 4 questions answered
}
```

### Onboarding status (new — for getOnboardingStatus)

```ts
interface OnboardingStatus {
  completed: boolean;
  currentQuestion: number; // derived from which profile fields are null
}
```

### Message history row (for fetchOnboardingHistory)

```ts
interface OnboardingHistoryRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string; // ISO timestamp
}
```

### HelpTypeChips props

```ts
interface HelpTypeChipsProps {
  onSelect: (value: string) => void;
  disabled: boolean;
}
```

### Help type canonical values

```ts
type HelpFocus =
  | 'communication'
  | 'conflict'
  | 'trust'
  | 'emotional_connection'
  | 'intimacy'
  | 'other';
```

---

## 4 · Data flow

### Happy path (question 1–3: text input)

```
User types answer
  → OnboardingChatScreen.handleSend()
  → useOnboarding.sendMessage(text)
    → sanitizeMessage(text)                        [domain/validation]
    → addMessage(userMsg) to onboardingStore        [optimistic user bubble]
    → sendOnboardingMessage(sanitized)              [data/onboardingApi — plain fetch]
      → POST /functions/v1/onboarding-chat { message }
      → Edge function:
          1. Auth: verify JWT via Auth REST API (/auth/v1/user)
          2. Derive current step from profile fields (null = not answered)
          3. Validate user reply against current step rules
          4. If invalid → return re-ask variant, same questionIndex
          5. If valid → persist user message to messages table
                      → update profile field (name/birth_date/etc.)
                      → persist assistant reply to messages table
                      → return { reply, questionIndex: next, isComplete }
    → addMessage(aiMsg) to store
    → setCurrentQuestion(questionIndex)
    → if isComplete → fetchProfile(userId) → setUser → RootNavigator transitions to Main
```

### Happy path (question 4: help type chips)

```
User taps chip (e.g. "Communication")
  → HelpTypeChips.onSelect('communication')
  → useOnboarding.sendMessage('communication')
  → same flow as above, but edge function validates against canonical set
```

### Start / resume flow

```
useOnboarding mount → useEffect
  → getOnboardingStatus()                           [data/onboardingApi]
    → supabase.from('profiles').select('onboarding_completed, name, birth_date, dating_start_date, help_focus')
    → derive currentQuestion from null fields (0=name, 1=birth_date, 2=dating_start, 3=help_focus)
  → if currentQuestion > 0 → fetchOnboardingHistory(userId)
    → supabase.from('messages').select('*').eq('user_id', userId).eq('conversation_type', 'onboarding').order('created_at')
    → setMessages(mapped history)
  → setIsInitializing(false)
  → screen triggers sendMessage('') → edge function returns current question prompt
```

### Error paths

- **Network error**: `sendOnboardingMessage` returns `{ ok: false, error: 'Network error' }` → `setError()` → error banner shown → user retries
- **Invalid answer**: edge function returns re-ask reply with same `questionIndex` — no error state, just a new assistant message
- **Session expired**: `getSession()` fails → `{ ok: false, error: 'Not signed in' }` → error state
- **Profile refresh failure after completion**: `retryComplete()` retries `fetchProfile` → user taps "Let's Go!" again

---

## 5 · State

### Zustand slice: `useOnboardingStore` (already implemented)

```ts
interface OnboardingState {
  messages: OnboardingMessage[];    // conversation history (display only)
  isComplete: boolean;              // true after all 4 questions answered
  currentQuestion: number;          // 0..3
  isLoading: boolean;               // request in flight
  error: string | null;             // user-facing error
}
```

**Reset on logout**: `useAuth.signOut()` calls `resetOnboarding()` — clears all onboarding state.

### Derived state (computed in hook/screen, not stored)

- `showChips`: `currentQuestion === 3 && !isComplete`
- `showInput`: `currentQuestion < 3 && !isComplete`
- `progressLabel`: `"${currentQuestion} of ${totalQuestions}"`

---

## 6 · Navigation

No new routes needed. Existing flow:

```
RootNavigator
  ├─ !isAuthenticated → Auth (Login/Register)
  ├─ !onboardingCompleted → Onboarding (OnboardingChatScreen)
  └─ onboardingCompleted → Main
```

On completion: edge function sets `onboarding_completed = true` → client calls `fetchProfile()` → `setUser()` with `onboardingCompleted: true` → `RootNavigator` reactively transitions to `Main`.

---

## 7 · Security notes

See `threat-model.md` for full analysis. Key points:

- Edge function verifies JWT via Auth REST API (`/auth/v1/user`), never `client.auth.getUser()`
- Edge function uses user-scoped client (anon key + forwarded JWT) for RLS-protected DB ops
- All validation/normalization happens server-side (name format, date parsing, help-type enum)
- Client never parses dates — `chrono-node` on server only
- Client sends user input through `sanitizeMessage()` (trim + 500-char limit) before API call
- No PII/tokens logged; error messages are generic
- `console.log` in `onboardingApi.ts` should be removed before production (currently logs response JSON)
