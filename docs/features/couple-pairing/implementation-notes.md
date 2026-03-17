## Summary

Implemented the couple-pairing QR code feature end-to-end: three edge functions (generate, connect, disconnect), client data layer, domain validation, Zustand store, orchestration hook, three new screens, and updated navigation/auth flows.

## Files changed

### New

- `src/domain/pairing/validation.ts` — Client-side QR payload format validation (non-empty, ≤100 chars, printable ASCII). No server communication; server is authoritative for security checks.
- `src/domain/pairing/__tests__/validation.test.ts` — 11 unit tests covering valid/invalid/edge cases
- `src/store/pairingStore.ts` — Ephemeral Zustand slice: token, expiresAt, isPending, error with reset()
- `src/data/pairingApi.ts` — Plain-fetch calls to pairing-generate / pairing-connect / pairing-disconnect edge functions + couple status DB query. HTTP status codes mapped to user-facing strings; no tokens or payloads logged.
- `src/hooks/usePairing.ts` — Orchestrates generate / connect / disconnect flows. Client-side validation before connect. Updates authStore on disconnect.
- `src/screens/main/GenerateQRScreen.tsx` — QR code display with countdown timer and regenerate button. Token-only QR value (no PII).
- `src/screens/main/ScanQRScreen.tsx` — Camera-based QR scanner. Permission requested on this screen only (not at app launch). Haptic feedback on success/failure.
- `src/screens/main/ConnectionConfirmedScreen.tsx` — Success state with partner name. "Enter the app" tap sets coupleId in authStore, triggering nav switch to Main.
- `supabase/functions/pairing-generate/index.ts` — Full implementation: Auth REST API verify, check not already paired, invalidate existing tokens, insert crypto.randomUUID() token with 5-min TTL.
- `supabase/functions/pairing-connect/index.ts` — Full implementation: Auth REST API verify, validate token (exists/not-expired/not-used), reject self-pairing, verify both unpaired, ordered writes (couple insert → profile updates → token mark used) with best-effort cleanup on failure.
- `supabase/functions/pairing-disconnect/index.ts` — Full implementation: Auth REST API verify, ownership check (partner1 or partner2), idempotent deactivation + profile couple_id clear.

### Modified

- `src/navigation/types.ts` — Added GenerateQR, ScanQR, ConnectionConfirmed routes to RootStackParamList + screen prop types
- `src/navigation/RootNavigator.tsx` — Added pairing flow: when onboardingCompleted && !coupleId, shows GenerateQR/ScanQR/ConnectionConfirmed group
- `src/screens/main/PlaceholderScreen.tsx` — Added "Disconnect from partner" button with confirmation Alert (visible only when coupled); loading states on both buttons
- `src/hooks/useAuth.ts` — Reset pairingStore on signOut and on SIGNED_OUT auth state change

## Security checklist

- [x] MUST-1 — All three edge functions verify JWT via `fetch(${SUPABASE_URL}/auth/v1/user)`, never `client.auth.getUser()`
- [x] MUST-2 — user_id derived from Auth REST API response only; no client-supplied IDs trusted
- [x] MUST-3 — `crypto.randomUUID()` for token generation; `expires_at = now + 5min` server-enforced
- [x] MUST-4 — pairing-connect checks: token exists, not expired, not used, scanner ≠ creator, both users' couple_id IS NULL
- [x] MUST-5 — Ordered writes: insert couple → update both profiles → mark token used; best-effort cleanup (couple deactivation) if profile update fails
- [x] MUST-6 — pairing-disconnect verifies user is partner1_id or partner2_id before acting; idempotent on already-disconnected couple
- [x] MUST-7 — QR `value` prop is the token string only; no user IDs, names, or other PII
- [x] MUST-8 — RLS on profiles already enforced (schema 02_profiles.sql/03_couples.sql); edge functions use service_role for mutations
- [x] MUST-NOT-1 — No `client.auth.getUser()` in any edge function
- [x] MUST-NOT-2 — No client-supplied user_id, couple_id, or partner_id trusted in any edge function
- [x] MUST-NOT-3 — Service role client created only after Auth REST API verification
- [x] MUST-NOT-4 — No `console.log` with tokens, pairing payloads, or response bodies in pairingApi.ts or usePairing.ts
- [x] MUST-NOT-5 — HTTP error statuses mapped to generic user strings in `mapHttpError()`; raw server messages never shown
- [x] MUST-NOT-6 — token = `crypto.randomUUID()` (RFC 4122 v4, cryptographically random)
- [x] MUST-NOT-7 — Camera permission requested via `useCameraPermissions()` on ScanQRScreen mount, not at app launch

## How to test

