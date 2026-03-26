# React Native / Expo Skill — CoupleGoAI

## Stack

- Expo (managed workflow)
- TypeScript strict mode — no `any`, no `@ts-ignore` without justification
- Zustand for global state
- Reanimated for animations
- React Navigation for routing

---

## Non-Negotiable Rules

1. **Never use `StyleSheet.create` with hardcoded colors** — use design tokens from
   `src/theme/tokens.ts`. Hardcoded hex values in components are forbidden.

2. **Zustand stores**: one store per domain (auth, couple, onboarding).
   Never put async logic inside the component — put it in store actions.

3. **Reanimated**: always use `useSharedValue` + `useAnimatedStyle`,
   never mutate shared values on the JS thread directly (use `withTiming`, `withSpring`).

4. **No inline anonymous functions in JSX** for performance-sensitive lists.

5. **Always handle loading + error states** — never assume a fetch succeeds.

6. **Navigation**: never navigate by string — use typed route params with TypeScript.

7. **Keyboard handling**: always use `KeyboardAvoidingView` with
   `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`.

---

## When Generating RN/Expo Code

- Confirm the Expo SDK version compatibility of any package before suggesting it
- Prefer Expo-native APIs (e.g. `expo-camera`, `expo-haptics`) over bare RN equivalents
- After generating a component, state any peer dependencies needed
- Flag any pattern that requires bare workflow if we are in managed workflow

---

## Component Conventions

- Functional components only, no class components
- Props interface defined above the component with explicit types
- Default exports for screens, named exports for reusable components
- File naming: PascalCase for components/screens, camelCase for hooks/utils

---

## Styling Conventions

- NativeWind 4 (primary) — use `className` with semantic Tailwind tokens
- `StyleSheet.create` only for: dynamic computed values, platform-specific exceptions,
  rare NativeWind-unsupported cases
- All colors and radii via `src/theme/tokens.ts` — no inline values
- Arbitrary spacing numbers and inline border-radius values are forbidden

---

## Performance Rules

- `React.memo` on list items and expensive subtrees
- Stable callbacks via `useCallback` with correct deps
- `FlatList` with `keyExtractor`, `getItemLayout` when heights are fixed
- Never animate with `setState` — use Reanimated worklets
- No dynamic `require()` — tree-shake via named exports

---

## Security Rules

- Tokens/secrets → `expo-secure-store` (never AsyncStorage, never MMKV for secrets)
- Request only permissions needed, gate by explicit user intent
- Wipe all sensitive state on logout (`store.reset()` + secure storage clear)
- Error messages shown to users must never contain stack traces or token fragments
