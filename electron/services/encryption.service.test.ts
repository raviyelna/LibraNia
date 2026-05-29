import { describe, it, expect, beforeAll } from 'vitest';
import { encryptApiKey, decryptApiKey } from './encryption.service';

describe('Encryption Service', () => {
  beforeAll(() => {
    // Set master key for testing
    process.env.LIBRANIA_MASTER_KEY = 'test-master-key-32-chars-long!!';
  });

  it('should encrypt API key and return base64 string different from input', () => {
    const plaintext = 'my-secret-api-key-12345';
    const encrypted = encryptApiKey(plaintext);

    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(plaintext);
    // Base64 encoded string should only contain valid base64 characters
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('should decrypt encrypted API key and return original plaintext', () => {
    const plaintext = 'my-secret-api-key-12345';
    const encrypted = encryptApiKey(plaintext);
    const decrypted = decryptApiKey(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext for same input (random IV/salt)', () => {
    const plaintext = 'my-secret-api-key-12345';
    const encrypted1 = encryptApiKey(plaintext);
    const encrypted2 = encryptApiKey(plaintext);

    expect(encrypted1).not.toBe(encrypted2);
    // But both should decrypt to the same plaintext
    expect(decryptApiKey(encrypted1)).toBe(plaintext);
    expect(decryptApiKey(encrypted2)).toBe(plaintext);
  });

  it('should throw error if LIBRANIA_MASTER_KEY env var not set', () => {
    const originalKey = process.env.LIBRANIA_MASTER_KEY;
    delete process.env.LIBRANIA_MASTER_KEY;

    expect(() => encryptApiKey('test')).toThrow();

    // Restore key
    process.env.LIBRANIA_MASTER_KEY = originalKey;
  });

  it('should throw error for tampered ciphertext (auth tag validation)', () => {
    const plaintext = 'my-secret-api-key-12345';
    const encrypted = encryptApiKey(plaintext);

    // Tamper with the encrypted data by changing a character
    const tamperedEncrypted = encrypted.slice(0, -5) + 'XXXXX';

    expect(() => decryptApiKey(tamperedEncrypted)).toThrow();
  });
});
