## Feature: Onboarding Chat (Deterministic, No AI)

### What

After first login (when `onboarding_completed === false`), the user is dropped into an onboarding **chat** that collects a small set of basic profile fields through a conversational flow. **Cannot be skipped.** The “assistant” is **not an LLM** — it is a deterministic state machine in the `onboarding-chat` Edge Function that:

- sends predefined assistant messages (warm, playful tone)
- validates user replies (empty/irrelevant → friendly re-ask)
- persists messages + extracted structured fields
- completes onboarding by setting `profiles.onboarding_completed = true`

This is **not a form**. UI stays as chat.

---

## Questions (4 total)

Asked one at a time, in this order:

1. **First name**
2. **Birth date** (user can type in various formats; we normalize)
3. **Dating start date** (same: user can type various formats; normalize)
4. **What kind of help do you want?** (single select / strict taxonomy)

**Help options (canonical values):**

- `communication`
- `conflict`
- `trust`
- `emotional_connection`
- `intimacy`
- `other`

---

## Screens

- **OnboardingChatScreen** — full-screen chat UI, no tabs, no back, no skip
- Reuses the same chat bubble components as the main AI chat feature
- After completion: navigate to partner connection flow (GenerateQR/ScanQR) or Main tabs

(UI unchanged.)

---

## Flow

1. Assistant greets user → asks first name
2. User replies → validate name → ask birth date
3. User replies → parse/validate birth date → ask dating start date
4. User replies → parse/validate dating start date → ask help type
5. User replies → validate option → function sets `onboarding_completed=true` → navigate forward

If an answer is empty/invalid, assistant re-asks the same question with a friendly hint.

---

## Data access (Supabase-native — no REST endpoints)

| Operation     | Method                           | Notes                                                     |
| ------------- | -------------------------------- | --------------------------------------------------------- |
| Check status  | Direct DB query on `profiles`    | Read `onboarding_completed`                               |
| Fetch history | Direct DB query on `messages`    | `conversation_type='onboarding'`, ordered by `created_at` |
| Send message  | Edge function: `onboarding-chat` | Deterministic logic + validation + persistence            |

### `onboarding-chat` Edge Function contract

**Input:** `{ message?: string }`

- If `message` is omitted/empty → function returns the current assistant question (resume/start).
- If `message` exists → function validates it against current question, persists it, and returns next assistant message.

**Output:** `{ reply, questionIndex, isComplete }`

- `reply: string` — assistant message to display next (question or re-ask)
- `questionIndex: number` — 0..3 (current question after processing)
- `isComplete: boolean` — true only when onboarding is finished

---

## State / progress

- Progress indicator uses `questionIndex` (e.g. “2 of 4”)
- On completion, client updates `authStore` (refresh profile or just set local state) and navigates forward.

---

## Backend responsibilities (no AI)

The `onboarding-chat` Edge Function is the single source of truth for:

- current onboarding step (derived from persisted state, resumable)
- assistant prompts (predefined strings per step, warm Gen Z tone)
- deterministic validation and normalization
- storing both chat history and structured fields

### Validation & normalization rules

**1) First name**

- trimmed, 2–50 chars
- letters/spaces/`'`/`-` only (reject numbers/emojis)
- on fail → re-ask with hint (“Just your first name 😊”)

**2) Birth date**

- parse free-form input into a date using `chrono-node`
- normalize and store as `YYYY-MM-DD`
- must be in the past
- optional sanity: derived age within a reasonable range (e.g. 16–110)
- on fail → re-ask with examples (“Try: 1997-03-12 or 12 March 1997”)

**3) Dating start date**

- parse with `chrono-node`
- normalize/store as `YYYY-MM-DD`
- must be in the past
- must be after birth date (basic sanity)
- on fail → re-ask with examples

**4) Help type**

- must match the canonical set:
  `communication | conflict | trust | emotional_connection | intimacy | other`
- (UI may present buttons; backend still validates strictly)
- on fail → re-ask and list options

### Persistence targets

- Store chat messages in `messages` with `conversation_type='onboarding'`
- Store extracted fields in `profiles`:
  - `name`
  - `birth_date` (if column exists; add if missing)
  - `dating_start_date` (add column if missing)
  - `onboarding_completed` set true at the end
  - optionally `help_focus` (text enum)

Resumability: function derives current step from stored session state and/or stored profile fields + onboarding messages.

---

## Done when

- [ ] After first login, user enters onboarding chat automatically
- [ ] Assistant asks 4 questions conversationally (not a form)
- [ ] Empty/invalid answers get a friendly re-ask
- [ ] Onboarding cannot be skipped or backed out of
- [ ] On completion, profile fields are saved and `onboarding_completed=true`
- [ ] Resumable — if user kills app mid-onboarding, resumes at the right step

---

## Notes

- Keep assistant tone warm, playful, Gen Z
- Keep questions short and one at a time
- Backend owns validation/normalization; client is a thin chat shell
- No LLM calls anywhere in onboarding
