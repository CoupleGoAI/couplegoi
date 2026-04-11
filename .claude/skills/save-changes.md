# Save Changes Skill — CoupleGoAI

Use this skill when the user wants to save current work to git safely without touching `main`.

---

## Goal

Stage only the files relevant to the requested work, make sure all commits happen on branch `vanya`, decide whether the current diff is meaningful enough to save, write a clean commit message when needed, and push to remote.

This skill is the safe default for non-technical users who just want their current work saved.

---

## Branch policy

- The only allowed working branch for this skill is `vanya`
- Never commit on `main`
- Never push `main`
- If the current branch is not `vanya`, switch to `vanya` before committing
- If `vanya` does not exist locally, create or track it

Preferred branch flow:

```bash
git fetch origin
git switch vanya || git switch -c vanya --track origin/vanya || git switch -c vanya
```

If branch switching fails because of a git conflict or unsafe working tree state, stop and explain the blocker clearly instead of guessing.

---

## Staging rules

- Inspect `git status --short` before staging anything
- If the user gave no intent, infer the intent from the changed files and diff
- Stage only the files directly related to one coherent piece of work
- Do not use `git add .`
- Do not stage unrelated edits just because they are present
- If unrelated changes exist, leave them unstaged and mention that in the final report

If it is genuinely ambiguous which files belong to the task, state that clearly before staging.

Useful inspection flow:

```bash
git status --short
git diff -- <candidate-file>
git diff --cached
```

Infer the task from filenames, touched symbols, and the actual diff. Do not require the user to provide a commit message.

---

## Should this be committed?

This skill must decide whether a commit is actually warranted.

Commit only if the diff represents meaningful work such as:

- a bug fix
- a UI or behavior change
- a new feature or screen
- a real refactor
- a config or dependency change the user likely wants to keep

Do not commit when the changes are likely noise or too small to be intentional, for example:

- whitespace-only edits
- accidental formatting drift in unrelated files
- transient local artifacts
- partial edits that obviously look unfinished
- an empty or near-empty diff with no meaningful behavior change

If the diff does not justify a commit, stop without committing or pushing and explain why briefly.

---

## Commit rules

- Use a short imperative commit message
- If the user supplied commit intent, use that as the basis for the message
- If no message was given, infer one from the staged diff
- Do not create an empty commit
- The skill must work even when the user runs it with no arguments

Good commit message examples:

- `Fix onboarding CTA state`
- `Add partner QR scan loading state`
- `Update Supabase auth error handling`

---

## Push rules

After a successful commit, push only branch `vanya`:

```bash
git push -u origin vanya
```

If the branch already tracks remote, a normal push is fine:

```bash
git push
```

---

## Minimal workflow

1. Read `git status --short`
2. Inspect the diff and infer the likely task if needed
3. Check current branch with `git branch --show-current`
4. Switch to `vanya` if needed
5. Decide whether the work is meaningful enough to commit
6. Stage only relevant files
7. Commit with a clean message if warranted
8. Push `vanya`
9. Report what was saved, or why no commit was made

---

## Final report format

1. Branch used
2. Inferred or provided intent
3. Whether a commit was made
4. Commit message, if any
5. Files staged and committed, if any
6. Whether push succeeded
7. Any leftover unstaged or unrelated files
