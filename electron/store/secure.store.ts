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
 * Lazy-loaded Store instance
 */
let secureStore: any = null;

/**
 * Get or initialize secure store instance
 */
async function getSecureStore() {
  if (!secureStore) {
    const Store = (await import('electron-store')).default;
    const encryptionKey = await getEncryptionKey();
    secureStore = new Store({
      ...storeOptions,
      name: 'secure-config',
      encryptionKey,
    });
  }
  return secureStore;
}

/**
 * Get or generate encryption key for secure storage
 * Key is generated once on first launch and persisted
 */
async function getEncryptionKey(): Promise<string> {
  const Store = (await import('electron-store')).default;
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

/**
 * Store encrypted provider configuration
 */
export async function setProviderConfig(config: ProviderConfig): Promise<void> {
  const store = await getSecureStore();
  store.set(`providers.${config.id}`, config);
}

/**
 * Retrieve decrypted provider configuration
 */
export async function getProviderConfig(providerId: string): Promise<ProviderConfig | undefined> {
  const store = await getSecureStore();
  return store.get(`providers.${providerId}`) as ProviderConfig | undefined;
}

/**
 * Delete provider configuration
 */
export async function deleteProviderConfig(providerId: string): Promise<void> {
  const store = await getSecureStore();
  store.delete(`providers.${providerId}`);
}

/**
 * Get all configured providers
 */
export async function getAllProviderConfigs(): Promise<ProviderConfig[]> {
  const store = await getSecureStore();
  const providers = store.get('providers') as Record<string, ProviderConfig> | undefined;

  if (!providers) {
    return [];
  }

  return Object.values(providers);
}
