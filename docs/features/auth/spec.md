# Feature: Authentication

## What

Email/password registration and login with persistent sessions. User registers once, logs in once, stays logged in until manual logout or token expiry. OAuth (Google/Apple) is a stretch goal — email/password first.

Backend issues JWT access + refresh token pair. Access token is short-lived (15 min), refresh token is long-lived (30 days). Tokens stored in `expo-secure-store`. On app launch, if refresh token is valid, silently re-authenticate — no login screen. On expiry, redirect to login.

### Screens

- **LoginScreen** — email + password fields, "Log in" CTA, link to register
- **RegisterScreen** — email + password + confirm password, "Create account" CTA, link to login
- Both replace current `WelcomeScreen` + `CreateAccountScreen` in the onboarding stack
- After successful auth → navigate to AI onboarding (if `onboarding_completed === false`) or Main tabs

### API endpoints

| Method | Path             | Body                  | Response                              | Auth |
| ------ | ---------------- | --------------------- | ------------------------------------- | ---- |
| POST   | `/auth/register` | `{ email, password }` | `{ user, accessToken, refreshToken }` | No   |
| POST   | `/auth/login`    | `{ email, password }` | `{ user, accessToken, refreshToken }` | No   |
| POST   | `/auth/refresh`  | `{ refreshToken }`    | `{ accessToken, refreshToken }`       | No   |
| POST   | `/auth/logout`   | —                     | `{ ok }`                              | Yes  |

### State

- `authStore` (new Zustand slice): `accessToken`, `refreshToken`, `isAuthenticated`, `isLoading`
- `appStore` updated: remove `isOnboarded` flag (replaced by user's `onboarding_completed` from backend)
- On logout: wipe tokens from secure store, reset all stores

## Done when

- [ ] User can register with email/password and land in the app
- [ ] User can log in with existing credentials
- [ ] Session persists across app restarts (no re-login needed)
- [ ] Expired token triggers re-login flow
- [ ] Logout clears all tokens and navigates to login
- [ ] Tokens stored in expo-secure-store, never AsyncStorage

## Notes

- Password min 8 chars, validated client-side before sending
- Show inline field errors (not alerts)
- Loading state on buttons during network calls
- No "forgot password" in MVP — add later
- Keyboard-aware scroll so fields aren't hidden behind keyboard
- All API calls from this point forward go through an `apiClient` (in `src/data/`) that attaches the access token and handles 401 → refresh → retry
