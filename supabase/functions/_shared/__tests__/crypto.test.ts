// Tests for AES-256-GCM encryption helpers.
// Self-contained: duplicates crypto logic so we don't need Deno imports.
// These tests run under Node with Web Crypto API (Node 20+).

const PREFIX = 'ENC:v1:';
const IV_BYTES = 12;

function b64ToBytes(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer as ArrayBuffer;
}

function bytesToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function importKey(keyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', b64ToBytes(keyB64), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

async function encrypt(plaintext: string, keyB64: string): Promise<string> {
  const key = await importKey(keyB64);
  const ivBytes = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const iv = ivBytes.buffer as ArrayBuffer;
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, key, encoded);
  return `${PREFIX}${bytesToB64(iv)}:${bytesToB64(cipherBuf)}`;
}

async function decrypt(wire: string, keyB64: string): Promise<string> {
  if (!wire.startsWith(PREFIX)) return wire;
  const parts = wire.slice(PREFIX.length).split(':');
  if (parts.length !== 2) throw new Error('crypto: malformed wire format');
  const iv = new Uint8Array(b64ToBytes(parts[0]));
  const cipherBuf = b64ToBytes(parts[1]);
  const key = await importKey(keyB64);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
  return new TextDecoder().decode(plainBuf);
}

function makeTestKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

describe('crypto – encrypt / decrypt', () => {
  const key = makeTestKey();

  it('round-trips plaintext through encrypt → decrypt', async () => {
    const plaintext = 'Hello, this is a private message 🔒';
    const wire = await encrypt(plaintext, key);
    const decrypted = await decrypt(wire, key);
    expect(decrypted).toBe(plaintext);
  });

  it('produces wire format with ENC:v1: prefix', async () => {
    const wire = await encrypt('test', key);
    expect(wire.startsWith('ENC:v1:')).toBe(true);
  });

  it('produces unique ciphertext for same plaintext (random IV)', async () => {
    const a = await encrypt('same text', key);
    const b = await encrypt('same text', key);
    expect(a).not.toBe(b);
  });

  it('decrypt passes through legacy plaintext (no ENC:v1: prefix)', async () => {
    const legacy = 'This is an old unencrypted message';
    const result = await decrypt(legacy, key);
    expect(result).toBe(legacy);
  });

  it('throws on tampered ciphertext', async () => {
    const wire = await encrypt('secret', key);
    // Flip a character in the ciphertext portion
    const parts = wire.split(':');
    const lastPart = parts[parts.length - 1];
    const tampered = parts.slice(0, -1).join(':') + ':' + 'A' + lastPart.slice(1);
    await expect(decrypt(tampered, key)).rejects.toThrow();
  });

  it('throws on malformed wire format', async () => {
    await expect(decrypt('ENC:v1:onlyonepart', key)).rejects.toThrow('malformed');
  });

  it('decrypts with correct key, rejects wrong key', async () => {
    const wire = await encrypt('secret data', key);
    const wrongKey = makeTestKey();
    await expect(decrypt(wire, wrongKey)).rejects.toThrow();
  });

  it('handles empty string', async () => {
    const wire = await encrypt('', key);
    const decrypted = await decrypt(wire, key);
    expect(decrypted).toBe('');
  });

  it('handles long text', async () => {
    const longText = 'x'.repeat(10_000);
    const wire = await encrypt(longText, key);
    const decrypted = await decrypt(wire, key);
    expect(decrypted).toBe(longText);
  });
});
