---
name: supabase
description: supabase skill
---

# Supabase Skill — CoupleGoAI

## MCP Access — Live Supabase Introspection

Antigravity has direct access to the CoupleGoAI Supabase project via the Supabase MCP server.
The MCP server is the source of truth for all schema, RLS policies, and migrations.
Memory and conversation context are not.

**Before writing any migration:**
- Use MCP to list current tables, columns, and types
- Use MCP to read existing RLS policies on the affected table
- Confirm no conflicts with existing indexes or foreign keys

**Before writing any query or Supabase client call:**
- Use MCP to confirm exact column names and types
- Check whether RLS is enabled and what policies already exist
- Never assume a column exists — verify via MCP first

**Before writing any RLS policy:**
- Read existing policies via MCP first
- Policies must cover all relevant operations (SELECT, INSERT, UPDATE, DELETE)
- Never reference a column that hasn't been verified via MCP

**After any schema change:**
- Re-inspect the affected table via MCP to confirm the change applied correctly
- Do not proceed to the next task until the schema matches what was intended

**TypeScript types:**
- Use MCP's type generation instead of writing types by hand
- Generated types live in `src/types/supabase.ts` — never hand-edit this file

**The rule:**
If you would normally guess or infer something about the database schema — don't.
Use MCP instead.

---

## Migration Conventions

- All migrations in `supabase/migrations/`
- Filename format: `YYYYMMDDHHmmss_description.sql`
- Always wrap multi-statement migrations in a transaction
- Never write DROP TABLE or DROP COLUMN without an explicit instruction and confirmed backup

---

## Non-Negotiable Implementation Rules

Always prefer the official, battle-tested Supabase JS v2 pattern. Before writing
any Supabase code, use the Supabase MCP to inspect the current state — do not rely
on memory or assumptions. If unsure whether a method exists, check
https://supabase.com/docs and state the source before using it.

Prefer boring and proven over clever and novel. If a pattern is not in the official
Supabase v2 docs, do not use it.

### When generating Supabase code, always:
- Prefer the official Supabase JS v2 docs pattern as baseline
- After generating, explicitly state which version of `@supabase/supabase-js` the pattern requires
- Flag if a pattern is known to have breaking changes between v1 and v2
- Never invent API methods — if unsure whether a method exists, say so and suggest
  checking docs at https://supabase.com/docs

---

## JWT & Edge Functions (from ANTIGRAVITY.md — non-negotiable)

This project uses **ES256 (ECC P-256)** JWT signing. The Supabase gateway only
supports HS256 and will reject all valid user tokens with 401 if `verify_jwt = true`.

- **Every edge function must have `verify_jwt = false`** in `supabase/config.toml`
- Auth inside edge functions must use the **Auth REST API directly** — never
  `client.auth.getUser()` which uses HS256 verification internally:

```typescript
const authResponse = await fetch(
  `${Deno.env.get("SUPABASE_URL")}/auth/v1/user`,
  {
    headers: {
      Authorization: authHeader,
      apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
    },
  },
);
if (!authResponse.ok) return json({ error: "Auth failed" }, 401);
const user = await authResponse.json();
```

---

## React Native → Edge Function Calls

- **Never use `supabase.functions.invoke()`** — it strips the `Authorization` header
  in `supabase-js-react-native` (known bug)
- Always use **plain `fetch`** with explicit headers:

```typescript
const { data: { session } } = await supabase.auth.getSession();

await fetch(
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/<function-name>`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session!.access_token}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(payload),
  },
);
```

---

## API Keys

- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (`sb_publishable_...`) — for direct
  DB/Auth calls via the supabase client
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`eyJhbGci...`) — **required as `apikey` header**
  when calling edge functions. The gateway rejects the publishable key.
- Never use the `service_role` key on the client. Edge functions access it via
  `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.

---

## RLS & DB Clients in Edge Functions

- Use a **user-scoped client** (anon key + forwarded JWT) for operations where RLS
  should apply
- Use a **service role client** for atomic multi-table writes or operations that must
  bypass RLS (pairing, disconnect). Identity must always be verified via the Auth REST
  API first before using the service role client
- Never expose the service role key to the client under any circumstance

---

## Edge Function Conventions

- Runtime: Deno
- Auth: extract JWT manually from `Authorization` header using `req.headers.get('Authorization')`
- Always return proper CORS headers
- Always wrap handler in try/catch and return structured error JSON

---

## Realtime Conventions

- Use `.channel()` + `.on('postgres_changes', ...)` pattern (v2 API)
- Always call `.subscribe()` and store the channel ref for cleanup
- Clean up with `supabase.removeChannel(channel)` on unmount
