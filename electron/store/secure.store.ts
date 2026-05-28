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
    console.log('[SECURE STORE] Initializing new store instance');
    const Store = (await import('electron-store')).default;
    const encryptionKey = await getEncryptionKey();
    console.log('[SECURE STORE] Encryption key length:', encryptionKey.length);
    console.log('[SECURE STORE] Store options:', storeOptions);
    secureStore = new Store({
      ...storeOptions,
      name: 'secure-config',
      encryptionKey,
    });
    console.log('[SECURE STORE] Store initialized at:', secureStore.path);
    console.log('[SECURE STORE] Store size:', secureStore.size);
    console.log('[SECURE STORE] Store contents:', JSON.stringify([...secureStore], null, 2));
  } else {
    console.log('[SECURE STORE] Reusing existing store instance');
    console.log('[SECURE STORE] Current size:', secureStore.size);
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
  console.log('[SECURE STORE] setProviderConfig called with:', {
    id: config.id,
    hasApiKey: !!config.apiKey,
    apiKeyLength: config.apiKey?.length,
    model: config.model,
    baseURL: config.baseURL
  });
  const store = await getSecureStore();
  const key = `providers.${config.id}`;
  console.log('[SECURE STORE] Setting key:', key);
  store.set(key, config);
  console.log('[SECURE STORE] Store size after set:', store.size);
  console.log('[SECURE STORE] All store keys:', [...store]);

  // Immediate verification
  const verify = store.get(key);
  console.log('[SECURE STORE] Immediate verification:', {
    exists: !!verify,
    id: verify?.id,
    hasApiKey: !!verify?.apiKey
  });
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
  console.log('[SECURE STORE] getAllProviderConfigs called');
  const store = await getSecureStore();
  console.log('[SECURE STORE] Store size:', store.size);
  console.log('[SECURE STORE] All keys:', [...store]);

  const providers = store.get('providers') as Record<string, ProviderConfig> | undefined;
  console.log('[SECURE STORE] Raw providers object:', providers);

  if (!providers) {
    console.log('[SECURE STORE] No providers found, returning empty array');
    return [];
  }

  const result = Object.values(providers);
  console.log('[SECURE STORE] Returning configs:', result.map(c => ({
    id: c.id,
    hasApiKey: !!c.apiKey,
    model: c.model
  })));
  return result;
}
