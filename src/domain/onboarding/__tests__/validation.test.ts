import {
  sanitizeMessage,
  isNonEmptyMessage,
  isWithinLengthLimit,
  isValidUserMessage,
  MAX_MESSAGE_LENGTH,
} from '../validation';

describe('sanitizeMessage', () => {
  it('should trim leading and trailing whitespace', () => {
    expect(sanitizeMessage('  hello  ')).toBe('hello');
  });

  it('should truncate input exceeding MAX_MESSAGE_LENGTH', () => {
    const long = 'a'.repeat(MAX_MESSAGE_LENGTH + 50);
    expect(sanitizeMessage(long)).toHaveLength(MAX_MESSAGE_LENGTH);
  });

  it('should return an empty string for whitespace-only input', () => {
    expect(sanitizeMessage('   ')).toBe('');
  });

  it('should return the original string when within limits', () => {
    expect(sanitizeMessage('hello')).toBe('hello');
  });
});

describe('isNonEmptyMessage', () => {
  it('should return true for a non-empty string', () => {
    expect(isNonEmptyMessage('hello')).toBe(true);
  });

  it('should return false for an empty string', () => {
    expect(isNonEmptyMessage('')).toBe(false);
  });

  it('should return false for whitespace-only input', () => {
    expect(isNonEmptyMessage('   ')).toBe(false);
  });
});

describe('isWithinLengthLimit', () => {
  it('should return true when input is exactly MAX_MESSAGE_LENGTH characters', () => {
    expect(isWithinLengthLimit('a'.repeat(MAX_MESSAGE_LENGTH))).toBe(true);
  });

  it('should return false when input exceeds MAX_MESSAGE_LENGTH after trim', () => {
    expect(isWithinLengthLimit('a'.repeat(MAX_MESSAGE_LENGTH + 1))).toBe(false);
  });

  it('should return true for normal-length input', () => {
    expect(isWithinLengthLimit('Hello!')).toBe(true);
  });
});

describe('isValidUserMessage', () => {
  it('should return true for a valid non-empty message within length', () => {
    expect(isValidUserMessage('I am a planner')).toBe(true);
  });

  it('should return false for an empty string', () => {
    expect(isValidUserMessage('')).toBe(false);
  });

  it('should return false for a whitespace-only string', () => {
    expect(isValidUserMessage('   ')).toBe(false);
  });

  it('should return false when message exceeds MAX_MESSAGE_LENGTH', () => {
    expect(isValidUserMessage('a'.repeat(MAX_MESSAGE_LENGTH + 1))).toBe(false);
  });

  it('should not throw on empty input — safe for untrusted user input', () => {
    expect(() => isValidUserMessage('')).not.toThrow();
    expect(() => isValidUserMessage('a'.repeat(10_000))).not.toThrow();
  });
});
