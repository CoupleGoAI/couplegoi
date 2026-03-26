---
name: modify-claude
description: Make a targeted change to an existing CoupleGoAI feature directly with Claude — no swarm. Best for small changes.
---

# /modify-claude — Direct Feature Modification

**Change:** $ARGUMENTS

---

## Step 1 — Load context

Read these before touching anything:

1. `CLAUDE.md` — architecture rules, patterns, constraints
2. `.claude/skills/supabase.md` — Supabase rules
3. `.claude/skills/react-native.md` — RN/Expo rules
4. `docs/features/<feature>/plan.md`
5. `docs/features/<feature>/threat-model.md`
6. `docs/features/<feature>/implementation-notes.md`
7. Every file listed under **Files changed** in `implementation-notes.md`

If any required docs are missing, stop and report what is missing. Do not proceed.

---

## Step 2 — Inspect schema (if the change touches the database)

```javascript
mcp__supabase__list_tables({ schemas: ["public"], verbose: true })
```

Verify exact column names and RLS status for any table the change touches.

---

## Step 3 — Scope the change (state before coding)

Write out:

- The minimal set of files that must change — nothing else
- Which TypeScript types or interfaces are affected
- Which security MUSTs from `threat-model.md` this diff touches
- What stays the same (explicitly confirm you are not redesigning what works)

If you cannot scope the change without reading additional files, read them first.

---

## Step 4 — Implement

**Scope rules (non-negotiable)**
- Change only files in the scoped list. Nothing else.
- Do not refactor, reorganise, or improve unrelated code.
- If you notice an unrelated issue, note it under "Deferred observations" in your report — do not fix it.
- Re-verify every touched security MUST fully — not just the lines you changed.

**All other rules from `CLAUDE.md` and skill files apply without exception:**

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

**Code quality**
- Functions ≤ 30 lines. Files ≤ 200 lines.
- Path aliases always. Correct file naming.
- No dead code. No commented-out code.

**Security**
- Generic error messages only. No logging of tokens or PII.
- All external input validated.

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
3. Security MUSTs re-verified (list each touched MUST and how it remains satisfied)
4. Deferred observations (if any)
5. Manual test steps
