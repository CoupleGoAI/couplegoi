# Feature: Couple Setup — Architecture Plan

> **Status**: Active
> **Spec**: `docs/features/couple-setup/spec.md`
> **Date**: 2026-03-12

---

## 1 · What & why

After successful pairing, the user enters a mandatory chat flow that collects two couple-specific fields (dating start date, help focus). Deterministic state machine — no LLM.

---

## 2 · Files

| File                                       | Layer         | Purpose                                                   |
| ------------------------------------------ | ------------- | --------------------------------------------------------- |
| `src/store/coupleSetupStore.ts`            | Store         | Zustand slice for couple setup state                      |
| `src/hooks/useCoupleSetup.ts`              | Hooks         | Orchestrates the couple setup conversation                |
| `src/data/coupleSetupApi.ts`               | Data          | Edge function calls                                       |
| `src/domain/onboarding/validation.ts`      | Domain        | Client-side sanitization (shared with onboarding-profile) |
| `src/screens/main/CoupleSetupScreen.tsx`   | UI            | Chat screen (dating start date + help focus)              |
| `src/components/chat/HelpTypeChips.tsx`    | UI            | Reused chip selector for help focus                       |
| `src/components/chat/ChatBubble.tsx`       | UI            | Reused chat bubble                                        |
| `src/components/chat/TypingIndicator.tsx`  | UI            | Reused typing indicator                                   |
| `src/navigation/RootNavigator.tsx`         | Navigation    | Routes to CoupleSetup when paired + not set up            |
| `src/navigation/types.ts`                  | Navigation    | `CoupleSetup` route defined                               |
| `supabase/functions/couple-setup/index.ts` | Edge Function | State machine (2 questions)                               |

---

## 3 · Types

### Edge function request / response

```ts
interface CoupleSetupRequest {
  message?: string;
}

interface CoupleSetupResponse {
  reply: string;
  questionIndex: number; // 0..1
  isComplete: boolean;
}
```

### Zustand slice

```ts
interface CoupleSetupState {
  messages: CoupleSetupMessage[];
  isComplete: boolean;
  currentQuestion: number; // 0=dating_start_date, 1=help_focus
  isLoading: boolean;
  error: string | null;
}
```

---

## 4 · Navigation

```
RootNavigator
  ├─ coupleId !== null && !coupleSetupCompleted → CoupleSetup
  └─ otherwise → Home
```

`coupleSetupCompleted` is derived from `dating_start_date IS NOT NULL AND help_focus IS NOT NULL` in `fetchProfile`.

---

## 5 · Security notes

Same threat model as onboarding-profile. All MUSTs apply:

- JWT verified via Auth REST API
- Step derived from profile field nulls
- All validation server-side
- user_id from auth response only
- No PII logged
