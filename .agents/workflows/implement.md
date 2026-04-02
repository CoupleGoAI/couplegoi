---
name: implement
description: Build a CoupleGoAI feature with Antigravity. Stay direct for focused work; use native subagents when the feature spans multiple layers or needs parallel exploration.
---

# /implement — Native Feature Implementation

**Feature:** $ARGUMENTS

---

## Step 1 — Load context

Read these before writing code:

1. `ANTIGRAVITY.md` — stack, architecture, constraints
2. `.antigravity/skills/supabase.md` — all Supabase rules
3. `.antigravity/skills/react-native.md` — RN/Expo rules
4. `.antigravity/skills/agent-workflow.md` — native handoff rules
5. Relevant feature docs if they exist
6. Relevant existing source files — use Glob and Grep to find analogous screens, hooks, stores, domain modules, and data files in `src/`

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

## Step 3 — Choose the execution mode

Stay in the main Antigravity session when the work is focused and can be implemented safely without delegation.

Use Antigravity's native subagents when the feature:

- spans multiple layers or subsystems
- benefits from parallel exploration or implementation
- needs a planner handoff before editing starts

If you delegate, first write a shared brief in the conversation that includes:

- objective and desired end state
- relevant files and symbols already inspected
- scope, non-goals, and invariants
- security constraints and validation plan
- explicit file ownership for each subagent

Use only native subagents from `.antigravity/agents/`. Do not use any external orchestration layer.

---

## Step 4 — Plan before coding

State concisely:

- files to create and modify by layer
- key TypeScript interfaces
- data flow for each user action
- security considerations and trust boundaries
- whether work stays direct or uses subagents

Keep it short. This is for alignment, not documentation.

---

## Step 5 — Implement

Follow all rules from `ANTIGRAVITY.md` and the skill files. Non-negotiable:

**Architecture**
- UI → hooks → domain → data. No shortcuts.
- UI never imports from `src/data/` directly. Hooks call data. UI calls hooks.

**Supabase**
- Never `supabase.functions.invoke()` — use plain `fetch` with explicit `Authorization` + `apikey` headers
- Edge functions: `verify_jwt = false` in `supabase/config.toml`
- Auth in edge functions: fetch `/auth/v1/user` directly, never `client.auth.getUser()`
- `apikey` header must use `EXPO_PUBLIC_SUPABASE_ANON_KEY`
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
- Add or update tests for domain logic and other high-risk behavior you changed.

---

## Step 6 — Verify

```bash
npx tsc --noEmit
npx jest --passWithNoTests
```

Fix all errors before reporting done.

---

## Step 7 — Report

1. What was built (one sentence)
2. Files created / modified (by layer)
3. Security notes (what was validated)
4. Tests added or updated
5. Manual test steps
