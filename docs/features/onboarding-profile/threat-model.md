# Feature: Onboarding Profile — Threat Model

> **Status**: Active
> **Spec**: `docs/features/onboarding-profile/spec.md`
> **Plan**: `docs/features/onboarding-profile/plan.md`
> **Date**: 2026-03-12

---

## 1 · Threats

| #   | Asset                          | Threat                                                                              | Impact   |
| --- | ------------------------------ | ----------------------------------------------------------------------------------- | -------- |
| T1  | Profile PII (name, birth_date) | Edge function stores user-supplied PII without sanitization                         | Medium   |
| T2  | Onboarding state               | Client sends crafted progress to skip questions                                     | High     |
| T3  | Auth session (JWT)             | Edge function uses `client.auth.getUser()` (HS256) instead of Auth REST API (ES256) | High     |
| T4  | Messages table                 | Messages inserted with wrong `user_id`                                              | Medium   |
| T5  | Profile fields                 | Service role client used without verifying identity                                 | Critical |
| T7  | Date fields                    | Malformed dates pass through to DB                                                  | Medium   |
| T8  | Chat messages                  | PII logged in client console                                                        | Medium   |

---

## 2 · Requirements

### MUST (blockers)

- **MUST-1**: Edge function MUST verify JWT via Auth REST API (`/auth/v1/user`), never `client.auth.getUser()`.
- **MUST-2**: Edge function MUST derive current question step from persisted profile fields (null = not answered), never from client input.
- **MUST-3**: Edge function MUST validate all input server-side: name (2–50 chars, letters/spaces/apostrophe/hyphen), birth_date via chrono-node (past, age 16–110).
- **MUST-4**: Edge function MUST use `user.id` from Auth REST API response — never accept `user_id` from client.
- **MUST-5**: Edge function MUST persist user message + assistant reply atomically.
- **MUST-6**: Client MUST pass input through `sanitizeMessage()` (trim + 500-char limit).
- **MUST-7**: Client MUST NOT log tokens, PII, or full response bodies.

### MUST-NOT

- **MUST-NOT-1**: Edge function MUST NOT trust client-supplied progress fields.
- **MUST-NOT-2**: Edge function MUST NOT use `client.auth.getUser()`.
- **MUST-NOT-3**: Edge function MUST NOT use service_role client without verifying identity first.
- **MUST-NOT-4**: Client MUST NOT parse or validate dates.
- **MUST-NOT-5**: Client MUST NOT display raw error messages.
