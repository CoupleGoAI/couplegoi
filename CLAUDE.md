# CoupleGoAI — Claude Code Instructions

You are pair-coding on **CoupleGoAI**: a premium Gen Z couples mobile app.

---

## Stack

Expo 54 managed · React Native 0.81 · TypeScript strict · Zustand · Reanimated 4 · NativeWind 4. Full stack in `package.json`. Path aliases in `tsconfig.json` — always use `@/` aliases, never deep relative paths.

---

## Skills — detailed rules live here

Before writing any code, load the relevant skill file:

- `agent-orchestration.md` — shared skill-routing and context-economy policy for Claude, Codex, and Cursor
- `.agents/skills/react-native/SKILL.md` — repo-local React Native router skill that layers on top of the installed React Native skill
- `.agents/skills/frontend-design/SKILL.md` — use for screen design, visual polish, motion, and layout work
- `.agents/skills/supabase-postgres-best-practices/SKILL.md` — use for SQL, indexes, RLS, and schema-performance decisions
- `.claude/skills/supabase.md` — all Supabase, edge functions, JWT, MCP schema inspection
- `.claude/skills/react-native.md` — Expo/RN conventions, Zustand, Reanimated, styling
- `.claude/skills/agent-workflow.md` — command selection, native subagent handoffs, output format
- `.claude/skills/save-changes.md` — safe git save flow that always uses branch `vanya`, never `main`

Load the smallest matching set. Do not pull every skill into context when one or two are enough.

---

**Do not create or update any documentation files unless explicitly asked.** This includes `docs/`, `README.md`, and any `.md` files. Write code only.

---

## Agentic workflow

This repo favors capability with low context usage:

- Prefer repo-local skills over repeating long project instructions.
- Use `symdex` MCP to locate symbols and entry points before reading large file sets.
- Use `caveman` when the task needs broad repo archaeology across multiple surfaces.

Choose the right command for the job:

| Command             | When to use                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| `/implement`        | New feature work — direct by default, native subagents when scope justifies it |
| `/modify-small`     | Small targeted change — Claude directly, fastest minimal-diff path             |
| `/modify-big`       | Large or cross-cutting change — Claude-native multiagent workflow with explicit handoffs |
| `/save-changes`     | Stage relevant files, switch to `vanya`, commit cleanly, and push without touching `main` |

### Native subagents

| Agent         | Role                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| `planner`     | Produces a concise execution brief: scope, owned files, risks, validation plan. Does not write production code. |
| `implementer` | Builds new feature code or new modules from a structured brief, then verifies the result. |
| `modifier`    | Makes scoped edits to existing code from a structured brief. Never touches unrelated code. |

Subagents live in `.claude/agents/`. Use them through Claude's native Agent/Task tooling only.

---

## Architecture — strict layered boundaries

```
src/
  components/ui/   ← Pure presentational (props in, JSX out)
  screens/         ← Screen-level composition, navigation-aware
  hooks/           ← Orchestration hooks (bridge UI ↔ domain)
  store/           ← Zustand slices (thin, typed, action-only)
  domain/          ← Business rules, pure functions, use-cases
  data/            ← API clients, persistence, realtime adapters
  types/           ← Shared type definitions, discriminated unions
  theme/           ← Design tokens — tokens.ts is the SINGLE source of truth
  navigation/      ← Navigators, route types, deep link config
  utils/           ← Pure helpers (no side-effects)
```

**Dependency direction (enforced):**

```
UI (screens/components) → hooks → domain → data (interfaces)
                                          ↘ types/theme/utils (shared)
```

- UI must **never** call fetch / storage / realtime directly.
- Domain depends on interfaces — not implementations.
- Hooks orchestrate: compose domain + data, expose to UI.
- No circular imports. No barrel re-exports beyond `types/index.ts`.

---

## Security & privacy

Global rules in `~/.claude/CLAUDE.md` apply. Project-specific additions:

- Tokens/secrets → `expo-secure-store` (never AsyncStorage, never MMKV for secrets).
- Wipe all sensitive state on logout (`store.reset()` + secure storage clear).
- Real-time sync is **untrusted input** — validate shapes, verify ownership.
- If a security requirement conflicts with a feature constraint, **stop and propose** a safe alternative.
- **Every implement or modify workflow ends with a `security-reviewer` agent pass before the user-facing report.** A BLOCK verdict must be resolved before reporting complete. See `.claude/skills/agent-workflow.md`.

---

## Reliability & quality

- Typed errors (`Result<T, E>` or discriminated unions), timeouts, retries only for idempotent GETs.
- Every user-facing flow: loading → content → error → empty states.
- `ErrorBoundary` at screen level for graceful crash recovery.

---

## Brand & UI system

- `src/theme/tokens.ts` is the **only** theme file — all colors, radii, spacing, shadows, typography, gradients.
- All components import styling values exclusively from `@/theme/tokens`.
- Do NOT invent new colors. If a new token is needed, add it to `tokens.ts` and `tailwind.config.js` first.
- Pill-shaped CTAs via `GradientButton`. Card-based layout via `Card`.
- Motion: subtle `withTiming`/`withSpring`. Never jarring. Never blocks interaction.

Brand tone, voice, and visual polish rules live in `.agents/skills/frontend-design/SKILL.md` — load that before UI work.

---

## Compaction guidance

When compacting this conversation, preserve:
- Full list of modified file paths and the reason each was touched.
- Outstanding TODOs and the active branch (default `vanya`).
- Test/lint/typecheck commands run + their pass/fail status.
- Any open security questions or schema decisions.
Drop: tool-call transcripts, file reads already reflected in current state, exploratory chatter.

---

## Output expectations

Global format in `~/.claude/CLAUDE.md` applies. Add **tests added/updated** when applicable.
