---
name: implement-claude
description: Build a new CoupleGoAI feature directly with Claude — no swarm. Best for small to medium features.
---

# /implement-claude — Direct Feature Implementation

**Feature:** $ARGUMENTS

---

## Step 1 — Load context

Read these before writing a single line of code:

1. `CLAUDE.md` — stack, architecture, constraints
2. `.claude/skills/supabase.md` — all Supabase rules
3. `.claude/skills/react-native.md` — RN/Expo rules
4. `docs/features/` — any existing spec or plan for this feature
5. Relevant existing source files — use Glob and Grep to find analogous screens, hooks, stores, and data files in `src/`

Do not design anything until you have read what already exists.

---

## Step 2 — Inspect schema (if the feature touches the database)

Before writing any query, migration, or Supabase type:

```javascript
mcp__supabase__list_tables({ schemas: ["public"], verbose: true })
mcp__supabase__generate_typescript_types({})
```

Verify exact column names, types, and RLS status for every table the feature will touch.
Never assume a column exists.

---

## Step 3 — Plan (state before coding)

Write out concisely:

- Files to create and modify (by layer: types → domain → data → store → hooks → UI → navigation → edge functions)
- Key TypeScript interfaces
- Data flow for each user action (UI → hook → domain → data → response, including error paths)
- Security considerations: trust boundaries, sensitive data, MUST requirements

Keep it short. This is for alignment, not documentation.

---

## Step 4 — Implement

Follow all rules from `CLAUDE.md` and the skill files. Non-negotiable:

**Architecture**
- UI → hooks → domain → data. No shortcuts.
- UI never imports from `src/data/` directly. Hooks call data. UI calls hooks.

**Supabase**
- Never `supabase.functions.invoke()` — use plain `fetch` with explicit `Authorization` + `apikey` headers
- Edge functions: `verify_jwt = false` in `supabase/config.toml`
- Auth in edge functions: fetch `/auth/v1/user` directly, never `client.auth.getUser()`
- `apikey` header must use `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`eyJhbGci...`), not publishable key
- Service role client only after identity verified, never exposed to client

**TypeScript**
- `strict: true`. Zero `any`. Zero `@ts-ignore`. Explicit return types on all exports.
- Discriminated unions for errors: `{ ok: true; data: T } | { ok: false; error: E }`

**Styling**
- `className` (NativeWind) for all static styling. Tokens from `@/theme/tokens` only.
- No hardcoded hex. No inline radius or spacing values.

**Code quality**
- Functions ≤ 30 lines. Files ≤ 200 lines — split if needed.
- Path aliases always (`@/`, `@hooks/*`, `@store/*`, etc.).
- No dead code. No commented-out code.

**Security**
- Never `console.log` tokens, PII, auth headers, or full payloads.
- Validate all external input: API responses, QR payloads, deep link params.
- Generic error messages only — no stack traces, internal IDs, or token fragments.

**Tests**
- Unit tests for all domain logic in `src/domain/<feature>/__tests__/`

---

## Step 5 — Verify

```bash
npx tsc --noEmit
npx jest --passWithNoTests
```

Fix all errors before reporting done.

---

## Step 6 — Report

1. What was built (one sentence)
2. Files created / modified (by layer)
3. Security notes (what was validated)
4. Tests added
5. Manual test steps
