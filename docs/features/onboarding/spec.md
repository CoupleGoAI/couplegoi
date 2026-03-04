# Feature: AI Onboarding

## What

After first login (when `onboarding_completed === false`), user is dropped into an AI chat that collects basic profile info through a conversational flow. Cannot be skipped. AI asks ~5 short questions one at a time: first name, age range, and 2-3 simple personality/relationship questions. On completion, backend sets `onboarding_completed = true` and user gets full app access.

This is NOT a form — it's a chat interface. The AI sends a message, user replies, AI validates and moves to the next question or re-asks if the answer is empty/irrelevant.

### Screens

- **OnboardingChatScreen** — full-screen chat UI, no tabs visible, no back button, no skip
- Reuses the same chat bubble components that will be used in the main AI Chat feature
- After completion: navigate to partner connection flow (GenerateQR/ScanQR) or Main tabs

### Flow

1. AI greets user → asks first name
2. User responds → AI validates (non-empty, looks like a name) → asks age range
3. User responds → AI validates (reasonable range like "20s", "25", "18-24") → asks personality Q1
4. Continue until all questions answered
5. On final answer → POST to backend → `onboarding_completed = true` → navigate forward

### API endpoints

| Method | Path                  | Body          | Response                               | Auth |
| ------ | --------------------- | ------------- | -------------------------------------- | ---- |
| POST   | `/onboarding/message` | `{ message }` | `{ reply, questionIndex, isComplete }` | Yes  |
| GET    | `/onboarding/status`  | —             | `{ completed, currentQuestion }`       | Yes  |

The backend manages the AI conversation and question state. Client just sends user messages and renders AI replies.

### State

- `onboardingStore` (new Zustand slice): `messages[]`, `isComplete`, `currentQuestion`, `isLoading`
- On completion, update user profile in `appStore`

## Done when

- [ ] After first login, user enters onboarding chat automatically
- [ ] AI asks ~5 questions conversationally (not a form)
- [ ] Empty/irrelevant answers get a friendly re-ask
- [ ] Onboarding cannot be skipped or backed out of
- [ ] On completion, user profile is saved and app navigates to main flow
- [ ] Resumable — if user kills app mid-onboarding, resumes where they left off

## Notes

- Chat UI should match the main AI Chat feature (shared components)
- Progress indicator (subtle, e.g. "2 of 5" or small dots) so user knows how far along
- Personality questions should feel casual: "Are you more of a planner or spontaneous type?" not "Rate your openness 1-10"
- Keep the AI tone warm, playful, Gen Z — match the brand
- The onboarding questions and validation logic live on the backend (AI service) — client is a thin chat shell
