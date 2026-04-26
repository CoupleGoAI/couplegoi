# Local Supabase Collaboration Guide

This is the minimal workflow for two people working in this repo without stepping on each other in local Supabase.

## Source Of Truth

- Treat `supabase/schemas/` as the source of truth for database structure.
- Treat `supabase/migrations/` as generated history.
- Never hand-edit an old migration that has already been pulled by someone else.
- If a schema change is needed, update the relevant file in `supabase/schemas/`, then generate a new migration.

## Ownership Rule

For any branch, one person owns one Supabase surface at a time:

- DB schema and RLS: `supabase/schemas/*` and the new migration generated from it
- Edge functions: one function folder under `supabase/functions/<name>/`
- DB tests: `supabase/tests/**`

If both of you need the same surface, decide who lands first. Do not both edit the same schema file or function folder in parallel unless you explicitly coordinate it.

## Daily Flow

1. Pull latest changes before starting Supabase work.
2. Start local Supabase:

```bash
supabase start
```

3. If you pulled someone else’s migration or schema change, rebuild local DB before doing your own work:

```bash
supabase db reset
```

4. Make schema changes only in `supabase/schemas/`.
5. Generate a new migration:

```bash
supabase db diff -f <short_descriptive_name>
```

6. Run DB tests:

```bash
supabase test db
```

7. If you changed an edge function, serve or test it locally before pushing.

## Before You Commit

- Rebase or pull again if someone else merged Supabase changes while you were working.
- If there are incoming schema or migration changes, run `supabase db reset` again before generating anything new.
- Check that your diff contains:
  - the intended `supabase/schemas/*` edits
  - one new migration file
  - any matching test updates
- Check that your diff does not contain:
  - edits to old migration files
  - unrelated local state from `supabase/.temp/`
  - secrets from `supabase/functions/.env`

## Conflict Avoidance Rules

- Never generate a migration on top of stale local schema state.
- Never rename or rewrite a migration that another person may already have applied.
- Never mix unrelated schema work into one migration.
- Prefer small migrations. One logical DB change per migration is easier to rebase and review.
- If a migration conflict happens, keep both migrations when possible. Regenerate only your own migration, not your teammate’s.

## Team Agreement For Schema Changes

When either of you changes the database, post a short note in chat:

- what you changed
- which schema file you touched
- migration filename
- whether your teammate needs to run `supabase db reset`

Example:

```text
I changed `supabase/schemas/05_messages.sql`, generated `20260426143000_add_messages_retention.sql`, and you should run `supabase db reset` after pulling.
```

## Edge Functions

- Keep function changes isolated to the specific folder in `supabase/functions/`.
- If two people need the same function, sequence the work instead of parallel editing.
- This repo has `verify_jwt = false` for functions in `supabase/config.toml`, so do not casually change auth handling without coordinating.

## Fast Recovery

If your local Supabase gets weird after pulling:

```bash
supabase stop
supabase start
supabase db reset
supabase test db
```

If the problem started after both of you touched the same schema area, compare `supabase/schemas/*` first and regenerate only the migration that belongs to the later branch.

## Simple Rule Of Thumb

If you are changing Supabase:

- edit schema files, not old migrations
- generate one new migration
- reset local after pulling teammate DB changes
- run `supabase test db`
- announce the migration in chat
