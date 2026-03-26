# CoupleGoAI — Claude Code Instructions

You are pair-coding on **CoupleGoAI**: a premium Gen Z couples mobile app.

---

## Stack

| Layer      | Tech                                                                 |
| ---------- | -------------------------------------------------------------------- |
| Framework  | Expo ~54 (managed workflow)                                          |
| Runtime    | React 19 · React Native 0.81 (New Architecture ready)                |
| Language   | TypeScript 5 strict (`"strict": true`, zero `any`)                   |
| Navigation | React Navigation 6 (native-stack + bottom-tabs)                      |
| State      | Zustand 5 — thin slices, selectors, no providers                     |
| Animation  | Reanimated 4 + Gesture Handler 2 (worklet-first)                     |
| Styling    | NativeWind 4 (primary) · StyleSheet.create (dynamic/exceptions only) |
| Assets     | expo-linear-gradient · expo-blur · @expo/vector-icons                |
| QR         | react-native-qrcode-svg + expo-camera                                |
| Haptics    | expo-haptics                                                         |

Path aliases (tsconfig `paths`, mirrored in babel `module-resolver`):

```
@/*           → src/*
@theme        → src/theme/index
@components/* → src/components/*
@screens/*    → src/screens/*
@navigation/* → src/navigation/*
@hooks/*      → src/hooks/*
@store/*      → src/store/*
@types/*      → src/types/*
@utils/*      → src/utils/*
```

Always use aliases in imports. Never use deep relative paths (`../../..`).

---

## Skills — detailed rules live here

Before writing any code, load the relevant skill file:

- `.claude/skills/supabase.md` — all Supabase, edge functions, JWT, MCP schema inspection
- `.claude/skills/react-native.md` — Expo/RN conventions, Zustand, Reanimated, styling
- `.claude/skills/agent-workflow.md` — subagents, Ruflo pipeline, output format

---

**Do not create or update any documentation files unless explicitly asked.** This includes `docs/`, `README.md`, and any `.md` files. Write code only.

---

## Agentic workflow

Choose the right command for the job:

| Command             | When to use                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| `/implement-swarm`  | New feature — full hierarchical 3-agent swarm (architect → coder → reviewer) |
| `/modify-swarm`     | Existing feature change — same swarm, minimal-diff scope                     |
| `/implement-claude` | New feature, small/medium — Claude directly, no swarm overhead               |
| `/modify-claude`    | Small targeted change — Claude directly, fastest option                      |

### Fallback: native subagents (when commands are unavailable)

| Agent         | Role                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| `planner`     | Produces `plan.md` + `threat-model.md`. Does not write production code.               |
| `implementer` | Builds the feature strictly per `plan.md`, satisfies every MUST in `threat-model.md`. |
| `modifier`    | Makes targeted changes. Never touches unrelated code.                                 |

Subagents live in `.claude/agents/`. Invoke them via the Agent tool.

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

## Security & privacy (non-negotiable)

- **Never** log secrets, tokens, auth headers, PII, or full request/response bodies.
- **Validate** at trust boundaries: deep links, QR payloads, push data, API responses, user input.
- Tokens/secrets → `expo-secure-store` (never AsyncStorage, never MMKV for secrets).
- **Least privilege**: request only permissions needed, gate by explicit user intent.
- Wipe all sensitive state on logout (`store.reset()` + secure storage clear).
- Real-time sync is **untrusted input** — validate shapes, verify ownership.
- Error messages must **never** contain stack traces, internal IDs, or token fragments.

If a security requirement conflicts with a feature constraint, **stop and propose** a safe alternative.

---

## Reliability & quality

- Network calls: typed errors (`Result<T, E>` or discriminated unions), timeouts, retries only for idempotent GETs.
- Every user-facing flow: loading → content → error → empty states.
- Zero unhandled promises — always `catch` or `try/catch`.
- Tests for domain logic (pure functions, use-cases).
- `ErrorBoundary` at screen level for graceful crash recovery.

### Code minimalism

- Ship the smallest correct diff.
- Delete dead code immediately. No commented-out code.
- One concept per file. If a file exceeds ~200 lines, split.
- Prefer composition over configuration. Prefer explicit over clever.
- No premature abstraction — extract only when a pattern repeats 3+ times.

---

## Brand & UI system

Tone: warm, romantic, premium, modern, slightly playful — never childish. Minimal cognitive load.

- `src/theme/tokens.ts` is the **only** theme file — all colors, radii, spacing, shadows, typography, gradients.
- All components import styling values exclusively from `@/theme/tokens`.
- Do NOT invent new colors. If a new token is needed, add it to `tokens.ts` and `tailwind.config.js` first.
- Pill-shaped CTAs via `GradientButton`. Card-based layout via `Card`.
- Motion: subtle `withTiming`/`withSpring`. Never jarring. Never blocks interaction.

### Token palette

| Token             | Value                                  |
| ----------------- | -------------------------------------- |
| `background`      | `#ffffff`                              |
| `foreground`      | `#1e1230`                              |
| `foregroundMuted` | `#42335a`                              |
| `gray`            | `#8a7b9e`                              |
| `primary`         | `#f48ba6`                              |
| `primaryLight`    | `#f9b5c8`                              |
| `accent`          | `#cc7be8`                              |
| `accentLight`     | `#dda8f0`                              |
| `muted`           | `#fef0f4`                              |
| `accentSoft`      | `#f5eafa`                              |
| `borderDefault`   | soft neutral derived from `foreground` |

Radii: `radius=20`, `radiusMd=16`, `radiusSm=12`, `radiusFull=999`.
Spacing: `xs/sm/md/lg/xl/2xl`. Layout: `screenPaddingH/screenPaddingV/cardPadding`.
Tailwind: `bg-background`, `text-foreground`, `text-foregroundMuted`, `bg-primary`, `bg-accent`, `bg-muted`, `rounded-md`, `rounded-xl`, `rounded-full`.

---

## Output expectations (every meaningful change)

1. **What** changed and **why** (one sentence)
2. **Files** changed (grouped by layer)
3. **Security** notes (what you validated)
4. **Tests** added/updated
5. **Manual test** steps (how to verify on device/simulator)
