import Store from 'electron-store';
import { randomBytes } from 'crypto';

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  id: 'claude' | 'openai' | 'deepseek';
  apiKey: string;
  baseURL?: string;
  model: string;
}

/**
 * Store configuration options
 * Uses ELECTRON_USER_DATA env var for testing, otherwise defaults to 'librania'
 */
const storeOptions = {
  projectName: 'librania',
  cwd: process.env.ELECTRON_USER_DATA,
};

/**
 * Get or generate encryption key for secure storage
 * Key is generated once on first launch and persisted
 */
export function getEncryptionKey(): string {
  const keyStore = new Store({
    ...storeOptions,
    name: 'encryption-key',
  });
  let key = keyStore.get('encryptionKey') as string | undefined;

  if (!key) {
    // Generate random 32-byte key (64 hex characters)
    key = randomBytes(32).toString('hex');
    keyStore.set('encryptionKey', key);
  }

  return key;
}

// Initialize encrypted store with encryption key
const secureStore = new Store({
  ...storeOptions,
  name: 'secure-config',
  encryptionKey: getEncryptionKey(),
});

/**
 * Store encrypted provider configuration
 */
export function setProviderConfig(config: ProviderConfig): void {
  secureStore.set(`providers.${config.id}`, config);
}

/**
 * Retrieve decrypted provider configuration
 */
export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return secureStore.get(`providers.${providerId}`) as ProviderConfig | undefined;
}

/**
 * Delete provider configuration
 */
export function deleteProviderConfig(providerId: string): void {
  secureStore.delete(`providers.${providerId}`);
}

/**
 * Get all configured providers
 */
export function getAllProviderConfigs(): ProviderConfig[] {
  const providers = secureStore.get('providers') as Record<string, ProviderConfig> | undefined;

  if (!providers) {
    return [];
  }

  return Object.values(providers);
}
