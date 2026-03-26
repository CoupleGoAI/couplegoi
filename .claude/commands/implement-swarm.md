---
name: implement
description: Build a new CoupleGoAI feature end-to-end using a hierarchical 3-agent swarm (architect → coder → reviewer)
---

# /implement — New Feature Swarm

**Feature:** $ARGUMENTS

---

## Before starting

Read `CLAUDE.md` and `.claude/skills/` to load project rules into context.
Check `docs/features/` for any existing spec for this feature.

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

Spawn the architect. Its job: read project context, inspect live schema via Supabase MCP, and produce a complete implementation plan stored to shared memory.

```javascript
mcp__claude-flow__agent_spawn({
  swarmId: "<swarmId>",
  type: "architect",
  name: "architect",
  task: `
    You are planning the CoupleGoAI feature: ${ARGUMENTS}.

    Mandatory reads before designing anything:
    1. CLAUDE.md — stack, architecture, constraints
    2. .claude/skills/supabase.md — Supabase rules
    3. .claude/skills/react-native.md — RN/Expo rules
    4. docs/features/ — any existing spec for this feature
    5. src/ — existing analogous screens, hooks, stores, domain modules via Glob/Grep

    Mandatory Supabase MCP calls:
    - mcp__supabase__list_tables to confirm existing schema
    - mcp__supabase__generate_typescript_types to get current generated types
    - For any table the feature will touch: verify exact column names and RLS status

    Produce a complete plan covering:
    - Files to create and modify (by layer: types → domain → data → store → hooks → UI → navigation → edge functions)
    - All TypeScript interfaces (no placeholders)
    - Data flow for each user action (UI → hook → domain → data → response, including error paths)
    - Zustand slice shape and which fields reset on logout
    - New navigation routes and param types
    - Edge function contracts (inputs, outputs, auth pattern)
    - Security threat model: trust boundaries, sensitive data, MUST/MUST-NOT requirements

    Store the complete plan to swarm memory:
    mcp__claude-flow__memory_store({ key: "plan", value: <plan>, swarmId })
    mcp__claude-flow__memory_store({ key: "threat_model", value: <threat_model>, swarmId })
  `
})
```

Wait for architect to complete before proceeding.

---

## Step 3 — Coder agent

Spawn the coder. Its job: read the architect's plan from memory and implement every file.

```javascript
mcp__claude-flow__agent_spawn({
  swarmId: "<swarmId>",
  type: "coder",
  name: "coder",
  task: `
    You are implementing a CoupleGoAI feature. Retrieve the plan first:
    mcp__claude-flow__memory_retrieve({ key: "plan", swarmId })
    mcp__claude-flow__memory_retrieve({ key: "threat_model", swarmId })

    Follow the plan exactly. Non-negotiable rules:

    ARCHITECTURE
    - UI → hooks → domain → data. No shortcuts.
    - UI never imports from src/data/ directly.
    - Screens and hooks never call supabase directly — always through src/data/.

    SUPABASE (see .claude/skills/supabase.md)
    - Never supabase.functions.invoke() — use plain fetch with explicit Authorization + apikey headers
    - Edge functions: verify_jwt = false in supabase/config.toml
    - Auth inside edge functions: fetch /auth/v1/user directly, never client.auth.getUser()
    - apikey header for edge function calls must use EXPO_PUBLIC_SUPABASE_ANON_KEY (eyJhbGci...), not publishable key
    - Service role client only after identity verified, never exposed to client

    TYPESCRIPT
    - strict: true. Zero any. Zero @ts-ignore. Explicit return types on all exports.
    - Discriminated unions for errors: { ok: true; data: T } | { ok: false; error: E }

    STYLING
    - className (NativeWind) for all static styling. No hardcoded hex. No inline radius/spacing.
    - Import tokens only from @/theme/tokens.

    CODE QUALITY
    - Functions ≤ 30 lines. Files ≤ 200 lines — split if needed.
    - Path aliases always (@/, @hooks/*, @store/*, etc.).
    - File naming: PascalCase.tsx for components/screens, camelCase.ts for hooks/utils.
    - No dead code, no commented-out code.

    SECURITY
    - Implement every MUST from the threat model. If a MUST is infeasible, stop and explain.
    - Never console.log tokens, PII, auth headers, or full payloads.
    - Validate all external input: API responses, QR payloads, deep link params.
    - Generic error messages only — no stack traces, internal IDs, or token fragments.

    TESTS
    - Unit tests for all domain logic in src/domain/<feature>/__tests__/

    After all files are written, store a summary:
    mcp__claude-flow__memory_store({ key: "implementation_summary", value: <summary>, swarmId })
    Summary must list: files created, files modified, security MUSTs addressed, how to test manually.
  `
})
```

Wait for coder to complete before proceeding.

---

## Step 4 — Reviewer agent

Spawn the reviewer. Its job: verify the implementation against all skill rules and run type checks.

```javascript
mcp__claude-flow__agent_spawn({
  swarmId: "<swarmId>",
  type: "reviewer",
  name: "reviewer",
  task: `
    You are reviewing a CoupleGoAI feature implementation. Retrieve context first:
    mcp__claude-flow__memory_retrieve({ key: "plan", swarmId })
    mcp__claude-flow__memory_retrieve({ key: "threat_model", swarmId })
    mcp__claude-flow__memory_retrieve({ key: "implementation_summary", swarmId })

    Read every file listed in the implementation summary.

    Check against each skill file in .claude/skills/:

    SUPABASE CHECKS (.claude/skills/supabase.md)
    - No supabase.functions.invoke() anywhere in client code
    - Every edge function has verify_jwt = false in supabase/config.toml
    - Auth in edge functions uses /auth/v1/user fetch, not client.auth.getUser()
    - apikey header uses EXPO_PUBLIC_SUPABASE_ANON_KEY, not publishable key
    - Service role client only used after identity verified

    REACT NATIVE CHECKS (.claude/skills/react-native.md)
    - No hardcoded hex values in components
    - No StyleSheet.create with color values — tokens only
    - No inline anonymous functions in JSX list renderers
    - Loading + error states present in every user-facing flow
    - Navigation uses typed route params, not string literals
    - KeyboardAvoidingView used correctly where keyboard appears

    ARCHITECTURE CHECKS
    - UI → hooks → domain → data boundary not violated
    - No direct supabase calls from screens or components
    - Zustand selectors used (never full store destructure)
    - React.memo on list items and expensive subtrees

    SECURITY CHECKS
    - Every MUST from threat model addressed
    - No console.log with tokens/PII
    - All external input validated
    - Error messages generic

    CODE QUALITY
    - TypeScript strict: zero any, zero @ts-ignore
    - Functions ≤ 30 lines, files ≤ 200 lines
    - Path aliases used everywhere

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

Retrieve and surface the final outputs:

```javascript
mcp__claude-flow__memory_retrieve({ key: "implementation_summary", swarmId })
mcp__claude-flow__memory_retrieve({ key: "review", swarmId })
```

Report to user:
1. What was built (one sentence)
2. Files created / modified (by layer)
3. Security MUSTs satisfied
4. Review result (pass / issues found)
5. Manual test steps
