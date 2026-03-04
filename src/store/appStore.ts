import { create } from 'zustand';
import type { User, Partner, Couple } from '../types';

interface AppStore {
  isOnboarded: boolean;
  currentUser: User | null;
  partner: Partner | null;
  couple: Couple | null;
  colorScheme: 'light' | 'dark';

  // Actions
  setOnboarded: (value: boolean) => void;
  setCurrentUser: (user: User | null) => void;
  setPartner: (partner: Partner | null) => void;
  setCouple: (couple: Couple | null) => void;
  setColorScheme: (scheme: 'light' | 'dark') => void;
  reset: () => void;
}

const initialState = {
  isOnboarded: false,
  currentUser: null,
  partner: null,
  couple: null,
  colorScheme: 'light' as const,
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,

  setOnboarded: (value) => set({ isOnboarded: value }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setPartner: (partner) => set({ partner }),
  setCouple: (couple) => set({ couple }),
  setColorScheme: (scheme) => set({ colorScheme: scheme }),
  reset: () => set(initialState),
}));
