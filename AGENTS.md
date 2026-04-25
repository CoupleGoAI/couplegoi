# CoupleGoAI Agent Instructions

## Read Order

1. `CLAUDE.md` for project architecture, product constraints, and security rules.
2. `agent-orchestration.md` for shared skill-routing and context-economy rules.
3. `codex.md` for Codex-specific execution defaults.

## Shared Skills

Prefer the smallest matching skill set from `.agents/skills/` instead of reloading broad project context.

- `react-native` for Expo, React Native, navigation, Zustand, Reanimated, and screen-level work.
- `frontend-design` for UI direction, visual polish, layout, motion, and presentation quality.
- `supabase-postgres-best-practices` for SQL, schema, indexes, RLS, and query performance.
- `find-skills` only when the user explicitly asks to discover or install more skills.
- `commit-slices` only when the user explicitly asks to split the diff into coherent commits.

## Context Economy

This repo treats context as a scarce resource.

- Use `symdex` to find symbols, call sites, and narrow the file set before reading large surfaces.
- Use `lean-ctx` to compress long docs, diffs, and exploration notes into a smaller working set.
- Use `caveman` for repo archaeology when the task spans multiple features or historical patterns.
- Do not load every skill or every large file up front. Route to the minimal relevant context first.

## Non-Negotiables

- TypeScript strict mode. No `any`. No `@ts-ignore`. No `as unknown as`.
- Functional components only.
- Use path aliases, not deep relative imports.
- Use MCP to inspect live Supabase state before schema or query changes.
- Ship the smallest correct diff. No unrelated refactors.

## Architecture — enforced boundaries

Dependency direction: `UI (screens/components) → hooks → domain → data`

- UI must **never** import from `src/data/` or call `supabase.*` directly.
- Hooks orchestrate domain + data and expose results to UI.
- No circular imports.

## Supabase rules (MUST)

- **Never** `supabase.functions.invoke()` — use plain `fetch()` with explicit `Authorization` and `apikey` headers.
- `verify_jwt = false` in `supabase/config.toml` — project uses ES256.
- Verify JWT in edge functions via `/auth/v1/user` REST call, never `client.auth.getUser()`.
- **Never trust a client-supplied user ID.** Derive identity from the verified JWT only.
- DB reads/writes: use `supabaseQuery(() => supabase.from(...))` from `src/data/apiClient.ts`.

## Security & privacy (MUST — stop and flag if violated)

- Secrets → `expo-secure-store` only. Never AsyncStorage, never MMKV for secrets.
- Never `console.log` tokens, passwords, session data, or auth headers.
- Validate all external input: API responses, route params, push payloads, deep link params.
- User-facing error messages must be generic — no stack traces, internal IDs, or token fragments.
- Wipe all sensitive state on logout: `store.reset()` + full secure storage clear.

## After every implement or modify task

Run the security-reviewer agent on all changed files before reporting the task complete.
Return a `PASS / WARN / BLOCK` verdict with specific findings.
