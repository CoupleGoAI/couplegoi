````md
# Supabase Edge Functions — CoupleGoAI

Server-side logic that **must not run on the client**.

Use Edge Functions for:

- AI processing
- multi-table atomic operations
- secure token generation
- validation / business logic

Client calls:

```ts
supabase.functions.invoke("<function-name>", payload);
```
````

`supa­base-js` automatically attaches the **JWT Bearer token**.

---

# Location

```
supabase/functions/
  onboarding-chat/
    index.ts
  ai-chat/
    index.ts
  pairing-generate/
    index.ts
  pairing-connect/
    index.ts
  pairing-disconnect/
    index.ts
```

Each folder = **one deployed function**

Endpoint:

```
<SUPABASE_URL>/functions/v1/<function-name>
```

---

# Auth

All functions require authentication.

Inside function:

```ts
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
  });
}
```

---

# Functions

## onboarding-chat

AI onboarding conversation.

Responsibilities

- store user message
- call AI
- store assistant reply
- optionally mark onboarding complete

Request

```json
{ "message": "text" }
```

Response

```json
{ "reply": "text", "onboarding_completed": false }
```

---

## ai-chat

Private AI conversation with history.

Responsibilities

- fetch history
- call AI
- store user + assistant messages

Request

```json
{ "message": "text" }
```

Response

```json
{ "reply": "text" }
```

---

## pairing-generate

Generate short-lived QR pairing token.

Responsibilities

- ensure user not paired
- generate token
- store with expiry

Response

```json
{ "token": "ABC123" }
```

---

## pairing-connect

Connect two users using token.

Responsibilities

- validate token
- create `couples` row
- update both `profiles.couple_id`
- mark token used

Response

```json
{ "couple_id": "uuid" }
```

---

## pairing-disconnect

Disconnect partners.

Responsibilities

- deactivate couple
- clear both `profiles.couple_id`

Response

```json
{ "success": true }
```

---

# Client usage

Client wrappers:

```
src/data/apiClient.ts
```

Example

```ts
await invokeEdgeFunction("ai-chat", { message });
```

Rules

- Never call `supabase.functions.invoke()` directly in UI
- Always use typed wrappers

---

# Error format

```json
{ "error": "message" }
```

Status codes

```
400 invalid request
401 unauthorized
403 forbidden
500 server error
```

---

# Dev workflow

Create

```
supabase functions new <name>
```

Run locally

```
supabase functions serve
```

Deploy

```
supabase functions deploy <name>
```

---

# Rules

- No secrets in client
- AI calls only in Edge Functions
- Multi-table writes only in Edge Functions
- Simple reads/writes use direct DB + RLS

```

```
