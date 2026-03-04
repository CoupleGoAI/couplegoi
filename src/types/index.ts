/**
 * CoupleGoAI — Global Type Definitions
 */

// ─── User / Partner ───────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Couple {
  id: string;
  userA: User;
  userB: User;
  connectedAt: string;
  streakDays: number;
  lastActivityAt: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export type MessageRole = 'user' | 'partner' | 'ai';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  status: MessageStatus;
  isEdited?: boolean;
}

export interface ChatSession {
  id: string;
  coupleId: string;
  messages: Message[];
  startedAt: string;
}

// ─── Truth or Dare ────────────────────────────────────────────────────────────
export type TodCategory = 'romantic' | 'spicy' | 'fun';
export type TodType = 'truth' | 'dare';
export type TurnPlayer = 'user' | 'partner';

export interface TodCard {
  id: string;
  type: TodType;
  category: TodCategory;
  content: string;
}

export interface TodRound {
  id: string;
  cardId: string;
  player: TurnPlayer;
  completed: boolean;
  skipped: boolean;
  timestamp: string;
}

export interface TodSession {
  id: string;
  coupleId: string;
  category: TodCategory;
  currentTurn: TurnPlayer;
  rounds: TodRound[];
  startedAt: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
export type OnboardingStep = 'welcome' | 'create-account' | 'generate-qr' | 'scan-qr' | 'confirmed';

// ─── App State ────────────────────────────────────────────────────────────────
export type AppScreen = 'onboarding' | 'main';

export interface AppState {
  isOnboarded: boolean;
  currentUser: User | null;
  partner: Partner | null;
  couple: Couple | null;
  colorScheme: 'light' | 'dark';
}
