import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoupleSetupMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
}

interface CoupleSetupState {
    messages: CoupleSetupMessage[];
    isComplete: boolean;
    /** 0-based index: 0=dating_start_date, 1=help_focus */
    currentQuestion: number;
    isLoading: boolean;
    error: string | null;
}

interface CoupleSetupActions {
    addMessage: (msg: CoupleSetupMessage) => void;
    setIsComplete: (v: boolean) => void;
    setCurrentQuestion: (n: number) => void;
    setLoading: (v: boolean) => void;
    setError: (e: string | null) => void;
    reset: () => void;
}

type CoupleSetupStore = CoupleSetupState & CoupleSetupActions;

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: CoupleSetupState = {
    messages: [],
    isComplete: false,
    currentQuestion: 0,
    isLoading: false,
    error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCoupleSetupStore = create<CoupleSetupStore>((set) => ({
    ...initialState,
    addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
    setIsComplete: (v) => set({ isComplete: v }),
    setCurrentQuestion: (n) => set({ currentQuestion: n }),
    setLoading: (v) => set({ isLoading: v }),
    setError: (e) => set({ error: e }),
    reset: () => set(initialState),
}));
