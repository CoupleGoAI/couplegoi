# Feature: AI Chat

## What

Each user has a private AI chat — their personal relationship advisor. Messages are stored server-side and persist across sessions. The AI uses conversation history for context-aware responses. Partners cannot see each other's chats.

This is the core feature of the app. The chat experience should feel premium: clean typography, generous spacing, smooth animations, and a warm AI personality.

### Screens

- **ChatScreen** (exists) — full chat interface in the Chat tab. Message list + input bar.
  - User messages on the right (pink/brand), AI messages on the left (neutral)
  - Typing indicator when AI is responding
  - Pull-to-load older messages (paginated)
  - Auto-scroll to bottom on new message
  - Input bar with send button, keyboard-aware

### Flow

1. User opens Chat tab → load message history from backend (paginated, newest first)
2. User types message → send to backend → show optimistic "sending" state
3. Backend processes with AI (uses conversation history for context) → streams or returns response
4. AI response appears with typing indicator animation → then full message

### API endpoints

| Method | Path             | Body                | Response                      | Auth |
| ------ | ---------------- | ------------------- | ----------------------------- | ---- |
| GET    | `/chat/messages` | `?cursor=&limit=20` | `{ messages[], nextCursor? }` | Yes  |
| POST   | `/chat/send`     | `{ content }`       | `{ userMessage, aiReply }`    | Yes  |

Simple request-response for MVP. No streaming, no WebSocket — just POST and get the AI reply back. Streaming is a future enhancement.

### State

- `chatStore` (exists, needs rework): `messages[]`, `isAiTyping`, `isLoading`, `cursor`, `hasMore`
- Messages in store are the local cache. Source of truth is the backend.
- On app open / tab focus: fetch latest messages
- Optimistic send: add user message to store immediately, mark as "sending", update to "sent" on server response

### Message types

```ts
type MessageRole = "user" | "assistant"; // simplified from current 'user' | 'partner' | 'ai'

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status: "sending" | "sent" | "error";
}
```

## Done when

- [ ] User can send a message and receive an AI response
- [ ] Chat history persists across app restarts (loaded from backend)
- [ ] AI uses previous conversation context for relevant responses
- [ ] Messages paginate (load more on scroll up)
- [ ] Typing indicator shown while AI is processing
- [ ] Chat is private — no access to partner's messages

## Notes

- Remove hardcoded mock messages from current chatStore
- Remove `partner` role from messages — this is a private 1:1 with AI, not a group chat
- The AI personality should be warm, supportive, Gen Z-friendly — configured on the backend
- Input validation: don't send empty messages, trim whitespace
- Show error state if send fails, with retry option
- No message editing or deletion in MVP
- No real-time sync needed — this is a personal chat, not shared
- The existing ChatScreen has UI scaffolding but needs wiring to real backend
