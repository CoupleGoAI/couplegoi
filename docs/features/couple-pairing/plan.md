# Feature: Couple Pairing (QR) — Architecture Plan

> **Status**: Draft
> **Spec**: `docs/features/couple-pairing/spec.md`
> **Date**: 2026-03-10

---

## 1 · What & why

Users connect with their partner by generating/scanning a QR code. One partner generates a QR (token with 5-min TTL), the other scans it. On successful scan, a `couples` record is created atomically and both profiles are linked via `couple_id`. Either partner can disconnect from their Profile screen. All mutations go through edge functions (service role) because they require atomic multi-table writes and server-enforced security checks.

---

## 2 · Files

### Already implemented

| File                                             | Layer         | Status                                                  |
| ------------------------------------------------ | ------------- | ------------------------------------------------------- |
| `supabase/schemas/03_couples.sql`                | DB            | ✅ Table + RLS                                          |
| `supabase/schemas/04_pairing_tokens.sql`         | DB            | ✅ Table + RLS                                          |
| `supabase/schemas/06_functions.sql`              | DB            | ✅ `get_my_couple_id()`, `get_partner_id()` helpers     |
| `supabase/config.toml`                           | Config        | ✅ All three functions registered, `verify_jwt = false` |
| `supabase/functions/pairing-generate/index.ts`   | Edge Function | ⚠️ Stub only                                            |
| `supabase/functions/pairing-connect/index.ts`    | Edge Function | ⚠️ Stub only                                            |
| `supabase/functions/pairing-disconnect/index.ts` | Edge Function | ⚠️ Stub only                                            |
| `src/data/apiClient.ts`                          | Data          | ✅ `invokeEdgeFunction()`, `supabaseQuery()`            |
| `src/types/index.ts`                             | Types         | ✅ `AuthUser.coupleId` exists                           |
| `src/data/auth.ts`                               | Data          | ✅ `fetchProfile()` reads `couple_id`                   |

### New files

```
NEW:
  src/data/pairingApi.ts                           # Edge function calls (generate, connect, disconnect) + couple status query
  src/store/pairingStore.ts                        # Ephemeral pairing state (token, expiresAt, error)
  src/hooks/usePairing.ts                          # Orchestrates generate/scan/disconnect flows
  src/domain/pairing/validation.ts                 # Client-side QR payload validation (format check only)
  src/domain/pairing/__tests__/validation.test.ts  # Tests for validation
  src/screens/main/GenerateQRScreen.tsx            # QR display with countdown timer
  src/screens/main/ScanQRScreen.tsx                # Camera-based QR scanner
  src/screens/main/ConnectionConfirmedScreen.tsx   # Success state with partner info
```

### Modified files

```
MODIFIED:
  src/navigation/types.ts                          # Add Pairing route params
  src/navigation/RootNavigator.tsx                  # Add pairing flow between Onboarding and Main
  src/screens/main/PlaceholderScreen.tsx            # Add "Disconnect" button when paired
  src/hooks/useAuth.ts                             # Reset pairingStore on signOut
  supabase/functions/pairing-generate/index.ts     # Full implementation
  supabase/functions/pairing-connect/index.ts      # Full implementation
  supabase/functions/pairing-disconnect/index.ts   # Full implementation
```

---

## 3 · Types

### Pairing API — generate

```ts
// POST /functions/v1/pairing-generate
// Request: (no body)
// Response:
interface PairingGenerateResponse {
  token: string; // opaque token string for QR
  expiresAt: string; // ISO timestamp
}
```

### Pairing API — connect

```ts
// POST /functions/v1/pairing-connect
// Request:
interface PairingConnectRequest {
  token: string;
}

// Response:
interface PairingConnectResponse {
  couple: {
    id: string;
    createdAt: string;
  };
  partner: {
    id: string;
    name: string | null;
  };
}
```

### Pairing API — disconnect

