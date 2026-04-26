import { redact } from '../redact';

describe('redact', () => {
  it('redacts direct identifiers like email, phone, urls, and long tokens', () => {
    const result = redact(
      'Email alex@example.com, call +45 12 34 56 78, visit https://example.com, token sk_test_secret_12345678',
    );

    expect(result.droppedAnything).toBe(true);
    expect(result.text).not.toContain('alex@example.com');
    expect(result.text).not.toContain('+45 12 34 56 78');
    expect(result.text).not.toContain('https://example.com');
    expect(result.text).not.toContain('sk_test_secret_12345678');
    expect(result.text.match(/\[redacted\]/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps allowlisted names and common capitalized non-name words', () => {
    const result = redact('We met Alex in Paris and talked about React on Monday.', ['Alex']);

    expect(result.text).toContain('Alex');
    expect(result.text).toContain('Paris');
    expect(result.text).toContain('React');
    expect(result.text).toContain('Monday');
  });

  it('masks mid-sentence capitalized third-party names', () => {
    const result = redact('Yesterday we talked to Maria about dinner and then Sam called.');

    expect(result.droppedAnything).toBe(true);
    expect(result.text).toContain('someone');
    expect(result.text).not.toContain('Maria');
    expect(result.text).not.toContain('Sam');
  });

  it('truncates long turns to the maximum supported length', () => {
    const input = `start ${'x'.repeat(900)}`;
    const result = redact(input);

    expect(result.droppedAnything).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(800);
  });
});
