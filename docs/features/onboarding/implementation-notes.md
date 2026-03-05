# Implementation Notes: AI Onboarding Chat

## Summary

Implements the full AI onboarding chat feature for CoupleGoAI. After first login (when `user.onboardingCompleted === false`), the user is placed into a conversational chat UI that collects profile information through ~5 AI-driven questions. The feature is unbypassable (no back gesture, no skip), resumable (history restored from Supabase on re-entry), and reactive (navigation to Main happens automatically when the backend sets `onboarding_completed = true` and the auth store is refreshed).

## Files changed

### New

- `src/data/config.ts` — `API_BASE_URL` constant read from `EXPO_PUBLIC_API_BASE_URL` env var with production fallback
- `src/data/onboardingApi.ts` — Three data-layer functions: `getOnboardingStatus`, `sendOnboardingMessage`, `fetchOnboardingHistory`. All return discriminated `Result<T, string>`. History items sanitize the `role` field (only trust `user|assistant`).
- `src/store/onboardingStore.ts` — Zustand slice: `messages`, `isComplete`, `currentQuestion`, `isLoading`, `error`, plus `reset()` action. Adds `createdAt: number` to `OnboardingMessage` for timestamp display (minor extension beyond spec type — see Plan Deviation below).
- `src/hooks/useOnboarding.ts` — Orchestration hook. On mount: fetches status, optionally restores history. `sendMessage('')` triggers first AI greeting. On completion: refreshes auth profile → RootNavigator transitions reactively. Returns `{ messages, isComplete, currentQuestion, totalQuestions, isLoading, error, sendMessage, isInitializing }`.
- `src/components/chat/ChatBubble.tsx` — Shared message bubble component. User: right-aligned, `gradients.brand` LinearGradient. AI: left-aligned, `colors.muted` background with `colors.borderDefault` border. `React.memo` applied.
- `src/components/chat/TypingIndicator.tsx` — Three bouncing dots using Reanimated 4 `useSharedValue` + `withRepeat` + `withSequence` + `withDelay`. Runs on UI thread. `React.memo` applied.
- `src/screens/main/OnboardingChatScreen.tsx` — Full-screen chat UI. `LinearGradient` heroWash background. `SafeAreaView` top+bottom. Header with app name + progress dots (`currentQuestion of totalQuestions`). `FlatList` of `ChatBubble`s. `TypingIndicator` as `ListFooterComponent` when `isLoading`. Error banner. `KeyboardAvoidingView` input bar with send button. Three states: initializing splash, chat, completion screen.
- `src/domain/onboarding/validation.ts` — Pure functions: `sanitizeMessage`, `isNonEmptyMessage`, `isWithinLengthLimit`, `isValidUserMessage`. No React dependencies.
- `src/domain/onboarding/__tests__/validation.test.ts` — 15 unit tests covering all pure functions including edge cases and safety checks.
- `jest.config.js` — Jest configuration using `babel-jest` + `testEnvironment: 'node'` for domain tests (avoids Expo native runtime setup for pure TS tests). Path aliases mirrored from tsconfig.
- `eslint.config.js` — ESLint v9 flat config (was missing from repo). Enables `@typescript-eslint/no-explicit-any`, `consistent-type-imports`, `no-console` (warn), `prefer-const`. Test files excluded.

### Modified

- `src/data/apiClient.ts` — Added `apiFetch<T>`: authenticated fetch to the CoupleGoAI REST API with 10s `AbortController` timeout, Bearer token injection (never logged), typed `Result<T, string>` return, HTTP error mapping. Import of `API_BASE_URL` from `config.ts`.
- `src/navigation/types.ts` — Added `Onboarding: undefined` to `RootStackParamList`. Added `OnboardingScreenProps` type.
- `src/navigation/RootNavigator.tsx` — Added conditional route: `!onboardingCompleted` → `OnboardingChatScreen` with `gestureEnabled: false`. Named import of `OnboardingChatScreen`.
- `src/components/ui/Divider.tsx` — `import type { ViewStyle }` (lint compliance)
- `src/components/ui/GradientButton.tsx` — `import type { ViewStyle, TextStyle }` (lint compliance)
- `src/components/ui/ScreenContainer.tsx` — `import type { ViewStyle }` (lint compliance)
- `src/components/ui/avatar.tsx` — `import type { ViewStyle }` (lint compliance)
- `src/components/ui/badge.tsx` — `import type { ViewStyle }` (lint compliance)
- `src/components/ui/card.tsx` — `import type { ViewStyle }` (lint compliance)
- `tsconfig.json` — Added `exclude` array to omit `__tests__/**` and `*.test.ts` files from the main `tsc --noEmit` compilation.
- `package.json` — Added `jest`, `jest-expo` as devDependencies. Added `"test": "jest"` script.

