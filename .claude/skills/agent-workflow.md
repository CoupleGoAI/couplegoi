# Agent Workflow Skill — Multiagent Handoff Rules

Load this skill only when using native subagents (`planner`, `implementer`, `modifier`).
All other workflow rules live in `CLAUDE.md` — do not duplicate them here.

---

## Shared Brief Format

When using subagents, main Claude session is integrator. Gather context first, then pass a shared brief to every subagent:

- Objective and desired end state
- Current behavior and relevant background
- Exact file paths and symbols already inspected
- Scope, non-goals, and invariants that must not change
- Security or data-integrity constraints
- Validation plan (`tsc`, tests, manual checks)
- Explicit file ownership for each subagent

---

## Parallel Work

- Only parallelize agents with disjoint write ownership
- Give each agent full shared brief plus its owned files
- Each agent reports assumptions, changed files, risks, and cross-agent impacts
- Re-read every returned diff before integration — do not blindly trust handoffs

## Sequential Work

- `planner` first when scope unclear or change crosses multiple layers
- `implementer` for new modules or feature work
- `modifier` for existing-code changes
- `security-reviewer` **always last** — pass it the list of changed files; it returns PASS / WARN / BLOCK
- Main Claude performs final integration, verification, and user-facing report

## Security reviewer — mandatory final step

After every `implementer` or `modifier` run, invoke the `security-reviewer` agent before reporting the task complete.

Brief format for the security-reviewer:
```
Changed files:
- src/path/to/File.tsx
- src/path/to/hook.ts
- supabase/functions/my-fn/index.ts

Task context: [one sentence describing what was implemented]
```

The security-reviewer returns a PASS / WARN / BLOCK verdict.
- **PASS** — report the task complete.
- **WARN** — include the warnings in your user-facing report; task may complete.
- **BLOCK** — do not report the task complete; fix the findings and re-run the reviewer.
