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