1. **Register two separate accounts** (User A and User B)
2. Complete onboarding for both
3. **User A**: tap "Generate QR" → QR code with 5-minute countdown appears
4. **User B**: tap "Scan partner's QR" → allow camera → scan User A's QR
5. Haptic success feedback fires; ConnectionConfirmed screen shows User A's name
6. Tap "Enter the app 🎉" → both users land on Main screen
7. On PlaceholderScreen, "Disconnect from partner" button is visible
8. Tap it → confirmation dialog → disconnect → both users return to pairing screen
9. **Error cases**:
   - Scan an expired QR → "This code has expired. Ask your partner to generate a new one."
   - Both users already paired → "You or your partner are already connected to someone."
   - Scan own QR → "You can't pair with yourself!"
   - Scan arbitrary text → "That doesn't look like a valid CoupleGoAI code."
   - Deny camera → permission denied screen with "Go back" option

## Modification — Scan-first handoff from onboarding

### What changed

The pairing flow now accepts a scan-first entry seeded by onboarding completion. Root navigation reads an ephemeral `entryScreen` from `pairingStore`, starts on `ScanQR` when onboarding requests it, clears that preference once scanning begins, and still keeps `coupleId` unset until the pairing success path confirms the connection.

### Files changed

#### Modified

- `docs/features/couple-pairing/spec.md` — documented the scan-first onboarding handoff and couple-setup gating
- `docs/features/couple-pairing/plan.md` — added pairing entry-screen state and onboarding handoff flow
- `src/store/pairingStore.ts` — added ephemeral `entryScreen` state for scan-first pairing entry
- `src/hooks/usePairing.ts` — clears transient pairing state after a successful connect and exposes entry-screen clearing
- `src/navigation/RootNavigator.tsx` — starts the pairing stack on `ScanQR` when onboarding seeds that entry
- `src/screens/main/ScanQRScreen.tsx` — clears the one-shot scan-first preference and replaces to `GenerateQR` when scan is the initial route

### Security re-check

No security-critical paths modified.

## Modification — Pairing fallback code + unused token cleanup

### What changed

Added a deterministic 6-character uppercase fallback code under the QR on Generate QR, derived from the active token so it always rotates together with QR regeneration, and tightened pairing token lifecycle handling by deleting stale/previous unused token rows in edge functions to avoid lingering unscanned entries.

### Files changed

#### Modified

- `src/screens/main/GenerateQRScreen.tsx` — added 6-character uppercase fallback code rendering under QR and bound it to the current token lifecycle.
- `supabase/functions/pairing-generate/index.ts` — now deletes expired unused tokens and clears previous unused tokens for the creator before issuing a fresh token.
- `supabase/functions/pairing-connect/index.ts` — now opportunistically prunes expired unused tokens and removes a token row when a scan hits an already-expired token.

### Security re-check

- MUST-1: JWT verification remains via Auth REST API (`/auth/v1/user`) in modified functions.
- MUST-2: identity still sourced only from verified auth response; no client-supplied identity fields are trusted.
- MUST-3: token generation remains `crypto.randomUUID()` with server-enforced 5-minute TTL.
- MUST-4: connect path still enforces token existence, unused status, expiry check, self-pairing rejection, and both-users-unpaired checks.
- MUST-5: connect path still persists couple/profile/token linkage in the existing ordered write flow with failure handling.
- MUST-NOT-3: service-role clients are still created only after successful Auth REST verification.

## Modification — Manual code entry + shared heart action button

### What changed

Refined the pairing UX by enlarging the displayed 6-character alternative code, adding direct manual code entry on the Scan QR screen with an inline heart submit control, and extending `pairing-connect` to resolve either a scanned QR token or a typed 6-character fallback code; the heart send control from onboarding chat was extracted into a reusable UI component and reused in Scan QR.

### Files changed

#### Modified

- `src/screens/main/GenerateQRScreen.tsx` — increased the visual prominence of the alternative code under the QR.
- `src/screens/main/ScanQRScreen.tsx` — reduced camera dominance and added 6-character manual code input with embedded heart submit button.
- `supabase/functions/pairing-generate/index.ts` — added deterministic short-code derivation and collision-avoidance when allocating active pairing tokens.
- `supabase/functions/pairing-connect/index.ts` — added support for resolving uppercase 6-character fallback codes in addition to full QR token payloads.
- `src/screens/main/OnboardingProfileScreen.tsx` — replaced inline heart send implementation with reusable component usage.

#### New

- `src/components/ui/HeartActionButton.tsx` — reusable gradient heart action button extracted from onboarding chat input control.

### Security re-check

- MUST-1: both modified pairing edge functions still verify JWT via Auth REST API before any privileged action.
- MUST-2: authenticated user identity remains derived only from verified auth response.
- MUST-3: token generation remains crypto-random UUID with server-enforced expiry.
- MUST-4: connect flow still enforces token validity, expiry, self-pairing guard, and unpaired-user checks before couple creation.
- MUST-5: ordered persistence flow for couple/profile/token state remains unchanged after lookup enhancements.
- MUST-7: QR payload still contains only the original token string (manual code is derived display/input only).
