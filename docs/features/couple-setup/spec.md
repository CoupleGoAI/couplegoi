## Feature: Couple Setup (Deterministic, No AI)

### What

Immediately after a successful pairing is established (post-QR), the user enters a mandatory chat that collects **two** couple-specific fields (dating start date, help focus) through a conversational flow. The "assistant" is a deterministic state machine in the `couple-setup` Edge Function — no LLM.

**Cannot be skipped.** No back button, no dismiss. Both questions must be answered before reaching HomeScreen.

---

## Trigger

- **Pairing established**: `couple_id` is set on the user's profile. If `dating_start_date` and `help_focus` are both null, couple-setup is shown.
- **Pairing skipped**: couple-setup is never shown. User goes directly to HomeScreen.

---

## Questions (2 total)

1. **Dating start date** (user types free-form; server parses + normalizes via chrono-node)
2. **What kind of help do you want?** (tappable chips in UI; server validates strictly)

**Help options (canonical values):**

- `communication`
- `conflict`
- `trust`
- `emotional_connection`
- `intimacy`
- `other`

---

## Screens

- **CoupleSetupScreen** — full-screen chat UI, no tabs, no back, no skip
- Reuses `ChatBubble`, `TypingIndicator`, `HelpTypeChips` components
- Shows typing indicator (300–600ms) before each assistant message
- Help type question renders tappable chips
- After completion: navigates to HomeScreen

---

## Flow

1. Assistant greets user → asks dating start date
2. User replies → parse/validate date → ask help type
3. User selects chip (or types) → validate option → navigate to HomeScreen

If an answer is empty/invalid, assistant re-asks with a friendly hint.

---

## Data access

| Operation    | Method                        | Notes                                          |
| ------------ | ----------------------------- | ---------------------------------------------- |
| Send message | Edge function: `couple-setup` | Deterministic logic + validation + persistence |

### `couple-setup` Edge Function contract

**Input:** `{ message?: string }`

**Output:** `{ reply, questionIndex, isComplete }`

- `reply: string` — assistant message
- `questionIndex: number` — 0..1
- `isComplete: boolean`

---

## Backend responsibilities

### Validation & normalization rules

**1) Dating start date**

- parse with `chrono-node`
- normalize as `YYYY-MM-DD`
- must be in the past
- must be after birth_date (from onboarding-profile)

**2) Help type**

- must match canonical set: `communication | conflict | trust | emotional_connection | intimacy | other`

### Persistence targets

- Chat messages → `messages` with `conversation_type='couple_setup'`
- Extracted fields → `profiles`: `dating_start_date`, `help_focus`

---

## Navigation

```
Pairing success → ConnectionConfirmed → CoupleSetupScreen → HomeScreen
Pairing skipped → HomeScreen (couple-setup never shown)
```
