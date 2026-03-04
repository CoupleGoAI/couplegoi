import type { TodCard, TodCategory, TodType } from '../types';
import { generateId } from './helpers';

// ─── Truth or Dare Card Database ──────────────────────────────────────────────

export const romanticTruths: TodCard[] = [
  {
    id: generateId(),
    type: 'truth',
    category: 'romantic',
    content: 'What was the exact moment you knew you were falling for me?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'romantic',
    content: 'What is one thing I do that makes you feel most loved?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'romantic',
    content: 'What is your favorite memory of us together so far?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'romantic',
    content: 'What is something you have always wanted to tell me but never found the right moment?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'romantic',
    content: 'Where do you see us in five years?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'romantic',
    content: 'What song best describes how you feel about our relationship?',
  },
];

export const romanticDares: TodCard[] = [
  {
    id: generateId(),
    type: 'dare',
    category: 'romantic',
    content: 'Write a 3-sentence love letter and read it out loud right now.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'romantic',
    content: 'Give your partner the longest, most genuine hug you have ever given.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'romantic',
    content: 'Look into each other\'s eyes without speaking for 30 seconds.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'romantic',
    content: 'Send a voice note to your partner telling them your favorite thing about them.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'romantic',
    content: 'Plan a surprise date for next week and reveal only one hint right now.',
  },
];

export const spicyTruths: TodCard[] = [
  {
    id: generateId(),
    type: 'truth',
    category: 'spicy',
    content: 'What is your most unexpected dealbreaker in a relationship?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'spicy',
    content: 'What is one thing I do that drives you absolutely crazy — in a good way?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'spicy',
    content: 'What is something you have always wanted to try together but been too shy to suggest?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'spicy',
    content: 'What is one habit of mine you secretly wish would change?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'spicy',
    content: 'If you could relive one day of our relationship, which one would it be and why?',
  },
];

export const spicyDares: TodCard[] = [
  {
    id: generateId(),
    type: 'dare',
    category: 'spicy',
    content: 'Share a secret you have never told anyone before.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'spicy',
    content: 'Do your best impression of your partner. They decide if it is accurate.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'spicy',
    content: 'Describe your partner using only three emojis. No explanations allowed.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'spicy',
    content: 'Text someone you have not talked to in a year saying you were thinking of them.',
  },
];

export const funTruths: TodCard[] = [
  {
    id: generateId(),
    type: 'truth',
    category: 'fun',
    content: 'If we were characters in a movie, who would play each of us?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'fun',
    content: 'What is the most embarrassing thing you have googled in the last month?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'fun',
    content: 'If you had to eat only one food for the rest of your life, what would it be?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'fun',
    content: 'What is your most irrational fear and do not hold back?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'fun',
    content: 'What is the weirdest dream you have had about me?',
  },
  {
    id: generateId(),
    type: 'truth',
    category: 'fun',
    content: 'What reality TV show would you most likely win?',
  },
];

export const funDares: TodCard[] = [
  {
    id: generateId(),
    type: 'dare',
    category: 'fun',
    content: 'Do your best runway walk across the room. The other person must rate it out of 10.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'fun',
    content: 'Call a family member and tell them you "just wanted to hear their voice." No other context.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'fun',
    content: 'Speak in an accent of your partner\'s choosing for the next 3 rounds.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'fun',
    content: 'Do 15 jumping jacks while singing your national anthem.',
  },
  {
    id: generateId(),
    type: 'dare',
    category: 'fun',
    content: 'Let your partner post something on your Instagram story right now.',
  },
];

const allCards: Record<TodCategory, { truths: TodCard[]; dares: TodCard[] }> = {
  romantic: { truths: romanticTruths, dares: romanticDares },
  spicy: { truths: spicyTruths, dares: spicyDares },
  fun: { truths: funTruths, dares: funDares },
};

export function getRandomCard(category: TodCategory, type: TodType): TodCard {
  const pool = type === 'truth' ? allCards[category].truths : allCards[category].dares;
  return pool[Math.floor(Math.random() * pool.length)];
}
