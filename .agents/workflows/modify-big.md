---
name: modify-big
description: Make a substantial or cross-cutting change to existing CoupleGoAI code using Antigravity's native multiagent workflow with strong shared context and explicit handoffs.
---

# /modify-big — Native Multiagent Modification

**Change:** $ARGUMENTS

---

## Goal

Use Antigravity's own best available multiagent techniques to deliver a large existing-code change without any external orchestration dependency.

The main Antigravity session is the integrator. Subagents support it; they do not replace it.

---

## Step 1 — Gather context before spawning agents

Read these first:

1. `ANTIGRAVITY.md`
2. `.antigravity/skills/supabase.md`
3. `.antigravity/skills/react-native.md`
4. `.antigravity/skills/agent-workflow.md`
5. Relevant feature docs if they exist
6. All currently impacted source files
7. Adjacent files needed to understand call sites, data flow, and invariants

If the change touches the database or edge functions, inspect live schema before planning:

```javascript
mcp__supabase__list_tables({ schemas: ["public"], verbose: true })
mcp__supabase__generate_typescript_types({})
```

Do not delegate based on guesses. Read enough first that every subagent gets grounded context.

---

## Step 2 — Write the shared brief

Before spawning any subagent, write a concise shared brief in the conversation that includes:

- objective and desired end state
- current behavior and why it must change
- exact files and symbols already inspected
- scope, non-goals, and invariants that must hold
- security, auth, data, and migration constraints
- validation plan (`tsc`, tests, manual checks)
- proposed workstreams and explicit file ownership

This brief is the source of truth for every handoff. Do not rely on implicit memory.

---

## Step 3 — Use native subagents deliberately

Use only the native subagents in `.antigravity/agents/`:

- `planner` for decomposition, risk review, and ownership planning
- `modifier` for scoped edits to existing files
- `implementer` only when the change requires new modules or substantial new code owned separately from existing-file edits

Recommended flow:

1. Run `planner` first when scope crosses multiple layers or is still fuzzy.
2. Split the work into disjoint write scopes.
3. Run one or more `modifier` agents in parallel only when their write scopes do not overlap.
4. If new modules are needed, give `implementer` ownership of only those new files or clearly separated file groups.
5. Keep the main Antigravity session responsible for conflict resolution, integration, and final verification.

Never use any external orchestration layer or hidden memory layer.

---

## Step 4 — Handoff quality rules

Every subagent handoff must include:

- the full shared brief
- exact owned file paths
- specific symbols or call sites to inspect
- invariants and non-goals
- required validation steps
- required response format: assumptions, files changed, risks, follow-ups

When a subagent returns:

- re-read the touched files yourself
- integrate only after checking for drift against the shared brief
- propagate any new constraint to the remaining agents immediately

Favor fewer, better-grounded agents over many shallow ones.

---

## Step 5 — Implement and integrate

All rules from `ANTIGRAVITY.md` and the skill files apply without exception.

Key non-negotiables:

**Architecture**
- UI → hooks → domain → data. No shortcuts.
- Keep ownership clear when multiple agents edit adjacent layers.

**Supabase**
- Never `supabase.functions.invoke()` — use plain `fetch`
- Edge functions: `verify_jwt = false`, auth via `/auth/v1/user`
- `apikey` header must use `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Service role client only after identity verified

**TypeScript**
- `strict: true`. Zero `any`. Zero `@ts-ignore`. Explicit return types.

**Code quality**
- Ship the smallest correct diff for the requested outcome
- Remove dead code left behind by the change
- Do not refactor unrelated files

**Security**
- Re-verify every touched trust boundary
- Never log tokens, PII, or full payloads
- Keep user-facing errors generic

---

## Step 6 — Verify aggressively

Run:

```bash
npx tsc --noEmit
npx jest --passWithNoTests
```

Add targeted manual checks for the changed flows.

Do not report success until the integrated result has been verified from the main session.

---

## Step 7 — Report

1. What changed and why (one sentence)
2. Files modified / created / deleted
3. How the work was split across native subagents
4. Security notes and re-verified invariants
5. Tests added or updated
6. Manual test steps
