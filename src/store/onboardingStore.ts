import { create } from 'zustand';
import type { InteractivePayload } from '@/types/index';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnboardingMessage {
  id: string;
  role: 'user' | 'assistant' | 'interactive';
  content: string;
  /** Unix ms timestamp — used for display only, never persisted here */
  createdAt: number;
  /** Present only when role === 'interactive' */
  interactive?: InteractivePayload;
}

interface OnboardingState {
  messages: OnboardingMessage[];
  isComplete: boolean;
  /** 0-based index; increments as each question is answered. Total: 4 */
  currentQuestion: number;
  isLoading: boolean;
  error: string | null;
}

interface OnboardingActions {
  addMessage: (msg: OnboardingMessage) => void;
  setMessages: (msgs: OnboardingMessage[]) => void;
  setIsComplete: (v: boolean) => void;
  setCurrentQuestion: (n: number) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  /** Reset all state on logout or fresh start */
  reset: () => void;
}

type OnboardingStore = OnboardingState & OnboardingActions;

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: OnboardingState = {
  messages: [],
  isComplete: false,
  currentQuestion: 0,
  isLoading: false,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...initialState,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setIsComplete: (v) => set({ isComplete: v }),
  setCurrentQuestion: (n) => set({ currentQuestion: n }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),
  reset: () => set(initialState),
}));
