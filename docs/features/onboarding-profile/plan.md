# Feature: Onboarding Profile — Architecture Plan

> **Status**: Active
> **Spec**: `docs/features/onboarding-profile/spec.md`
> **Date**: 2026-03-12

---

## 1 · What & why

After first login (`onboarding_completed === false`), the user enters a mandatory chat flow that collects two profile fields (name, birth date) through a conversational UI. The "assistant" is a deterministic state machine in the `onboarding-profile` Edge Function — no LLM.

---

## 2 · Files

| File                                             | Layer         | Purpose                                                 |
| ------------------------------------------------ | ------------- | ------------------------------------------------------- |
| `src/store/onboardingStore.ts`                   | Store         | Zustand slice for onboarding state                      |
| `src/hooks/useOnboarding.ts`                     | Hooks         | Orchestrates the onboarding conversation                |
| `src/data/onboardingApi.ts`                      | Data          | Edge function calls + status check                      |
| `src/domain/onboarding/validation.ts`            | Domain        | Client-side sanitization                                |
| `src/screens/main/OnboardingProfileScreen.tsx`   | UI            | Chat screen (name + birth date only)                    |
| `src/components/chat/ChatBubble.tsx`             | UI            | Reused chat bubble                                      |
| `src/components/chat/TypingIndicator.tsx`        | UI            | Reused typing indicator                                 |
| `src/navigation/RootNavigator.tsx`               | Navigation    | Routes to OnboardingProfile when `!onboardingCompleted` |
| `src/navigation/types.ts`                        | Navigation    | `OnboardingProfile` route defined                       |
| `supabase/functions/onboarding-profile/index.ts` | Edge Function | State machine (2 questions)                             |

---

## 3 · Types

### Edge function request / response

```ts
interface OnboardingChatRequest {
  message?: string;
}

interface OnboardingResponse {
  reply: string;
  questionIndex: number; // 0..1
  isComplete: boolean;
}
```

---

## 4 · State

### Zustand slice: `useOnboardingStore`

```ts
interface OnboardingState {
  messages: OnboardingMessage[];
  isComplete: boolean;
  currentQuestion: number; // 0..1
  isLoading: boolean;
  error: string | null;
}
```

---

## 5 · Navigation

```
RootNavigator
  ├─ !isAuthenticated → Auth (Login/Register)
  ├─ !onboardingCompleted → OnboardingProfile (OnboardingProfileScreen)
  └─ onboardingCompleted → Pairing / CoupleSetup / Home
```

On completion: edge function sets `onboarding_completed = true` → client calls `fetchProfile()` → `setUser()` with `onboardingCompleted: true` → RootNavigator transitions to pairing.

---

## 6 · Security notes

See `threat-model.md`. Key points:

- Edge function verifies JWT via Auth REST API
- All validation server-side (name format, date parsing via chrono-node)
- user_id from auth response only
- No PII logged
