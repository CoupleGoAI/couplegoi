# CoupleGoAI — MVP API & Architecture Plan

> This document is the shared reference for all feature specs. It defines the API surface, data model, auth flow, and implementation order.

---

## Implementation order

Features must be built in this order (each depends on the previous):

1. **auth** — registration, login, persistent sessions, apiClient, secure token storage
2. **onboarding** — AI chat-based profile collection after first login
3. **partner-connection** — QR-based pairing, couple creation, disconnect
4. **ai-chat** — private AI conversation with persistent history

---

## Backend base URL

```
API_BASE_URL = https://api.couplegoai.com/v1   (production)
API_BASE_URL = http://localhost:3000/v1         (development)
```

Stored in app config (`src/data/config.ts`), sourced from environment variable.

---

## Authentication model

- JWT access token (15 min TTL) + refresh token (30 day TTL)
- Access token sent as `Authorization: Bearer <token>` on every authenticated request
- On 401 response: attempt silent refresh via `/auth/refresh`. If refresh fails → logout + navigate to login
- Tokens stored in `expo-secure-store` (never AsyncStorage)
- On logout: POST `/auth/logout`, delete tokens from secure store, reset all Zustand stores

---

## Shared API client (`src/data/apiClient.ts`)

All features use this single client. It handles:

- Base URL configuration
- Attaching access token to headers
- 401 → refresh → retry (once, then logout)
- Request/response typing
- Timeout (10s default)
- Error normalization to `ApiError` type

```ts
interface ApiError {
  code: string; // e.g. 'AUTH_EXPIRED', 'VALIDATION_ERROR', 'NETWORK_ERROR'
  message: string; // user-safe message
  status?: number;
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };
```

---

## Complete API surface (MVP)

### Auth

| Method | Path             | Auth | Purpose            |
| ------ | ---------------- | ---- | ------------------ |
| POST   | `/auth/register` | No   | Create account     |
| POST   | `/auth/login`    | No   | Login              |
| POST   | `/auth/refresh`  | No   | Refresh tokens     |
| POST   | `/auth/logout`   | Yes  | Invalidate session |

### Onboarding

| Method | Path                  | Auth | Purpose                             |
| ------ | --------------------- | ---- | ----------------------------------- |
| GET    | `/onboarding/status`  | Yes  | Check completion + current question |
| POST   | `/onboarding/message` | Yes  | Send user answer, get AI reply      |

### Pairing

| Method | Path                  | Auth | Purpose                           |
| ------ | --------------------- | ---- | --------------------------------- |
| POST   | `/pairing/generate`   | Yes  | Create pairing token + QR data    |
| POST   | `/pairing/connect`    | Yes  | Scan token, create couple         |
| POST   | `/pairing/disconnect` | Yes  | Break couple bond                 |
| GET    | `/pairing/status`     | Yes  | Check if paired, get partner info |

### Chat

| Method | Path             | Auth | Purpose                    |
| ------ | ---------------- | ---- | -------------------------- |
| GET    | `/chat/messages` | Yes  | Paginated message history  |
| POST   | `/chat/send`     | Yes  | Send message, get AI reply |

### User

| Method | Path       | Auth | Purpose                  |
| ------ | ---------- | ---- | ------------------------ |
| GET    | `/user/me` | Yes  | Get current user profile |

**Total: 11 endpoints**

---

## Data model (backend, for context)

```
User {
  id            UUID
  email         string (unique)
  password_hash string
  name          string? (set during onboarding)
  age_range     string? (set during onboarding)
  onboarding_completed  boolean (default false)
  couple_id     UUID? (nullable)
  created_at    timestamp
}

Couple {
  id            UUID
  partner1_id   UUID (FK → User)
  partner2_id   UUID (FK → User)
  is_active     boolean
  created_at    timestamp
}

Message {
  id            UUID
  user_id       UUID (FK → User)
  role          enum('user', 'assistant')
  content       text
  created_at    timestamp
}

PairingToken {
  id            UUID
  creator_id    UUID (FK → User)
  token         string (unique, short-lived)
  expires_at    timestamp
  used          boolean
}
```

---

## Client data layer (`src/data/`)

```
src/data/
  config.ts          — API_BASE_URL, timeouts
  apiClient.ts       — shared fetch wrapper with auth + retry
  authApi.ts         — register, login, refresh, logout
  onboardingApi.ts   — onboarding status + message
  pairingApi.ts      — generate, connect, disconnect, status
  chatApi.ts         — messages, send
  userApi.ts         — me
  secureStorage.ts   — expo-secure-store wrapper for tokens
```

---

## Navigation flow (post-MVP wiring)

```
App launch
  → Check secure store for refresh token
    → Token exists → try /auth/refresh
      → Success → check onboarding_completed
        → false → OnboardingChatScreen
        → true  → check couple_id
          → null → Partner connection flow (GenerateQR / ScanQR)
          → exists → Main tabs (Home, Chat, Game, Profile)
      → Fail → LoginScreen
    → No token → LoginScreen
```

---

## Screens map (MVP)

| Screen                    | Stack      | Condition                        |
| ------------------------- | ---------- | -------------------------------- |
| LoginScreen               | Auth       | Not authenticated                |
| RegisterScreen            | Auth       | Not authenticated                |
| OnboardingChatScreen      | Onboarding | `onboarding_completed === false` |
| GenerateQRScreen          | Pairing    | Onboarded but no partner         |
| ScanQRScreen              | Pairing    | Onboarded but no partner         |
| ConnectionConfirmedScreen | Pairing    | Just paired                      |
| HomeScreen                | Main tabs  | Fully set up                     |
| ChatScreen                | Main tabs  | Fully set up                     |
| GameScreen                | Main tabs  | Fully set up                     |
| ProfileScreen             | Main tabs  | Fully set up                     |

---

## Out of scope (explicit)

- OAuth / social login
- Forgot password
- Message editing/deletion
- Streaming AI responses
- WebSocket / real-time
- Push notifications
- Analytics
- Shared couple chat
- Partner profile merging
- Truth or Dare backend (game stays local/mock for MVP)