```ts
// POST /functions/v1/pairing-disconnect
// Request: (no body)
// Response:
interface PairingDisconnectResponse {
  ok: true;
}
```

### Couple status (direct DB query)

```ts
interface CoupleStatus {
  isPaired: boolean;
  coupleId: string | null;
  partner: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
}
```

### Pairing store

```ts
interface PairingState {
  token: string | null;
  expiresAt: string | null; // ISO timestamp
  entryScreen: "GenerateQR" | "ScanQR" | null;
  isPending: boolean;
  error: string | null;
}
```

### QR validation (client-side)

```ts
// Pure format check — actual validation is server-side
interface QRValidationResult {
  valid: boolean;
  token: string | null;
  error: string | null;
}
```

### Navigation params

```ts
// Add to RootStackParamList
type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  GenerateQR: undefined;
  ScanQR: undefined;
  ConnectionConfirmed: { partnerName: string | null };
  Main: undefined;
};
```

---

## 4 · Data flow

### Generate QR

```
User taps "Generate QR"
  → GenerateQRScreen mounts
  → usePairing.generateToken()
    → pairingApi.generateToken()        [plain fetch → POST /functions/v1/pairing-generate]
      → Edge function:
          1. Auth: verify JWT via Auth REST API (/auth/v1/user)
          2. Check profile.couple_id IS NULL (not already paired)
          3. Invalidate any existing unused tokens for this user
          4. Generate crypto-random token (uuid v4)
          5. Insert into pairing_tokens (creator_id, token, expires_at = now + 5min)
          6. Return { token, expiresAt }
    → pairingStore.setToken(token), setExpiresAt(expiresAt)
  → QR rendered from token string
  → Countdown timer from expiresAt
  → On expiry → "Regenerate" button → same flow
```

### Onboarding handoff

```
User finishes onboarding and taps "Let's Go!"
  → useOnboarding.startPairing()
    → pairingStore.setEntryScreen('ScanQR')
    → authStore.setUser({ ...user, onboardingCompleted: true })
  → RootNavigator re-evaluates auth state
  → Pairing stack mounts with ScanQR as the first screen
  → Back action on ScanQR replaces to GenerateQR so either pairing role remains available
```

### Scan QR (connect)

```
User taps "Scan QR" → ScanQRScreen
  → Camera permission requested (expo-camera)
  → User scans QR → raw string extracted
  → validateQRPayload(raw) → format check (non-empty, <= 100 chars, printable ASCII)
  → usePairing.connect(token)
    → pairingApi.connect(token)         [plain fetch → POST /functions/v1/pairing-connect]
      → Edge function:
          1. Auth: verify JWT via Auth REST API
          2. Validate token from body (required, string, <= 100 chars)
          3. Look up pairing_tokens where token = input, used = false
          4. Reject if not found or expired (expires_at < now)
          5. Check scanner's profile.couple_id IS NULL
          6. Check creator's profile.couple_id IS NULL
          7. Reject if creator_id === scanner_id (can't pair with self)
          8. BEGIN atomic:
             a. Insert couples row (partner1_id = creator, partner2_id = scanner)
             b. Update both profiles: couple_id = new couple id
             c. Mark token: used = true, used_by = scanner, couple_id = new couple id
          9. Return { couple: { id, createdAt }, partner: { id, name } }
    → Haptic success feedback (expo-haptics)
    → Navigate to ConnectionConfirmedScreen({ partnerName })
```

### Disconnect

```
User taps "Disconnect" on PlaceholderScreen (Profile section)
  → Confirmation dialog shown
  → usePairing.disconnect()
    → pairingApi.disconnect()           [plain fetch → POST /functions/v1/pairing-disconnect]
      → Edge function:
          1. Auth: verify JWT via Auth REST API
          2. Read profile.couple_id → must be non-null
          3. Verify couple exists, is_active = true, user is partner1 or partner2
          4. BEGIN atomic:
             a. Update couple: is_active = false, disconnected_at = now
             b. Update both profiles: couple_id = NULL
          5. Return { ok: true }
    → authStore.setUser({ ...user, coupleId: null })
    → pairingStore.reset()
    → UI updates reactively (no longer shows partner info)
```

