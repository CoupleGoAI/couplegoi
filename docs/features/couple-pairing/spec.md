# Feature: Couple Pairing (QR)

## What

Users connect with their partner by generating/scanning a QR code inside the app. One partner generates a QR, the other scans it. On successful scan, a Couple record is created and both users are linked. A user can only have one partner at a time. Either partner can disconnect, which deactivates the couple and returns both to unpaired state.

### Screens

- **GenerateQRScreen** (exists) — shows a QR code containing a temporary pairing token. Token expires in 5 min. Shows countdown timer. "Regenerate" button when expired.
- **ScanQRScreen** (exists) — camera-based QR scanner. On scan, validates token via edge function. Shows success/error feedback.
- **ConnectionConfirmedScreen** (exists) — success state with partner info. CTA to go to Home.
- **ProfileScreen** — add "Disconnect" button in partner section. Confirmation dialog before disconnecting.

### Flow

1. User A taps "Generate QR" → edge function creates pairing token with server-enforced TTL → QR displayed
2. User B taps "Scan QR" → scans QR → sends token to edge function
3. Edge function validates token (not expired, not used, both users unpaired) → creates Couple atomically
4. Both users see confirmation → navigate to Home

### Data access (Supabase-native — no REST endpoints)

| Operation         | Method                                       | Notes                                                 |
| ----------------- | -------------------------------------------- | ----------------------------------------------------- |
| Generate token    | Edge function: `pairing-generate`            | Creates pairing token with server-enforced 5-min TTL, ensures user isn't already paired. Output: `{ token, expiresAt }` |
| Connect (scan)    | Edge function: `pairing-connect`             | Validates token (not expired, not used, both unpaired), creates couple record atomically. Input: `{ token }`. Output: `{ couple, partner }` |
| Disconnect        | Edge function: `pairing-disconnect`          | Deactivates couple, clears `couple_id` on both profiles atomically. Output: `{ ok }` |
| Check status      | Direct DB query on `profiles` + `couples`    | Read `couple_id` from profile, join with `couples` and partner's profile. No edge function needed for read-only status |

Edge functions are used for generate/connect/disconnect because these operations require atomic multi-table writes and server-enforced security checks that cannot be safely delegated to the client.

### State

- `authStore` updates: `coupleId` populated on successful connection, cleared on disconnect
- `pairingStore` (new, ephemeral): `token`, `expiresAt`, `isPending`, `error`

## Done when

- [ ] User can generate a QR code with a temporary pairing token
- [ ] Partner can scan QR and both become connected
- [ ] Token expires after 5 minutes and QR can be regenerated
- [ ] Already-paired users cannot pair again
- [ ] Either user can disconnect from Profile screen
- [ ] After disconnect, both users return to unpaired state

## Notes

- QR contains only the pairing token string — no PII
- Camera permission requested only when user navigates to Scan screen (not on app start)
- Existing GenerateQR/ScanQR/ConnectionConfirmed screens exist but need wiring to real backend
- Show clear error states: token expired, already paired, invalid QR, network error
- Haptic feedback on successful scan
- The pairing flow is part of onboarding (after AI onboarding) but also accessible from Profile for users who skipped or disconnected
