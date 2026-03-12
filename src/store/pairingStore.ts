import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PairingEntryScreen = 'GenerateQR' | 'ScanQR';

interface PairingState {
  token: string | null;
  expiresAt: string | null;
  entryScreen: PairingEntryScreen | null;
  isPending: boolean;
  error: string | null;
}

interface PairingActions {
  setToken: (token: string | null) => void;
  setExpiresAt: (expiresAt: string | null) => void;
  setEntryScreen: (entryScreen: PairingEntryScreen | null) => void;
  setPending: (v: boolean) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

type PairingStore = PairingState & PairingActions;

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: PairingState = {
  token: null,
  expiresAt: null,
  entryScreen: null,
  isPending: false,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePairingStore = create<PairingStore>((set) => ({
  ...initialState,
  setToken: (token) => set({ token }),
  setExpiresAt: (expiresAt) => set({ expiresAt }),
  setEntryScreen: (entryScreen) => set({ entryScreen }),
  setPending: (v) => set({ isPending: v }),
  setError: (e) => set({ error: e }),
  reset: () => set(initialState),
}));
