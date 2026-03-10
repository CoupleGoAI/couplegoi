# Feature: Partner Connection (QR) — Threat Model

> **Status**: Draft
> **Spec**: `docs/features/partner-connection/spec.md`
> **Plan**: `docs/features/partner-connection/plan.md`
> **Date**: 2026-03-10

---

## 1 · Threats

| # | Asset | Threat | Impact |
|---|---|---|---|
| T1 | Pairing token | Brute-force or predictable token — attacker guesses a valid token and pairs with an unsuspecting user | Critical — unauthorized couple creation, attacker gains partner-level access to victim's data |
| T2 | Auth session (JWT) | Edge function uses `client.auth.getUser()` (HS256) instead of Auth REST API (ES256) — all requests fail with 401 or auth is bypassed | High — broken auth or user impersonation |
| T3 | Couple record | Client sends crafted `couple_id` or `partner_id` in request body — edge function trusts client-supplied IDs for atomic writes | Critical — unauthorized couple creation/modification, user impersonation |
| T4 | Pairing token | Replay attack — attacker intercepts a valid token and uses it after the legitimate partner | Medium — race condition could link wrong users (mitigated by single-use flag) |
| T5 | Both profiles | `pairing-connect` creates couple but fails to update one profile's `couple_id` — inconsistent state (one user thinks they're paired, the other doesn't) | High — broken app state, data integrity violation |
| T6 | Profile `couple_id` | Client directly updates `couple_id` via RLS-allowed profile update — bypasses pairing flow entirely | Critical — unauthorized pairing without partner consent |
| T7 | Pairing token | Token in QR contains PII (user ID, email, name) — QR screenshot or shoulder surfing leaks personal data | Medium — PII exposure |
| T8 | Camera stream | Camera permission granted at app start or remains active after scan — unnecessary access to camera feed | Low — privacy violation, unnecessary permission scope |
| T9 | Couple record | `pairing-disconnect` called by non-partner — attacker disconnects someone else's couple | High — unauthorized relationship destruction |
| T10 | Pairing token | Expired token accepted by edge function — clock skew or missing expiry check allows stale tokens | Medium — expired tokens usable, weakens time-bound security |
| T11 | Self-pairing | User scans their own QR code — creates a couple with themselves | Low — data integrity issue, nonsensical couple record |
| T12 | Pairing token | Token string injected with SQL/script content — stored in DB or rendered in QR without sanitization | Medium — injection attack vector |

---

## 2 · Requirements

### MUST (blockers)

- **MUST-1**: All three edge functions MUST verify JWT via Auth REST API (`/auth/v1/user`), never `client.auth.getUser()`. Rationale: ES256 JWT incompatibility (T2).
- **MUST-2**: Edge functions MUST use `user.id` from the Auth REST API response for all DB operations — never accept `user_id`, `couple_id`, or `partner_id` from the client request body. Rationale: prevents impersonation (T3).
- **MUST-3**: `pairing-generate` MUST create tokens using `gen_random_uuid()` or equivalent crypto-random generator — never sequential, timestamp-based, or user-derived. Token MUST expire in exactly 5 minutes (server-enforced). Rationale: prevents brute-force (T1).
- **MUST-4**: `pairing-connect` MUST verify ALL of: token exists, token not expired (`expires_at > now`), token not used (`used = false`), scanner is not the creator (`creator_id ≠ scanner_id`), scanner has no `couple_id`, creator has no `couple_id` — before creating the couple. Rationale: T1, T4, T5, T10, T11.
- **MUST-5**: `pairing-connect` MUST atomically: insert couple, update both profiles' `couple_id`, mark token as used — in a single transaction or with ordered writes that can be detected and retried. If any step fails, no partial state should persist. Rationale: T5.
- **MUST-6**: `pairing-disconnect` MUST verify the authenticated user is `partner1_id` or `partner2_id` of the couple before deactivating. Rationale: T9.
- **MUST-7**: QR payload MUST contain only the token string — no user IDs, no PII, no metadata. Rationale: T7.
- **MUST-8**: The RLS policy on `profiles` MUST prevent client-side updates to `couple_id`. Only the service role (via edge functions) may modify this field. Rationale: T6.

### MUST-NOT (hard prohibitions)

- **MUST-NOT-1**: Edge functions MUST NOT use `client.auth.getUser()` for JWT verification (HS256 incompatibility with ES256 tokens).
- **MUST-NOT-2**: Edge functions MUST NOT trust any client-supplied field for authorization or identity (`user_id`, `couple_id`, `partner_id`, `creator_id`).
- **MUST-NOT-3**: Edge functions MUST NOT use service_role client without first verifying user identity via Auth REST API.
- **MUST-NOT-4**: Client MUST NOT log tokens, pairing payloads, or full API response bodies.
- **MUST-NOT-5**: Client MUST NOT display raw edge function error messages — map to generic user-facing strings.
- **MUST-NOT-6**: Token generation MUST NOT use predictable values (timestamps, sequential IDs, user-derived data).
- **MUST-NOT-7**: Camera permission MUST NOT be requested at app launch — only when user navigates to ScanQR screen.

---

## 3 · Checklist

```
- [ ] Tokens in expo-secure-store, never AsyncStorage (inherited from auth — no change needed)
- [ ] No console.log with tokens, PII, or full payloads in pairingApi.ts
- [ ] All external input validated: token format on client (length, chars), full validation on server
- [ ] Error messages generic — no stack traces, internal IDs, or token values shown to user
- [ ] pairingStore wiped on logout (useAuth.signOut calls resetPairing)
- [ ] pairingStore wiped on disconnect
- [ ] Edge functions: JWT verified via Auth REST API (/auth/v1/user), not client.auth.getUser()
- [ ] Edge functions: user_id derived from auth response, never from request body
- [ ] Edge functions: service_role client used only after auth verification
- [ ] pairing-generate: token is crypto-random (uuid v4 / gen_random_uuid)
- [ ] pairing-generate: expires_at = now + 5 minutes, server-enforced
- [ ] pairing-generate: rejects already-paired users (couple_id IS NOT NULL)
- [ ] pairing-generate: invalidates previous unused tokens for same user
- [ ] pairing-connect: validates token exists, not expired, not used
- [ ] pairing-connect: rejects self-pairing (creator_id ≠ scanner_id)
- [ ] pairing-connect: verifies both users are unpaired before creating couple
- [ ] pairing-connect: atomic couple creation + profile updates + token marking
- [ ] pairing-disconnect: verifies user is partner1 or partner2 of active couple
- [ ] pairing-disconnect: atomic couple deactivation + profile couple_id clearing
- [ ] QR payload contains only token string — no PII, no user IDs
- [ ] Camera permission requested only on ScanQR screen navigation, not at app start
- [ ] RLS on profiles prevents client-side couple_id mutation (already enforced)
- [ ] verify_jwt = false in supabase/config.toml for all three functions (already set)
```
