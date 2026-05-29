import * as crypto from 'crypto';
import { promisify } from 'util';
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const scryptAsync = promisify(crypto.scrypt);
async function deriveKey(password, salt) {
    return (await scryptAsync(password, salt, KEY_LENGTH));
}
function getMasterPassword() {
    const masterKey = process.env.LIBRANIA_MASTER_KEY;
    if (!masterKey) {
        throw new Error('LIBRANIA_MASTER_KEY environment variable is not set');
    }
    return masterKey;
}
export function encryptApiKey(apiKey) {
    const masterPassword = getMasterPassword();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.scryptSync(masterPassword, salt, KEY_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'binary');
    encrypted += cipher.final('binary');
    const tag = cipher.getAuthTag();
    const result = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'binary')
    ]);
    return result.toString('base64');
}
export function decryptApiKey(encryptedData) {
    const masterPassword = getMasterPassword();
    const buffer = Buffer.from(encryptedData, 'base64');
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const key = crypto.scryptSync(masterPassword, salt, KEY_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted.toString('binary'), 'binary', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
