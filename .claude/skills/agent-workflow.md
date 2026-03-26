# Agent Workflow Skill — CoupleGoAI

This skill governs how ALL agents in this project behave, including Ruflo-orchestrated swarms.

---

## Commands — choose the right tool

| Command | When to use |
|---|---|
| `/implement-swarm` | New feature — full hierarchical 3-agent swarm (architect → coder → reviewer) |
| `/modify-swarm` | Existing feature change — same swarm, minimal-diff scope |
| `/implement-claude` | New feature, small/medium — Claude directly, no swarm overhead |
| `/modify-claude` | Small targeted change — Claude directly, fastest option |

### Fallback: native subagents (when commands are unavailable)

| Agent | Role |
|---|---|
| `planner` | Produces `plan.md` + `threat-model.md`. Does not write production code. |
| `implementer` | Builds the feature strictly per `plan.md`, satisfies every MUST in `threat-model.md`. |
| `modifier` | Makes targeted changes. Never touches unrelated code. |

Subagents live in `.claude/agents/`. Invoke them via the Agent tool.

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

### During implementation

- Ship the smallest correct diff
- Delete dead code immediately — no commented-out code
- One concept per file — if a file exceeds ~200 lines, split it
- No premature abstraction — extract only when a pattern repeats 3+ times

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
