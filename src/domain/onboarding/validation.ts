/**
 * Pure validation utilities for onboarding message input.
 * These live in the domain layer and are UI-framework agnostic.
 */

export const MAX_MESSAGE_LENGTH = 500;

/**
 * Trims whitespace and truncates to the maximum allowed length.
 * Must be called before passing user input to the API.
 */
export function sanitizeMessage(input: string): string {
  return input.trim().slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Returns true if the input is non-empty after sanitization.
 * Empty strings are valid for the initial AI greeting trigger
 * (handled by the hook, not this function).
 */
export function isNonEmptyMessage(input: string): boolean {
  return input.trim().length > 0;
}

/**
 * Returns true if the sanitized input is within the allowed length.
 * Protects against extremely long payloads.
 */
export function isWithinLengthLimit(input: string): boolean {
  return input.trim().length <= MAX_MESSAGE_LENGTH;
}

/**
 * Combined guard: message is suitable for submission as a user reply.
 */
export function isValidUserMessage(input: string): boolean {
  return isNonEmptyMessage(input) && isWithinLengthLimit(input);
}
