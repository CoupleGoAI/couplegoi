---
name: modify
description: Change or extend an existing CoupleGoAI feature using a hierarchical 3-agent swarm (architect → coder → reviewer)
---

# /modify — Feature Modification Swarm

**Change:** $ARGUMENTS

---

## Before starting

Read `CLAUDE.md` and `.claude/skills/` to load project rules into context.
Identify the feature being modified from the change description.

---

## Step 1 — Initialize swarm

```javascript
mcp__claude-flow__swarm_init({
  topology: "hierarchical",
  maxAgents: 3,
  strategy: "sequential"
})
```

Store the returned `swarmId` — pass it to every subsequent call.

---

## Step 2 — Architect agent

Spawn the architect. Its job: read all existing feature docs and source files, scope the minimal change, and identify every security MUST that the diff touches.

```javascript
mcp__claude-flow__agent_spawn({
  swarmId: "<swarmId>",
  type: "architect",
  name: "architect",
  task: `
    You are scoping a targeted modification to an existing CoupleGoAI feature: ${ARGUMENTS}.

    Mandatory reads before touching anything:
    1. CLAUDE.md — architecture rules, patterns, constraints
    2. .claude/skills/supabase.md — Supabase rules
    3. .claude/skills/react-native.md — RN/Expo rules
    4. docs/features/<feature>/plan.md
    5. docs/features/<feature>/threat-model.md
    6. docs/features/<feature>/implementation-notes.md
    7. Every file listed under "Files changed" in implementation-notes.md

    If any required docs are missing, stop and report what is missing. Do not proceed.

    If the change touches the database or a Supabase table:
    - mcp__supabase__list_tables to confirm current schema
    - Verify exact column names and RLS status for affected tables
    - mcp__supabase__generate_typescript_types if types need updating

    Scope the change:
    - What is the minimal set of files that must change?
    - What stays the same? Do not redesign what already works.
    - Which TypeScript types or interfaces are affected?
    - Which security MUSTs from threat-model.md does this diff touch?
    - Does any Zustand slice shape change? If so, note it.
    - Are any new routes, edge functions, or DB columns needed?

    Store the scoped plan to swarm memory:
    mcp__claude-flow__memory_store({ key: "change_scope", value: <scope>, swarmId })
    mcp__claude-flow__memory_store({ key: "touched_musts", value: <list_of_musts>, swarmId })
  `
})
```

Wait for architect to complete before proceeding.

---

## Step 3 — Coder agent

Spawn the coder. Its job: apply the minimal diff from the architect's scope. Touch nothing outside it.

```javascript
mcp__claude-flow__agent_spawn({
  swarmId: "<swarmId>",
  type: "coder",
  name: "coder",
  task: `
    You are applying a targeted modification to a CoupleGoAI feature. Retrieve scope first:
    mcp__claude-flow__memory_retrieve({ key: "change_scope", swarmId })
    mcp__claude-flow__memory_retrieve({ key: "touched_musts", swarmId })

    Read every file in the change scope before editing any of them.

    SCOPE RULES (non-negotiable)
    - Change only files listed in change_scope. Nothing else.
    - Do not refactor, reorganise, or improve unrelated code.
    - If you spot an unrelated issue, note it under "Deferred observations" in your summary — do not fix it.
    - If a security MUST from touched_musts is affected, re-verify the full MUST — not just the diff.

    IMPLEMENTATION RULES (same as /implement — no exceptions)

    SUPABASE (.claude/skills/supabase.md)
    - Never supabase.functions.invoke() — use plain fetch
    - Edge functions: verify_jwt = false, auth via /auth/v1/user
    - apikey header must use EXPO_PUBLIC_SUPABASE_ANON_KEY
    - Service role client only after identity verified

    TYPESCRIPT
    - strict: true. Zero any. Zero @ts-ignore. Explicit return types.

    STYLING
    - NativeWind className for static styling. Tokens from @/theme/tokens only.
    - No hardcoded hex. No inline radius/spacing.

    CODE QUALITY
    - Functions ≤ 30 lines. Files ≤ 200 lines.
    - Path aliases always. Correct file naming.
    - No dead code, no commented-out code.

    SECURITY
    - Re-verify every MUST in touched_musts — confirm it remains fully satisfied after the diff.
    - Generic error messages only. No logging of tokens or PII.

    After all edits, store a change summary:
    mcp__claude-flow__memory_store({ key: "change_summary", value: <summary>, swarmId })
    Summary must include:
    - Files modified (and what changed in each)
    - Files created (if any)
    - Files deleted (if any)
    - How each touched MUST remains satisfied
    - Deferred observations (if any)
    - Manual test steps
  `
})
```

Wait for coder to complete before proceeding.

---

## Step 4 — Reviewer agent

Spawn the reviewer. Its job: verify the diff is minimal, correct, and doesn't violate any skill rules or security MUSTs.

```javascript
mcp__claude-flow__agent_spawn({
  swarmId: "<swarmId>",
  type: "reviewer",
  name: "reviewer",
  task: `
    You are reviewing a targeted modification to a CoupleGoAI feature. Retrieve context first:
    mcp__claude-flow__memory_retrieve({ key: "change_scope", swarmId })
    mcp__claude-flow__memory_retrieve({ key: "touched_musts", swarmId })
    mcp__claude-flow__memory_retrieve({ key: "change_summary", swarmId })

    Read every file listed in change_summary.

    SCOPE CHECK
    - Were any files changed that are NOT in change_scope? Flag each one.
    - Were any unrelated refactors made? Flag them.

    SECURITY CHECKS (highest priority)
    - For each MUST in touched_musts: is it still fully satisfied? Verify in the actual code.
    - No supabase.functions.invoke() in client code
    - Edge functions have verify_jwt = false
    - Auth uses /auth/v1/user fetch, not client.auth.getUser()
    - No tokens or PII in console.log

    SUPABASE CHECKS (.claude/skills/supabase.md)
    - apikey header uses correct key for edge function calls
    - Service role client only used after identity verified

    REACT NATIVE CHECKS (.claude/skills/react-native.md)
    - No hardcoded hex values in changed components
    - Loading + error states present where new async flows were added
    - No inline anonymous functions added to list renderers

    ARCHITECTURE CHECKS
    - UI → hooks → domain → data boundary not violated in changed files
    - No direct supabase calls from screens or components

    CODE QUALITY
    - Zero any, zero @ts-ignore in changed files
    - Functions ≤ 30 lines, files ≤ 200 lines
    - Path aliases used correctly

    Run type check and tests:
    npx tsc --noEmit
    npx jest --passWithNoTests

    Store review results:
    mcp__claude-flow__memory_store({ key: "review", value: <findings>, swarmId })

    If there are failures: list each issue with file + line. Do not auto-fix — report and stop.
    If all checks pass: confirm explicitly.
  `
})
```

---

## Step 5 — Report

Retrieve final outputs:

```javascript
mcp__claude-flow__memory_retrieve({ key: "change_summary", swarmId })
mcp__claude-flow__memory_retrieve({ key: "review", swarmId })
```

Report to user:
1. What changed and why (one sentence)
2. Files modified / created / deleted
3. Security MUSTs re-verified
4. Review result (pass / issues found)
5. Manual test steps
