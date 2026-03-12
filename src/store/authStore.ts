import { create } from 'zustand';
import type { AuthUser } from '@/types';

interface AuthState {
  /** Current authenticated user (null if logged out) */
  user: AuthUser | null;
  /** Whether an active session exists */
  isAuthenticated: boolean;
  /** Whether the initial session check has completed */
  isInitialized: boolean;
  /** Whether an auth operation is in progress */
  isLoading: boolean;
  /** Current auth error to display in UI */
  error: string | null;
  /** Set when user skips pairing — not persisted to server */
  pairingSkipped: boolean;
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setAuthenticated: (value: boolean) => void;
  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  setPairingSkipped: (value: boolean) => void;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,
  pairingSkipped: false,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setUser: (user) =>
    set({ user, isAuthenticated: user !== null }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setInitialized: (value) => set({ isInitialized: value }),
  setLoading: (value) => set({ isLoading: value }),
  setError: (error) => set({ error }),
  setPairingSkipped: (value) => set({ pairingSkipped: value }),
  reset: () => set(initialState),
}));
