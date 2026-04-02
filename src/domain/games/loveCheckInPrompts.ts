import type { CheckInPrompt } from './types';

export const CHECKIN_PROMPTS: readonly CheckInPrompt[] = [
    {
        id: 'ci-1',
        prompt: 'One thing I really appreciate about you lately...',
        placeholder: 'Write your answer here...',
    },
    {
        id: 'ci-2',
        prompt: 'Something you did recently that made me feel loved...',
        placeholder: 'Write your answer here...',
    },
    {
        id: 'ci-3',
        prompt: 'Something I\'d love us to experience together soon...',
        placeholder: 'Write your answer here...',
    },
];
