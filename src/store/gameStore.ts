import { create } from 'zustand';
import type { TodCategory, TodType, TurnPlayer } from '../types';

interface GameCard {
  id: string;
  type: TodType;
  category: TodCategory;
  content: string;
}

interface GameStore {
  isActive: boolean;
  category: TodCategory | null;
  currentTurn: TurnPlayer;
  currentCard: GameCard | null;
  roundCount: number;
  completedRounds: number;

  startGame: (category: TodCategory) => void;
  setCurrentCard: (card: GameCard) => void;
  nextTurn: () => void;
  completeRound: () => void;
  endGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  isActive: false,
  category: null,
  currentTurn: 'user',
  currentCard: null,
  roundCount: 0,
  completedRounds: 0,

  startGame: (category) =>
    set({ isActive: true, category, currentTurn: 'user', roundCount: 0, completedRounds: 0, currentCard: null }),

  setCurrentCard: (card) => set({ currentCard: card }),

  nextTurn: () =>
    set((state) => ({
      currentTurn: state.currentTurn === 'user' ? 'partner' : 'user',
      currentCard: null,
    })),

  completeRound: () =>
    set((state) => ({
      completedRounds: state.completedRounds + 1,
      roundCount: state.roundCount + 1,
    })),

  endGame: () =>
    set({ isActive: false, category: null, currentCard: null, roundCount: 0, completedRounds: 0 }),
}));
