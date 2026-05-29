import * as crypto from 'crypto';
import { promisify } from 'util';

// Constants for AES-256-GCM encryption
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits

// Promisify scrypt for async key derivation
const scryptAsync = promisify(crypto.scrypt);

/**
 * Derive encryption key from password using scrypt
 * @param password Master password
 * @param salt Salt for key derivation
 * @returns Derived key buffer
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Get master password from environment variable
 * @returns Master password string
 * @throws Error if LIBRANIA_MASTER_KEY not set
 */
function getMasterPassword(): string {
  const masterKey = process.env.LIBRANIA_MASTER_KEY;
  if (!masterKey) {
    throw new Error('LIBRANIA_MASTER_KEY environment variable is not set');
  }
  return masterKey;
}

/**
 * Encrypt API key using AES-256-GCM
 * @param apiKey Plaintext API key to encrypt
 * @returns Base64-encoded encrypted data (salt + iv + tag + ciphertext)
 */
export function encryptApiKey(apiKey: string): string {
  const masterPassword = getMasterPassword();

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from master password and salt (synchronous for simplicity)
  const key = crypto.scryptSync(masterPassword, salt, KEY_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the API key
  let encrypted = cipher.update(apiKey, 'utf8', 'binary');
  encrypted += cipher.final('binary');

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Concatenate: salt + iv + tag + encrypted data
  const result = Buffer.concat([
    salt,
    iv,
    tag,
    Buffer.from(encrypted, 'binary')
  ]);

  // Return as base64
  return result.toString('base64');
}

/**
 * Decrypt API key using AES-256-GCM
 * @param encryptedData Base64-encoded encrypted data
 * @returns Decrypted plaintext API key
 * @throws Error if decryption fails or data is tampered
 */
export function decryptApiKey(encryptedData: string): string {
  const masterPassword = getMasterPassword();

  // Decode from base64
  const buffer = Buffer.from(encryptedData, 'base64');

  // Extract components
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  // Derive key from master password and salt (synchronous for simplicity)
  const key = crypto.scryptSync(masterPassword, salt, KEY_LENGTH);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  // Set authentication tag
  decipher.setAuthTag(tag);

  // Decrypt the data
  let decrypted = decipher.update(encrypted.toString('binary'), 'binary', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
