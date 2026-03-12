## Feature: Onboarding Profile (Deterministic, No AI)

### What

After first login (when `onboarding_completed === false`), the user enters a mandatory chat that collects **two** profile fields (name, birth date) through a conversational flow. The "assistant" is a deterministic state machine in the `onboarding-profile` Edge Function — no LLM. On completion, sets `onboarding_completed = true` and navigates to the QR/pairing screen.

This is **not a form**. UI stays as chat.

---

## Questions (2 total)

Asked one at a time, in this order:

1. **First name**
2. **Birth date** (user types free-form; server parses + normalizes)

---

## Screens

- **OnboardingProfileScreen** — full-screen chat UI, no tabs, no back, no skip
- Reuses the same chat bubble components as the main AI chat feature
- Shows a **typing indicator** (300–600ms delay, pure client-side) before each assistant message
- After completion: navigates to partner connection flow (GenerateQR/ScanQR)

---

## Flow

1. Assistant greets user → asks first name
2. User replies → validate name → ask birth date
3. User replies → parse/validate birth date → sets `onboarding_completed=true` → navigate to pairing

If an answer is empty/invalid, assistant re-asks the same question with a friendly hint (varied phrasing).

---

## Data access

| Operation    | Method                              | Notes                                          |
| ------------ | ----------------------------------- | ---------------------------------------------- |
| Check status | Direct DB query on `profiles`       | Read `onboarding_completed`                    |
| Send message | Edge function: `onboarding-profile` | Deterministic logic + validation + persistence |

### `onboarding-profile` Edge Function contract

**Input:** `{ message?: string }`

- If `message` is omitted/empty → function returns the current assistant question (resume/start).
- If `message` exists → function validates it against current question, persists it, and returns next assistant message.

**Output:** `{ reply, questionIndex, isComplete }`

- `reply: string` — assistant message to display next
- `questionIndex: number` — 0..1 (current question after processing)
- `isComplete: boolean` — true only when onboarding is finished

---

## Backend responsibilities (no AI)

### Date parsing

Use **`chrono-node`** (via `https://esm.sh/chrono-node@2`) for free-form date parsing server-side.

### Validation & normalization rules

**1) First name**

- trimmed, 2–50 chars
- letters/spaces/`'`/`-` only
- on fail → re-ask with hint (varied)

**2) Birth date**

- parse with `chrono-node`
- normalize and store as `YYYY-MM-DD`
- must be in the past
- derived age within 16–110
- on fail → re-ask with examples (varied)

### Response variety

Each step has 2–3 prompt variants and 2 re-ask variants.

### Persistence targets

- Chat messages → `messages` with `conversation_type='onboarding'`
- Extracted fields → `profiles`: `name`, `birth_date`
- `onboarding_completed = true` set at the end

---

## Done when

- [ ] After first login, user enters onboarding chat automatically
- [ ] Assistant asks 2 questions conversationally
- [ ] Empty/invalid answers get a friendly re-ask (varied phrasing)
- [ ] Onboarding cannot be skipped or backed out of
- [ ] On completion, profile fields are saved and `onboarding_completed=true`
- [ ] Navigates to pairing screen after completion
