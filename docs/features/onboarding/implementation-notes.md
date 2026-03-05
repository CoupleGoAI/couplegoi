# Implementation Notes: Onboarding Chat

## Summary

Deterministic, conversational onboarding that collects four profile fields (name, birth date, dating start date, help focus) via a chat UI after first login. The `onboarding-chat` Supabase Edge Function is a state machine with predefined prompts, strict validation, message persistence, and resumability. The client is a thin chat shell. All code was already implemented; this change corrects the `TOTAL_ONBOARDING_QUESTIONS` constant from `5` → `4` to match the spec and edge function.

## Files changed

### Modified

- `src/hooks/useOnboarding.ts` — `TOTAL_ONBOARDING_QUESTIONS: 5 → 4` (spec defines 4 questions; edge function uses `TOTAL_QUESTIONS = 4`)
- `src/store/onboardingStore.ts` — Updated comment from "Total: 5" to "Total: 4"

### Already implemented (no changes needed)

- `supabase/functions/onboarding-chat/index.ts` — Deterministic state machine edge function (4 steps: name, birth date, dating start, help focus)
- `supabase/schemas/02_profiles.sql` — Full profiles DDL with `birth_date`, `dating_start_date`, `help_focus` columns + RLS
- `supabase/migrations/20260305000000_add_onboarding_profile_fields.sql` — Idempotent ALTER for existing DBs
- `src/screens/main/OnboardingChatScreen.tsx` — Chat UI with progress dots, input bar, loading/completion/error states
- `src/components/chat/ChatBubble.tsx` — Shared presentational bubble (user gradient, assistant muted)
- `src/components/chat/TypingIndicator.tsx` — Reanimated bouncing dots
- `src/data/onboardingApi.ts` — `getOnboardingStatus()`, `sendOnboardingMessage()`, `fetchOnboardingHistory()`
- `src/data/apiClient.ts` — `invokeEdgeFunction<T>()` wrapper
- `src/domain/onboarding/validation.ts` — Client sanitize (trim + 500-char cap)
- `src/domain/onboarding/__tests__/validation.test.ts` — 15 passing tests
- `src/navigation/RootNavigator.tsx` — 3-way gate: auth → onboarding → main
- `src/store/authStore.ts` — Auth store with `onboardingCompleted` field
- `src/hooks/useAuth.ts` — Calls `resetOnboarding()` on sign-out
- `src/types/index.ts` — `AuthUser` with `onboardingCompleted`

## Security requirements satisfied

- [x] MUST-1: JWT verified via `supabase.auth.getUser()` before any DB op in edge function
- [x] MUST-2: `MAX_MESSAGE_LENGTH = 500` enforced server-side, independent of client
- [x] MUST-3: Admin client used only for scoped writes (`eq('id', user.id)`)
- [x] MUST-4: All error responses are generic strings — no internals exposed
- [x] MUST-5: Re-completion guard short-circuits at top of handler
- [x] MUST-6: Name regex `^[\p{L}\s'\-]+$/u`, 2–50 chars, validated value stored
- [x] MUST-7: Date parser with `isDateComponents` overflow guard; age 16–110; dating start > birth + < now
- [x] MUST-8: Help focus strict allowlist (`HELP_OPTIONS` array)
- [x] MUST-9: `onboardingStore.reset()` called on sign-out in `useAuth.ts`
- [x] MUST-10: RLS enabled on `profiles` and `messages` tables
- [x] MUST-11: `fetchOnboardingHistory` validates shape with `.filter()` type guards
- [x] MUST-12: `useOnboarding` sendMessage validates response shape at runtime

### SHOULD items — status

- SHOULD-1 (help_focus CHECK constraint): Not implemented — defense-in-depth, edge function validates strictly
- SHOULD-2 (completed=true CHECK with NULLs): Not implemented — edge function enforces sequencing
- SHOULD-3 (birth_date past CHECK): Not implemented — edge function validates
- SHOULD-4 (rate limiting): Not implemented — deferred to infrastructure layer
- SHOULD-5 (Date.parse fallback): Present in edge function as last-resort; custom parser handles all expected formats first
- SHOULD-6 (non-PII logging): Edge function has no console.log statements — compliant

## How to test

1. Register a new account → app navigates to OnboardingChatScreen automatically
2. Verify greeting message appears ("Hey there! 💕 Welcome to CoupleGoAI…")
3. Progress shows "0 of 4" with 4 empty dots
4. Type a valid name (e.g., "Seva") → dot fills, progress updates to "1 of 4"
5. Type an invalid name (e.g., "123") → re-ask appears, progress stays at "0 of 4"
6. Answer birth date (e.g., "March 12, 1997") → progress to "2 of 4"
7. Answer dating start date (e.g., "June 15, 2023") → progress to "3 of 4"
8. Answer help focus (e.g., "communication") → completion screen with "You're all set!"
9. Tap "Let's Go!" → navigates to Main (PlaceholderScreen)
10. Kill app mid-onboarding → reopen → conversation resumes at correct step

## Tests added

- No new tests required — existing `src/domain/onboarding/__tests__/validation.test.ts` (15 tests) covers client-side domain logic

## Known limitations / follow-ups

- SHOULD-1/2/3 database CHECK constraints deferred — edge function is authoritative
- `Date.parse` fallback in edge function (SHOULD-5) accepts ambiguous formats; acceptable risk since custom parser handles all expected inputs first
- Rate limiting (SHOULD-4) deferred to infrastructure/Supabase project settings
