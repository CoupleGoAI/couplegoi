import { GAME_DEFINITIONS } from './catalog';
import type { GameType, GamePromptPayload, GamePrompt } from '@/types/games';

/**
 * Resolves a prompt by its ID from the shared client-side catalog.
 * Both devices have the same catalog, so we only need to store
 * the prompt_id in the database — not the full text.
 */
export function resolvePromptById(promptId: string): GamePrompt | null {
  for (const def of Object.values(GAME_DEFINITIONS)) {
    const found = def.prompts.find((p) => p.id === promptId);
    if (found) return found;
  }
  return null;
}

/**
 * Builds the typed prompt payload from a prompt ID and game type.
 * Returns null if the prompt is not found in the catalog.
 */
export function resolvePromptPayload(
  promptId: string,
  gameType: GameType,
): GamePromptPayload | null {
  const prompt = resolvePromptById(promptId);
  if (!prompt) return null;

  const raw = prompt as unknown as Record<string, unknown>;

  switch (gameType) {
    case 'would_you_rather':
      return { type: 'would_you_rather', optionA: raw.optionA as string, optionB: raw.optionB as string };
    case 'this_or_that':
      return { type: 'this_or_that', optionA: raw.optionA as string, optionB: raw.optionB as string };
    case 'who_is_more_likely':
      return { type: 'who_is_more_likely', prompt: raw.prompt as string };
    case 'never_have_i_ever':
      return { type: 'never_have_i_ever', statement: raw.statement as string };
  }
}
