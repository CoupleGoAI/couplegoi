# CoupleGoAI — MVP Architecture Plan

> This document is the shared reference for all feature specs. It defines the backend architecture, data model, auth flow, and implementation order.

---

## Backend architecture — Supabase (serverless)

There is **no custom REST server**. The backend is entirely Supabase:

| Layer | Tech | Usage |
|-------|------|-------|
| Auth | Supabase Auth | `supabase.auth.*` — sign-up, sign-in, sign-out, session refresh |
| Database | Supabase Postgres + RLS | `supabase.from('...')` — all data reads/writes |
| Business logic | Supabase Edge Functions | `apiFetch('/function-name', ...)` via `src/data/apiClient.ts` |
| Real-time | Supabase Realtime | `supabase.channel(...)` subscriptions |
| Storage | Supabase Storage | `supabase.storage` for files/images |

### Env vars (never hard-coded)

```
EXPO_PUBLIC_SUPABASE_URL              — Supabase project URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY  — Supabase anon key (public, safe to expose)
EXPO_PUBLIC_API_BASE_URL              — Edge Function base URL (defaults to production)
```

### Auth model

- Session managed entirely by `supabase-js` with `expo-secure-store` adapter — tokens never touch AsyncStorage
- `autoRefreshToken: true` handles silent refresh automatically
- On sign-out: `supabase.auth.signOut()` + reset all Zustand stores
- Access the session anywhere: `supabase.auth.getSession()` — `supabase-js` attaches the Bearer token to all requests automatically

---

## Implementation order

Features must be built in this order (each depends on the previous):

1. **auth** — registration, login, persistent sessions, Supabase client, secure token storage
2. **onboarding** — AI chat-based profile collection after first login
3. **partner-connection** — QR-based pairing, couple creation, disconnect
4. **ai-chat** — private AI conversation with persistent history

---

## Client data layer (`src/data/`)

```
src/data/
  supabase.ts        — Supabase client singleton (expo-secure-store adapter)
  auth.ts            — Typed wrappers around supabase.auth.* methods
  apiClient.ts       — apiFetch() for Edge Functions + supabaseQuery() helper
  config.ts          — EXPO_PUBLIC_API_BASE_URL (Edge Function base URL)
  onboardingApi.ts   — onboarding status + AI message (Edge Function calls)
  pairingApi.ts      — generate token, connect, disconnect, status (Edge Function calls)
  chatApi.ts         — message history + send (Edge Function + Postgres query)
  userApi.ts         — fetch and update user profile (Postgres query)
```

### `supabaseQuery<T>` — for Postgres queries

```ts
// Wraps supabase.from('...') calls into ApiResult<T>
const result = await supabaseQuery(() =>
  supabase.from('profiles').select('*').eq('id', userId).single()
);
```

### `apiFetch<T>` — for Edge Functions

```ts
// Attaches Bearer token automatically, enforces 10s timeout
const result = await apiFetch<ResponseType>('/function-name', {
  method: 'POST',
  body: JSON.stringify({ ... }),
});
```

---

## Data model (Supabase Postgres)

All tables live in `supabase/schemas/`. See `supabase/migrations/` for the canonical SQL.

```
profiles (extends auth.users)
  id                UUID (FK → auth.users.id)
  name              text?
  avatar_url        text?
  onboarding_completed  boolean (default false)
  couple_id         UUID? (FK → couples.id)
  created_at        timestamp

couples
  id                UUID
  partner1_id       UUID (FK → profiles.id)
  partner2_id       UUID (FK → profiles.id)
  is_active         boolean
  created_at        timestamp

messages
  id                UUID
  user_id           UUID (FK → profiles.id)
  role              text ('user' | 'assistant')
  content           text
  created_at        timestamp

pairing_tokens
  id                UUID
  creator_id        UUID (FK → profiles.id)
  token             text (unique, short-lived)
  expires_at        timestamp
  used              boolean
```

RLS policies protect all tables. Clients only read/write their own data.

---

## Edge Functions (business logic + AI)

Business logic that must not run on the client goes in Supabase Edge Functions:

| Function | Purpose |
|----------|---------|
| `onboarding-chat` | AI conversation for profile collection |
| `ai-chat` | Private AI conversation with history |
| `pairing-generate` | Create pairing token (server-enforced TTL) |
| `pairing-connect` | Validate token, create couple record |

Edge Functions receive the user's JWT from the Authorization header and verify it via `supabase.auth.getUser(authHeader)`.

---

## Navigation flow

```
App launch
  → supabase.auth.getSession()
    → No session → LoginScreen
    → Session exists
        → fetch profiles row
          → onboarding_completed=false → OnboardingChatScreen
          → onboarding_completed=true
              → couple_id=null → Partner connection flow (GenerateQR / ScanQR)
              → couple_id exists → Main tabs (Home, Chat, Game, Profile)
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
