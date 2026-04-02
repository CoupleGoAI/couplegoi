---
name: agent-workflow
description: agent-workflow skill
---

# Agent Workflow Skill — CoupleGoAI

This skill governs how ALL agents in this project behave using Antigravity's native workflow only.

---

## Commands — choose the right tool

| Command | When to use |
|---|---|
| `/implement` | New feature work. Stay in the main session for focused scope; use native subagents when the work spans multiple layers or needs parallel exploration. |
| `/modify-small` | Small targeted change. Stay in the main session and ship the smallest correct diff. |
| `/modify-big` | Large or cross-cutting existing-feature change. Use Antigravity-native multiagent workflow with structured handoffs and explicit file ownership. |

### Native subagents

| Agent | Role |
|---|---|
| `planner` | Produces a concise execution brief: scope, owned files, risks, validation plan. Does not write production code. |
| `implementer` | Builds new feature code or new modules from a structured brief and verifies the result. |
| `modifier` | Makes scoped edits to existing code from a structured brief. Never touches unrelated code. |

Subagents live in `.antigravity/agents/`. Use them through Antigravity's native Agent/Task tooling only.

---

## Native multiagent rules

When using subagents, the main Antigravity session is the integrator. It must gather context first, then pass a shared brief to every subagent instead of relying on implicit memory.

Every shared brief must include:

- Objective and desired end state
- Current behavior and relevant background
- Exact file paths and symbols already inspected
- Scope, non-goals, and invariants that must not change
- Security or data-integrity constraints
- Validation plan (`tsc`, tests, manual checks)
- Explicit file ownership for each subagent

For parallel work:

- Only parallelize agents with disjoint write ownership
- Give each agent the full shared brief plus its owned files
- Require each agent to report assumptions, changed files, risks, and anything that may affect another agent
- Re-read every returned diff before integration; do not blindly trust handoffs

For sequential work:

- Use `planner` first when scope is unclear or the change crosses multiple layers
- Use `implementer` for new modules or feature work
- Use `modifier` for existing-code changes
- Main Antigravity performs the final integration, verification, and user-facing report

---

If docs exist for a feature, **do not contradict them**. Update docs only when asked
or when implementation reality requires it.

**Do not create or update any documentation files unless explicitly asked.**
This includes `docs/`, `README.md`, and any `.md` files. Write code only.

---

## Agent Behavior Rules

### Before starting any task

- Read the relevant feature docs if they exist
- Use MCP tools to inspect live state (Supabase schema, etc.) — do not rely on memory
- State your plan before writing any code
- Do not create or update documentation unless the user explicitly asks for it

### During implementation

- Ship the smallest correct diff
- Delete dead code immediately — no commented-out code
- One concept per file — if a file exceeds ~200 lines, split it
- No premature abstraction — extract only when a pattern repeats 3+ times
- Keep handoffs tight: mention exact files, invariants, and validation requirements

### After implementation

- Verify the change works as intended (re-inspect via MCP for schema changes)
- State what changed, why, and any security notes
- List manual test steps

---

## Output Format (every meaningful change)

1. **What** changed and **why** (one sentence)
2. **Files** changed (grouped by layer)
3. **Security** notes (what was validated)
4. **Tests** added/updated
5. **Manual test** steps (how to verify on device/simulator)

---

## Constraints

- Functional components + hooks only — no class components
- All new files must use path aliases (never deep relative paths)
- No large refactors unless explicitly requested
- Do not add dependencies without: why, alternatives considered, bundle impact
- If a security requirement conflicts with a feature constraint — stop and propose a
  safe alternative, do not proceed

---

## Layer Boundaries (enforced)

```
UI (screens/components) → hooks → domain → data (interfaces)
                                          ↘ types/theme/utils (shared)
```

- UI must never call fetch / storage / realtime directly
- Domain contains business logic, depends on interfaces — not implementations
- Data layer implements interfaces (API clients, persistence, sync)
- Hooks orchestrate: compose domain + data, expose to UI
- No circular imports. No barrel re-exports beyond `types/index.ts`
