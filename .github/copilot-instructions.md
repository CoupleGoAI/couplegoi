# CoupleGoAI — GitHub Copilot Instructions

You are working on CoupleGoAI: a premium, Gen Z couples mobile app (React Native + TypeScript) with:

- Partner connection via QR code
- AI chat used together by two partners
- Truth-or-Dare game (real-time sync, turn-based)
- Bottom tabs: Home, Chat, Game, Profile

Your output must be modern, secure, scalable, and maintainable.

---

## 0) Source of truth + “read first”

Before making changes, read:

- docs/features/<feature>/spec.md (requirements)
- docs/features/<feature>/plan.md (architecture)
- docs/features/<feature>/threat-model.md (security rules)
- existing code patterns in this repo

If feature docs exist, DO NOT contradict them. Update docs only if asked or if required to reflect implementation reality.

---

## 1) Architecture (senior, production-grade)

Use strict boundaries:

**UI (screens/components) → Domain (use-cases) → Data (api/storage/realtime)**

Rules:

- UI must not call fetch/storage/realtime directly.
- Domain contains business rules + pure logic and depends on interfaces, not implementations.
- Data layer implements those interfaces (API clients, persistence, realtime sync).
- Prefer small modules, explicit types, dependency direction enforced.

Prefer:

- TypeScript strict, no `any`
- typed errors (Result/Outcome pattern or discriminated unions)
- predictable state (hooks + minimal state surface)
- clear folder structure: `src/ui`, `src/domain`, `src/data`, `src/shared`, `src/theme`, `src/navigation`

No “mega refactors” unless requested.

---

## 2) Security & privacy (must-follow)

- Never log secrets, tokens, auth headers, PII, or full payloads.
- Validate inputs at trust boundaries: deep links, QR payloads, push payloads, API responses, user input.
- Tokens/secrets must use secure storage (never AsyncStorage).
- Least privilege: request only permissions needed; gate by user intent.
- Handle session expiry explicitly; wipe sensitive state on logout.
- Treat real-time sync as untrusted input: validate message shapes, turn ownership, and room membership.

If security requirements conflict with implementation constraints, stop and propose a safe alternative.

---

## 3) Reliability & quality

- Network: timeouts + typed error handling; retries only where safe.
- User-facing flows must include: loading / error / empty states.
- Avoid unhandled promises.
- Add tests for non-trivial logic (domain). Add seams for integration/e2e.

When you implement:

- Provide a short plan
- Then implement with small diffs
- Then list files changed + how to test

---

## 4) Brand + UI system (must match landing identity)

The app must feel like a natural extension of the CoupleGoAI landing page.

Tone: warm, romantic, premium, modern, slightly playful (not childish), minimal cognitive load.

Visual system:

- Pastel blush/lavender near-white backgrounds with subtle gradient washes
- Editorial serif for emotional hero/headings; clean sans for UI and body
- Pill-first CTAs, gradient accents used sparingly
- Card-based sections with soft corners, subtle borders/shadows
- Generous spacing, thumb-friendly tap targets

Implementation requirements:

- Centralized theme/tokens: colors, typography, spacing, radii, shadows
- Semantic tokens (e.g. `bg.canvas`, `text.primary`, `accent.gradientStart`)
- Consistent components: buttons, cards, badges/pills, chat bubbles, game cards
- Motion: subtle, smooth micro-interactions (small scale/fade/slide), never distracting

---

## 5) Feature-specific UX constraints

Onboarding:

- Max 4–5 screens
- QR generate + scan + confirmation
- Minimal tutorial

Home:

- 2 primary actions: AI Chat, Truth or Dare
- Optional: partner status, streak, daily suggestion (keep minimal)

AI Chat:

- Clean chat, large readable typography, generous spacing
- Two users visually distinct
- AI suggestions, edit sent message
- Minimal icons, premium feel

Truth or Dare:

- Categories: Romantic, Spicy, Fun/Silly
- Card-based interaction, turn-based
- Real-time sync between partners
- Clear progress indicator, subtle animations

---

## 6) Defaults & constraints

- Use functional components + hooks.
- Prefer existing libraries and patterns in the repo; do not add dependencies unless justified.
- Any new dependency must include: why, alternatives considered, impact, and minimal usage surface.

---

## 7) Output expectations

Every meaningful change must include:

- What you changed and why
- Files changed (grouped)
- Security notes (what you did to stay safe)
- Tests added/updated
- Manual test steps
