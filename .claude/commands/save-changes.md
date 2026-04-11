---
name: save-changes
description: Stage the relevant CoupleGoAI changes, switch to branch vanya, infer intent when needed, and commit and push only if the work is meaningful. Never commit to main.
---

# /save-changes — Save Work Safely

**Commit intent:** `$ARGUMENTS` if provided, otherwise infer it from the diff.

---

## Step 1 — Load context

Read these before doing any git action:

1. `CLAUDE.md`
2. `.claude/skills/agent-workflow.md`
3. `.claude/skills/save-changes.md`

Then inspect the repo state:

```bash
git status --short
git branch --show-current
git fetch origin
git diff --stat
```

---

## Step 2 — Enforce the branch

The only valid branch for this command is `vanya`.

Run:

```bash
git switch vanya || git switch -c vanya --track origin/vanya || git switch -c vanya
```

Rules:

- Never commit on `main`
- Never push `main`
- If branch switching fails, stop and explain exactly why
- Do not silently pick another branch

---

## Step 3 — Inspect intent and decide whether a commit is needed

If `$ARGUMENTS` is empty, infer the likely intent from the changed files and diff.

Inspect the actual changes before staging:

```bash
git diff -- <candidate-file>
git diff --cached
```

Rules:

- The command must work with no arguments
- Infer one coherent task from the diff when possible
- If the changes are trivial, accidental, or clearly unfinished, do not commit
- If there is no meaningful work to save, stop and explain why

Examples of changes that may be too small to commit:

- whitespace-only edits
- accidental noise
- local transient files
- incomplete edits with no coherent task yet

---

## Step 4 — Stage only the relevant files

Stage only the files related to the current task.

Rules:

- Never use `git add .`
- Do not stage unrelated changes
- If unrelated changes are present, leave them unstaged
- If there is nothing relevant to stage, stop and say so clearly

Preferred staging flow:

```bash
git add <relevant-file-1> <relevant-file-2>
```

---

## Step 5 — Commit safely

Create a clean, short, imperative commit message.

- If `$ARGUMENTS` contains a usable commit intent, turn it into a commit message
- Otherwise infer the message from the staged diff
- Do not create an empty commit
- If the inspected diff is not meaningful enough, do not commit

Commit with:

```bash
git commit -m "<clean commit message>"
```

---

## Step 6 — Push to remote

Push only branch `vanya`:

```bash
git push -u origin vanya
```

If upstream already exists, `git push` is acceptable only after confirming the current branch is `vanya`.

---

## Step 7 — Report

Return:

1. Branch used
2. Inferred or provided intent
3. Whether a commit was made
4. Commit message, if any
5. Files committed, if any
6. Push result
7. Any unrelated files left unstaged
