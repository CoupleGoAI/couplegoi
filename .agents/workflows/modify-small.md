---
name: modify-small
description: Make a targeted change to existing CoupleGoAI code directly with Antigravity. Use this for small, surgical diffs.
---

# /modify-small — Direct Small Modification

**Change:** $ARGUMENTS

---

## Step 1 — Load context

Read these before touching anything:

1. `ANTIGRAVITY.md` — architecture rules, patterns, constraints
2. `.antigravity/skills/supabase.md` — Supabase rules
3. `.antigravity/skills/react-native.md` — RN/Expo rules
4. `.antigravity/skills/agent-workflow.md` — workflow and output rules
5. Relevant feature docs if they exist
6. Every source file directly involved in the requested change

If you need more files to scope the change safely, read them before editing.

---

## Step 2 — Inspect schema (if the change touches the database)

```javascript
mcp__supabase__list_tables({ schemas: ["public"], verbose: true })
```

Verify exact column names and RLS status for any table the change touches.

---

## Step 3 — Scope the change

State briefly:

- the minimal set of files that must change
- affected types or interfaces
- security-sensitive behavior touched by the diff
- what stays the same

Do not redesign what already works.

---

## Step 4 — Implement

**Scope rules**
- Stay in the main Antigravity session
- Change only what is required for this request
- Do not refactor or reorganize unrelated code
- If you notice an unrelated issue, mention it in the final report but do not fix it

**All other rules from `ANTIGRAVITY.md` and the skill files still apply**

**Supabase**
- Never `supabase.functions.invoke()` — use plain `fetch`
- Edge functions: `verify_jwt = false`, auth via `/auth/v1/user`
- `apikey` header must use `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Service role client only after identity verified

**TypeScript**
- `strict: true`. Zero `any`. Zero `@ts-ignore`. Explicit return types.

**Styling**
- NativeWind `className` for static styling. Tokens from `@/theme/tokens` only.
- No hardcoded hex. No inline radius or spacing.

**Security**
- Generic error messages only. No logging of tokens or PII.
- Validate all external input touched by the change.

---

## Step 5 — Verify

```bash
npx tsc --noEmit
npx jest --passWithNoTests
```

Fix all errors before reporting done.

---

## Step 6 — Report

1. What changed and why (one sentence)
2. Files modified / created / deleted
3. Security notes
4. Deferred observations (if any)
5. Manual test steps