### Error paths

- **Network error**: `pairingApi` returns `{ ok: false, error: '...' }` → `pairingStore.setError()` → error banner shown
- **Token expired**: edge function returns 410 → "This code has expired. Ask your partner to generate a new one."
- **Already paired**: edge function returns 409 → "You or your partner are already connected to someone."
- **Invalid QR**: client-side validation rejects → "That doesn't look like a valid CoupleGoAI code."
- **Self-pairing**: edge function returns 400 → "You can't pair with yourself!"
- **Session expired**: `getSession()` fails → "Session expired. Please sign in again."
- **Camera denied**: expo-camera permission denied → "Camera access is needed to scan your partner's QR code."

---

## 5 · State

### Zustand slice: `usePairingStore` (new, ephemeral)

```ts
interface PairingState {
  token: string | null;
  expiresAt: string | null;
  entryScreen: "GenerateQR" | "ScanQR" | null;
  isPending: boolean;
  error: string | null;
}

interface PairingActions {
  setToken: (token: string | null) => void;
  setExpiresAt: (expiresAt: string | null) => void;
  setEntryScreen: (screen: "GenerateQR" | "ScanQR" | null) => void;
  setPending: (v: boolean) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}
```

**Reset on logout**: `useAuth.signOut()` must call `resetPairing()` — clears token/error state.

**Reset on disconnect**: `usePairing.disconnect()` calls `pairingStore.reset()`.

### authStore updates

- `coupleId` is already on `AuthUser` — populated by `fetchProfile()` after connect, cleared after disconnect.
- No new fields needed on authStore.

### Derived state (computed in hook/screen)

- `isExpired`: `expiresAt !== null && new Date(expiresAt) < new Date()`
- `timeRemaining`: countdown seconds from `expiresAt`
- `isPaired`: `authStore.user.coupleId !== null`

---

## 6 · Navigation

### Updated flow

```
RootNavigator
  ├─ !isAuthenticated → Auth (Login/Register)
  ├─ !onboardingCompleted → Onboarding (OnboardingChatScreen)
  ├─ onboardingCompleted && !coupleId → GenerateQR / ScanQR / ConnectionConfirmed
  └─ onboardingCompleted && coupleId → Main
```

New routes added to `RootStackParamList`:

```ts
GenerateQR: undefined;
ScanQR: undefined;
ConnectionConfirmed: {
  partnerName: string | null;
}
```

The pairing screens are shown as a group when `onboardingCompleted === true && coupleId === null`. A tab or toggle lets the user choose between Generate and Scan. On connection, navigation proceeds to ConnectionConfirmed, then to Main.

From Main (Profile section), "Disconnect" calls the edge function and sets `coupleId = null`, which reactively navigates back to the pairing flow.

---

## 7 · Security notes

See `threat-model.md` for full analysis. Key points:

- All three edge functions verify JWT via Auth REST API (`/auth/v1/user`), never `client.auth.getUser()`
- Edge functions use service_role client (required for atomic multi-table writes) — identity verified via Auth REST API first
- `pairing-connect` enforces: token not expired, not used, both users unpaired, not self-pairing — all server-side
- Token is crypto-random (uuid v4), expires in 5 min, single-use — not guessable
- QR contains only the token string — no PII, no user IDs, no metadata
- Client validates QR format only (non-empty, length, printable chars) — server is authoritative
- Camera permission requested lazily (only on ScanQR screen), not at app launch
- `couple_id` on profiles cannot be modified by client RLS policy — only service role
- Disconnect is idempotent — re-disconnecting a deactivated couple returns success
- `pairingStore` wiped on logout and disconnect
- No tokens, PII, or full payloads logged in client data layer
