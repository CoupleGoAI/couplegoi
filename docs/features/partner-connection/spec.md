# Feature: Partner Connection (QR)

## What

Users connect with their partner by generating/scanning a QR code inside the app. One partner generates a QR, the other scans it. On successful scan, a Couple record is created and both users are linked. A user can only have one partner at a time. Either partner can disconnect, which deactivates the couple and returns both to unpaired state.

### Screens

- **GenerateQRScreen** (exists) — shows a QR code containing a temporary pairing token. Token expires in 5 min. Shows countdown timer. "Regenerate" button when expired.
- **ScanQRScreen** (exists) — camera-based QR scanner. On scan, validates token with backend. Shows success/error feedback.
- **ConnectionConfirmedScreen** (exists) — success state with partner info. CTA to go to Home.
- **ProfileScreen** — add "Disconnect" button in partner section. Confirmation dialog before disconnecting.

### Flow

1. User A taps "Generate QR" → backend creates pairing token → QR displayed
2. User B taps "Scan QR" → scans QR → sends token to backend
3. Backend validates token (not expired, not used, both users unpaired) → creates Couple
4. Both users see confirmation → navigate to Home

### API endpoints

| Method | Path                  | Body        | Response                           | Auth |
| ------ | --------------------- | ----------- | ---------------------------------- | ---- |
| POST   | `/pairing/generate`   | —           | `{ token, expiresAt }`             | Yes  |
| POST   | `/pairing/connect`    | `{ token }` | `{ couple, partner }`              | Yes  |
| POST   | `/pairing/disconnect` | —           | `{ ok }`                           | Yes  |
| GET    | `/pairing/status`     | —           | `{ connected, partner?, couple? }` | Yes  |

### State

- `appStore` updates: `partner` and `couple` populated on successful connection, cleared on disconnect
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
