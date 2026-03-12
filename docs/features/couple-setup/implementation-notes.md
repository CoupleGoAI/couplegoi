## Summary

New feature split from the original `onboarding` feature. Collects dating start date + help focus (2 questions) after successful pairing. Triggered when `couple_id` is set but `dating_start_date` and `help_focus` are null.

## Files changed

### New

- `supabase/functions/couple-setup/index.ts` — Edge function: state machine for 2 questions. Same auth pattern as onboarding-profile (JWT via Auth REST API, service role for writes). Validates dating_start_date via chrono-node (past, after birth_date). Validates help_focus against canonical enum. Persists to `profiles` and `messages` with `conversation_type='couple_setup'`.
- `supabase/functions/couple-setup/deno.json` — Deno import map.
- `src/screens/main/CoupleSetupScreen.tsx` — Full-screen chat UI. Question 0 = text input (dating start date). Question 1 = tappable chips (help focus). No back, no skip.
- `src/data/coupleSetupApi.ts` — Plain fetch to `couple-setup` edge function. No logging (MUST-7).
- `src/hooks/useCoupleSetup.ts` — Orchestration hook. Same pattern as `useOnboarding`. On completion, refreshes auth profile to trigger nav transition.
- `src/store/coupleSetupStore.ts` — Zustand slice for couple setup conversation state.
- `src/screens/main/HomeScreen.tsx` — Minimal placeholder screen.

### Modified

- `src/types/index.ts` — Added `coupleSetupCompleted: boolean` to `AuthUser`.
- `src/store/authStore.ts` — Added `pairingSkipped: boolean` and `setPairingSkipped` action.
- `src/data/auth.ts` — `fetchProfile` now reads `dating_start_date` and `help_focus` to derive `coupleSetupCompleted`.
- `src/hooks/useAuth.ts` — Added `resetCoupleSetup` to logout and auth state change handlers.
- `src/navigation/RootNavigator.tsx` — Added `CoupleSetup` and `Home` routes. Added nav logic for `coupleSetupCompleted` and `pairingSkipped`.
- `src/navigation/types.ts` — Added `CoupleSetup` and `Home` routes. Added `CoupleSetupScreenProps`.
- `src/screens/main/GenerateQRScreen.tsx` — Added "Skip for now" button that sets `pairingSkipped`.
- `src/screens/main/ConnectionConfirmedScreen.tsx` — Changed CTA label to "Set up your couple profile 💕".
- `supabase/config.toml` — Added `couple-setup` entry with `verify_jwt = false`.

## Security checklist

- [x] MUST-1 — JWT verified via Auth REST API (Auth REST endpoint, not client.auth.getUser())
- [x] MUST-2 — Step derived from profile field nulls (dating_start_date, help_focus)
- [x] MUST-3 — dating_start_date validated via chrono-node (past, after birth_date); help_focus validated against canonical enum
- [x] MUST-4 — user_id from auth response only
- [x] MUST-5 — Messages + profile update persisted together
- [x] MUST-6 — Client calls sanitizeMessage() before API call
- [x] MUST-7 — No logging of tokens, PII, or response bodies in coupleSetupApi.ts