## Plan deviation

**`createdAt: number` added to `OnboardingMessage`** — The spec's store type has `{ id, role, content }`. The screen spec requires "Timestamps: small caption text below each bubble." To satisfy this without any string parsing of IDs, `createdAt: number` (Unix ms) was added to the interface. History items from Supabase use `new Date(item.created_at).getTime()` for conversion. Note in implementation-notes.md per instructions.

## Security requirements satisfied

- **Token never logged**: `apiFetch` builds the `Authorization` header inline with no debug output. The Bearer token is attached in a local scope and never passed to any logging facility.
- **No PII in logs**: `console.log` is linted as a warning, `console.error/warn` only. Neither the token nor user messages are logged.
- **External input validated**: `fetchOnboardingHistory` filters DB rows with a type-guard and narrows `role` to `'user' | 'assistant'` before trusting it. `sendOnboardingMessage` input goes through `sanitizeMessage` via the domain layer.
- **Session gating**: `apiFetch` calls `supabase.auth.getSession()` before every request; returns a generic error if the session is missing or expired — no internal token details exposed.
- **Timeout enforced**: `AbortController` with 10 s timeout on all REST calls prevents indefinite hangs.
- **No skip / back**: `gestureEnabled: false` on the Onboarding stack screen. No back button in `OnboardingChatScreen` header.
- **Secrets in secure store**: Auth tokens stay in Supabase's `expo-secure-store` adapter — `apiFetch` reads them via `getSession()`, never from AsyncStorage.
- **Generic error messages**: HTTP 4xx/5xx errors surface generic strings (e.g., "Session expired. Please sign in again.") — no stack traces or internal IDs.
- **Input length cap**: `MAX_MESSAGE_LENGTH = 500` enforced in `sanitizeMessage` and `isValidUserMessage`; `TextInput maxLength={500}` enforces it at the UI layer.

## How to test

1. **Fresh onboarding**: Create a new account (Register screen). After email confirmation / sign-in, if `onboarding_completed = false` in the `profiles` table, you should be routed to `OnboardingChatScreen` automatically.
2. **First greeting**: On screen mount (no prior messages), the screen auto-sends an empty message → AI replies with a greeting + first question. Confirm no empty user bubble appears.
3. **Progress dots**: As `questionIndex` increments in API responses, dots fill left-to-right (pink = answered, gray = pending).
4. **Typing indicator**: While waiting for an AI reply, three animated bouncing dots appear below the last message.
5. **Resume mid-flow**: Kill the app during question 3. Reopen — if the backend's `currentQuestion > 0`, `fetchOnboardingHistory` is called and prior messages restore correctly.
6. **Completion**: After the final answer, the screen transitions to the "🎉 You're all set!" state. Shortly after, `fetchProfile` updates `user.onboardingCompleted = true` in the auth store and `RootNavigator` automatically shows `PlaceholderScreen` (Main).
7. **Error state**: Disable network. Send a message — the error banner appears with a generic message. Re-enable network and send again — it succeeds.
8. **Back gesture blocked**: On iOS, swipe left on the Onboarding screen — the gesture is disabled (`gestureEnabled: false`).

## Tests added

- `src/domain/onboarding/__tests__/validation.test.ts` — 15 unit tests covering `sanitizeMessage` (trim, truncation, whitespace), `isNonEmptyMessage` (empty/non-empty/whitespace), `isWithinLengthLimit` (boundary conditions), and `isValidUserMessage` (combined guard, safety against untrusted input).

## Known limitations / follow-ups

- The `useOnboarding` `useEffect` uses an empty deps array guarded by `hasInitialized.current`. This correctly runs once on mount but would not re-initialize if the user id changed while the screen was mounted (impossible in this flow, but worth noting).
- The "Let's Go!" button on the completion screen calls `retryComplete()` which re-fetches the auth profile with a loading state and error banner — retry CTA is fully implemented.
- `ChatBubble` and `TypingIndicator` are placed in `src/components/chat/` to be reused by the main AI Chat feature (per spec: "Reuses the same chat bubble components").
