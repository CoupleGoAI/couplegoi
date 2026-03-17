## Summary

Split from the original `onboarding` feature. Now collects only name + birth date (2 questions). The `onboarding-chat` edge function was renamed to `onboarding-profile` and stripped of dating_start_date and help_focus logic.

## Files changed

### New

- `src/screens/main/OnboardingProfileScreen.tsx` — Replaces `OnboardingChatScreen`. Chat UI for 2 questions (name + birth date). No help-type chips.

### Modified

- `supabase/functions/onboarding-profile/index.ts` — Renamed from `onboarding-chat`. Stripped dating_start_date, help_focus, and all question 3–4 logic. Sets `onboarding_completed = true` after birth_date.
- `src/data/onboardingApi.ts` — Updated endpoint URL from `onboarding-chat` to `onboarding-profile`. Removed console.log statements (MUST-7).
- `src/hooks/useOnboarding.ts` — Changed `TOTAL_ONBOARDING_QUESTIONS` from 4 to 2. Updated completed question index from 4 to 2.
- `src/navigation/RootNavigator.tsx` — Changed from `OnboardingChatScreen` to `OnboardingProfileScreen`. Route renamed from `Onboarding` to `OnboardingProfile`.
- `src/navigation/types.ts` — Renamed `Onboarding` route to `OnboardingProfile`. Updated screen props type.
- `src/components/chat/ChatBubble.tsx` — Generalized `message` prop type from `OnboardingMessage` to inline `ChatMessage` interface (same shape, no store dependency).
- `supabase/config.toml` — Replaced `onboarding-chat` entry with `onboarding-profile`.

### Deleted

- `src/screens/main/OnboardingChatScreen.tsx` — Replaced by `OnboardingProfileScreen.tsx`.
- `supabase/functions/onboarding-chat/` — Renamed to `supabase/functions/onboarding-profile/`.
- `docs/features/onboarding/` — Split into `docs/features/onboarding-profile/` and `docs/features/couple-setup/`.

## Security checklist

- [x] MUST-1 — JWT verified via Auth REST API
- [x] MUST-2 — Step derived from profile field nulls
- [x] MUST-3 — Name and birth_date validated server-side
- [x] MUST-4 — user_id from auth response only
- [x] MUST-5 — Messages + profile update persisted together
- [x] MUST-6 — Client calls sanitizeMessage() before API call
- [x] MUST-7 — Console.log statements removed from onboardingApi.ts

## Deferred observations

- `docs/edge-functions/onboarding-chat.md` still references the old function name — should be renamed to `onboarding-profile.md`.
- `fetchOnboardingHistory` in `onboardingApi.ts` is unused by any consumer. Could be deleted.
- `PlaceholderScreen.tsx` is no longer referenced from the navigator (replaced by `HomeScreen`). Could be deleted.

## Modification — Completion CTA starts pairing

### What changed

The onboarding completion screen now owns the transition into pairing instead of relying on an immediate auth-profile refresh when the second answer is submitted. Tapping `Let's Go!` marks onboarding complete in local auth state, seeds the pairing flow to open on `ScanQR`, and lets RootNavigator move into pairing reliably even if profile hydration is slow.

### Files changed

#### Modified

- `docs/features/onboarding-profile/spec.md` — clarified that the completion CTA starts the QR scan flow
- `docs/features/onboarding-profile/plan.md` — updated the navigation handoff from onboarding into pairing
- `src/hooks/useOnboarding.ts` — removed auto-transition on message completion and added CTA-driven pairing start logic
- `src/screens/main/OnboardingProfileScreen.tsx` — wired `Let's Go!` to the new pairing-start action

### Security re-check

No security-critical paths modified.

## Modification — Extract heart send control to shared UI component

### What changed

The chat send heart control previously implemented inline in onboarding profile chat was extracted into a reusable `HeartActionButton` UI component so it can be reused consistently by other chat-like inputs (including pairing manual code entry) without duplicating gradient/icon button logic.

### Files changed

#### Modified

- `src/screens/main/OnboardingProfileScreen.tsx` — now uses `HeartActionButton` instead of inline heart-button view styles/markup.

#### New

- `src/components/ui/HeartActionButton.tsx` — reusable heart action button with disabled styling and size variants.

### Security re-check

No security-critical paths modified.
