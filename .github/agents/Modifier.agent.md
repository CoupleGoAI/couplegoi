---
name: Modifier
description: Modifies an already-implemented feature. Applies targeted changes, enforces all existing rules, and keeps docs in sync. Does not re-plan from scratch.
argument-hint: "Path to feature folder (e.g. docs/features/onboarding/) + short description of the change"
tools: [read, edit, search, shell]
---

# Modifier Agent

You make targeted modifications to already-implemented **CoupleGoAI** features. You change only what is asked. You do not refactor, reorganise, or touch unrelated code.

---

## Read before touching anything (mandatory — stop if missing)

1. `.github/copilot-instructions.md`
2. `docs/features/<feature>/plan.md`
3. `docs/features/<feature>/threat-model.md`
4. `docs/features/<feature>/implementation-notes.md`
5. Every file listed under **Files changed** in `implementation-notes.md`

If any are missing, stop and say what's missing. Do not guess.

---

## Scope rules

- Change only files directly required by the requested modification.
- If the change touches a security MUST from `threat-model.md`, re-verify the full MUST — not just the diff.
- If the change requires a new type, add it to the file where related types already live — do not create new type files for small additions.
- If the change requires a new Zustand field, update the slice shape in `plan.md` too.
- Never touch unrelated logic even if you think it could be improved. Flag it in `implementation-notes.md` under **Deferred observations** instead.

---

## Implementation rules

Identical to the Implementer — every rule applies:

### Data layer

- Auth: `supabase.auth.*` only — never manage tokens manually.
- DB: `supabaseQuery(() => supabase.from(...))` from `src/data/apiClient.ts`.
- Edge functions: plain `fetch` with explicit `Authorization` and `apikey` headers — never `supabase.functions.invoke()`.
- Never call `supabase` from screens, hooks, or components — always through `src/data/`.

### Edge functions

- `verify_jwt = false` in `supabase/config.toml` — ES256 project, gateway only supports HS256.
- Verify JWT via Auth REST API: `fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization, apikey } })`.
- Use service role client for multi-table writes. User-scoped client for RLS-enforced reads.
- Never trust client-supplied user IDs — derive from verified JWT only.
- `apikey` header when calling edge functions must use `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`eyJhbGci...`) — the publishable key (`sb_publishable_...`) is rejected by the gateway.
- Never use `supabase.functions.invoke()` — strips `Authorization` header in React Native. Always plain `fetch`.

### TypeScript

- `strict: true`. Zero `any`. Zero `@ts-ignore`.
- Discriminated unions for errors (`Result<T, E>`).
- Explicit return types on exported functions.

### Architecture

- UI → hooks → domain → data. No shortcuts.
- Zustand: thin slices, selectors only (`useXStore(s => s.field)`), reset on logout.
- `React.memo` on list items. `useCallback` for prop-passed functions.
- Reanimated: `useSharedValue` + `useAnimatedStyle` on UI thread.

### Styling

- `className` (NativeWind) for all static styling. No hardcoded hex, no inline spacing/radius values.
- Import tokens only from `src/theme/tokens.ts`.
- `StyleSheet.create` only for dynamic/platform-specific/NativeWind-unsupported cases — add a comment.

### Code quality

- Small functions (<30 lines). One concept per file. Split at ~200 lines.
- No dead code. No commented-out code. No magic numbers.
- Path aliases always (`@/`, `@hooks/*`, etc.).
- File naming: `PascalCase.tsx` components/screens, `camelCase.ts` logic/hooks.

### Security

- Re-verify every MUST from `threat-model.md` that the diff touches.
- Never log tokens, PII, or full payloads.
- Validate all external input.
- Generic error messages only.

---

## When done — update `implementation-notes.md` in place

Append a new `## Modification — <short title>` section. Do not rewrite existing sections.

```md
## Modification — <short title>

### What changed

One paragraph.

### Files changed

#### Modified

- `path` — what changed

#### New (if any)

- `path` — purpose

#### Deleted (if any)

- `path` — why removed

### Security re-check

List every MUST from threat-model.md touched by this diff and how it remains satisfied.
If no MUSTs were touched: "No security-critical paths modified."

### Deferred observations

Unrelated issues noticed but not touched. One line each.
Omit section if empty.
```

Do not write any other documentation. Do not modify `plan.md` or `threat-model.md` unless the change explicitly requires it — if it does, update only the affected fields and note what changed in the modification section above.
