# CoupleGoAI — GitHub Copilot Instructions

You are pair-coding on **CoupleGoAI**: a premium Gen Z couples mobile app.

---

## Stack (locked — do not upgrade without justification)

| Layer | Tech |
|-------|------|
| Framework | Expo ~54 (managed workflow) |
| Runtime | React 19 · React Native 0.81 (New Architecture ready) |
| Language | TypeScript 5 strict (`"strict": true`, zero `any`) |
| Navigation | React Navigation 6 (native-stack + bottom-tabs) |
| State | Zustand 5 — thin slices, selectors, no providers |
| Animation | Reanimated 4 + Gesture Handler 2 (worklet-first) |
| Styling | StyleSheet.create — co-located, no runtime overhead |
| Assets | expo-linear-gradient · expo-blur · @expo/vector-icons |
| QR | react-native-qrcode-svg + expo-camera |
| Haptics | expo-haptics |

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

## 0 · Source of truth — read before touching code

1. `docs/features/<feature>/spec.md` — requirements
2. `docs/features/<feature>/plan.md` — architecture
3. `docs/features/<feature>/threat-model.md` — security rules
4. Existing code patterns in `src/`

If docs exist for a feature, **do not contradict them**. Update docs only when asked or when implementation reality requires it.

### Feature creation entry point

To start a new feature, use the **Orchestrator agent** (`@Orchestrator`).
It will scaffold `docs/features/<feature>/`, create or validate `spec.md` (from `docs/template-spec.md`), then drive: Architect → Security → Implementer → Reviewer.

---

## 1 · Architecture — strict layered boundaries

```
src/
  components/ui/   ← Pure presentational (props in, JSX out)
  screens/         ← Screen-level composition, navigation-aware
  hooks/           ← Orchestration hooks (bridge UI ↔ domain)
  store/           ← Zustand slices (thin, typed, action-only)
  domain/          ← Business rules, pure functions, use-cases
  data/            ← API clients, persistence, realtime adapters
  types/           ← Shared type definitions, discriminated unions
  theme/           ← Design tokens (colors, typography, spacing, radii, shadows)
  navigation/      ← Navigators, route types, deep link config
  utils/           ← Pure helpers (no side-effects)
```

**Dependency direction (enforced):**

```
UI (screens/components) → hooks → domain → data (interfaces)
                                          ↘ types/theme/utils (shared)
```

Rules:
- UI must **never** call fetch / storage / realtime directly.
- Domain contains business logic, depends on interfaces — not implementations.
- Data layer implements interfaces (API clients, persistence, sync).
- Hooks orchestrate: compose domain + data, expose to UI.
- No circular imports. No barrel re-exports beyond `theme/index.ts` and `types/index.ts`.

### Zustand patterns

```ts
// Thin slices — actions co-located, selectors external
export const useXStore = create<XStore>((set, get) => ({ ... }));

// ALWAYS use selectors — never destructure the whole store
const value = useXStore((s) => s.value);

// Derived state — compute in selectors or hooks, not in store
```

### Component patterns

```ts
// Functional only. No class components. No default exports.
export const MyComponent: React.FC<Props> = React.memo(({ ... }) => { ... });

// Co-locate styles at bottom of file
const styles = StyleSheet.create({ ... });
```

---

## 2 · Security & privacy (non-negotiable)

- **Never** log secrets, tokens, auth headers, PII, or full request/response bodies.
- **Validate** at trust boundaries: deep links, QR payloads, push data, API responses, user input.
- Tokens/secrets → `expo-secure-store` (never AsyncStorage, never MMKV for secrets).
- **Least privilege**: request only permissions needed, gate by explicit user intent.
- Handle session expiry explicitly; **wipe** all sensitive state on logout (`store.reset()` + secure storage clear).
- Real-time sync is **untrusted input**: validate shapes with runtime checks, verify turn ownership, room membership.
- Error messages shown to users must **never** contain stack traces, internal IDs, or token fragments.

If a security requirement conflicts with a feature constraint, **stop and propose** a safe alternative.

---

## 3 · Reliability & quality

- Network calls: typed errors (`Result<T, E>` or discriminated unions), timeouts, retries only for idempotent GETs.
- Every user-facing flow: loading → content → error → empty states.
- Zero unhandled promises — always `catch` or `try/catch`.
- Tests for domain logic (pure functions, use-cases). Add seams/hooks for integration/e2e.
- Prefer `ErrorBoundary` at screen level for graceful crash recovery.

### Code minimalism

- Ship the smallest correct diff.
- Delete dead code immediately. No commented-out code.
- One concept per file. If a file exceeds ~200 lines, split.
- Prefer composition over configuration. Prefer explicit over clever.
- No premature abstraction — extract only when a pattern repeats 3+ times.

---

## 4 · Performance (React Native specific)

- **JS thread**: never block with heavy sync computation. Offload to worklets or async.
- **Re-renders**: use `React.memo` on list items and expensive subtrees. Use stable callbacks (`useCallback` with correct deps).
- **Lists**: `FlatList` with `keyExtractor`, `getItemLayout` when heights are fixed, `windowSize` tuning.
- **Animations**: Reanimated `useAnimatedStyle` + `useSharedValue` — run on UI thread. Never animate with `setState`.
- **Images**: use cached image libraries, specify dimensions, avoid layout thrashing.
- **Bundle**: no dynamic `require()`. Tree-shake via named exports. Lazy-load heavy screens with navigation lazy.
- **Startup**: minimize root-level providers. Defer non-critical init with `InteractionManager.runAfterInteractions`.

---

## 5 · Brand & UI system

Tone: warm, romantic, premium, modern, slightly playful — never childish. Minimal cognitive load.

Visual system (references `src/theme/`):
- Pastel blush/lavender backgrounds from `palette.pink50`–`pink100`, `lavender50`–`lavender100`
- Gradients: `gradients.primary` (pink→lavender), used sparingly on CTAs
- Editorial serif for emotional headings (`fontFamilies.serif`), clean sans for body (`fontFamilies.sans`)
- Pill-shaped CTAs via `GradientButton`. Card-based layout via `Card` component.
- Generous spacing (`spacing.lg`+), thumb-friendly targets (min 44pt), soft corners (`radii.lg`+)
- Motion: subtle `withTiming`/`withSpring` (scale, fade, slide). Never jarring. Never blocks interaction.

---

## 6 · Feature UX baselines

**Onboarding**: 4–5 screens max. QR generate → scan → confirmed. Minimal tutorial.
**Home**: 2 primary CTAs (AI Chat, Truth or Dare). Optional: partner status, streak.
**AI Chat**: Clean, large typography, generous spacing. User/partner visually distinct. AI suggestions. Edit sent message.
**Truth or Dare**: Categories (romantic/spicy/fun). Card-based, turn-based, real-time sync. Subtle animations.

---

## 7 · Constraints

- Functional components + hooks only.
- Prefer existing libraries/patterns. Do not add dependencies without: **why**, alternatives considered, bundle impact.
- No large refactors unless explicitly requested.
- All new files must use path aliases.
- File naming: `PascalCase.tsx` for components/screens, `camelCase.ts` for logic/utils/hooks.

---

## 8 · Output expectations (every meaningful change)

1. **What** changed and **why** (one sentence)
2. **Files** changed (grouped by layer)
3. **Security** notes (what you validated)
4. **Tests** added/updated
5. **Manual test** steps (how to verify on device/simulator)
