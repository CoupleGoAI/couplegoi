# CoupleGoAI

CoupleGoAI is a premium mobile app for Gen Z couples that helps partners stay emotionally connected through daily conversations, playful activities, and shared insights.

## Business Idea and Value

Many couples want to communicate better but do not always have the right prompts, rhythm, or emotional context in busy daily life. CoupleGoAI turns relationship growth into a simple, engaging habit.

The product value is:

- Stronger connection through guided conversations and reflection.
- Better communication with AI-assisted prompts and context-aware flows.
- Higher engagement with game-like relationship activities and shared moments.
- A private, secure experience designed for sensitive couple data.

## Core Features

- AI couple chat and guided prompts for meaningful conversations.
- Couple setup and pairing flows to connect two partners.
- Onboarding and profile personalization.
- Shared insights to highlight relationship patterns and progress.
- Real-time games and invitations to make interaction fun and consistent.
- Session and invitation management (create, respond, leave, cancel, history).
- Secure auth and state management across mobile flows.

## Privacy and Trust

CoupleGoAI is built for deeply personal conversations, relationship details, and emotional context. Because users share private parts of their lives, privacy is not optional - it is an ethical responsibility.

Our approach is to treat privacy and security as a core foundation of the product, not an afterthought. That means designing for safe data handling, secure access, and strong protection standards from the start.

## Very Brief Technical Details

- Framework: Expo 54 + React Native 0.81
- Language: TypeScript (strict mode)
- Navigation: React Navigation + Expo Router
- State: Zustand
- Styling/UI: NativeWind (Tailwind-style), Reanimated 4, Expo UI modules
- Backend: Supabase (Auth, Postgres, Edge Functions, migrations)
- Tooling: ESLint, Jest, TypeScript type-checking

## Project Structure (High Level)

- `src/screens`: screen-level app flows
- `src/components`: reusable UI and feature components
- `src/hooks`: orchestration between UI and domain logic
- `src/domain`: business logic/use-cases
- `src/data`: API and Supabase integration layer
- `src/store`: Zustand state slices
- `supabase/functions`: server-side Edge Functions
- `supabase/migrations`: database schema evolution

## Local Development

```bash
pnpm install
pnpm start
```

Useful scripts:

- `pnpm ios`
- `pnpm android`
- `pnpm web`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
