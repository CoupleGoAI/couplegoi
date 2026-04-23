// Tests for CORS header factory logic.
// Self-contained: duplicates the factory so we don't need Deno imports.

function makeCorsHeaders(envOrigin: string | undefined): Record<string, string> {
  const origin = (envOrigin ?? '').trim() || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  };
}

describe('makeCorsHeaders', () => {
  it('returns * when ALLOWED_ORIGIN is undefined', () => {
    const headers = makeCorsHeaders(undefined);
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('returns * when ALLOWED_ORIGIN is empty string', () => {
    const headers = makeCorsHeaders('');
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('returns configured origin when ALLOWED_ORIGIN is set', () => {
    const headers = makeCorsHeaders('https://app.couplegoai.com');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://app.couplegoai.com');
  });

  it('trims whitespace from ALLOWED_ORIGIN', () => {
    const headers = makeCorsHeaders('  https://app.couplegoai.com  ');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://app.couplegoai.com');
  });

  it('includes required CORS allow-headers', () => {
    const headers = makeCorsHeaders(undefined);
    const allowHeaders = headers['Access-Control-Allow-Headers'];
    expect(allowHeaders).toContain('authorization');
    expect(allowHeaders).toContain('apikey');
    expect(allowHeaders).toContain('content-type');
  });
});
