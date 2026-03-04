import { create } from 'zustand';
import type { Message } from '../types';

interface ChatStore {
  messages: Message[];
  isTyping: boolean;
  isPartnerTyping: boolean;

  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  setTyping: (value: boolean) => void;
  setPartnerTyping: (value: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [
    {
      id: '1',
      role: 'ai',
      content: 'Hey you two! 💕 I\'m your AI relationship guide. Ask me anything — date ideas, how to communicate better, or just vent. I\'m here for both of you.',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      status: 'read',
    },
    {
      id: '2',
      role: 'user',
      content: 'We need date night ideas for this weekend!',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      status: 'read',
    },
    {
      id: '3',
      role: 'ai',
      content: 'Love it! Here are 3 ideas based on your vibe:\n\n🌙 Rooftop stargazing with a homemade picnic\n🎨 Paint & sip at home with a playlist you both love\n🎲 Board game café followed by a late-night walk\n\nWant me to plan one in detail?',
      timestamp: new Date(Date.now() - 15000).toISOString(),
      status: 'read',
    },
  ],
  isTyping: false,
  isPartnerTyping: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  deleteMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),

  setTyping: (value) => set({ isTyping: value }),
  setPartnerTyping: (value) => set({ isPartnerTyping: value }),
  clearMessages: () => set({ messages: [] }),
}));
