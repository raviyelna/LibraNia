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
    const Store = (await import('conf')).default;
    const encryptionKey = await getEncryptionKey();
    console.log('[SECURE STORE] Encryption key length:', encryptionKey.length);
    console.log('[SECURE STORE] Store options:', storeOptions);
    secureStore = new Store({
      ...storeOptions,
      configName: 'secure-config',
      encryptionKey,
    });
    console.log('[SECURE STORE] Store initialized at:', secureStore.path);
    console.log('[SECURE STORE] Store size:', secureStore.size);
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
  const Store = (await import('conf')).default;
  const keyStore = new Store({
    ...storeOptions,
    configName: 'encryption-key',
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
 * Falls back to environment variables if not in store
 */
export async function getProviderConfig(providerId: string): Promise<ProviderConfig | undefined> {
  const store = await getSecureStore();
  let config = store.get(`providers.${providerId}`) as ProviderConfig | undefined;

  // Fallback to environment variables if not in store
  if (!config) {
    const envPrefix = providerId.toUpperCase();
    const apiKey = process.env[`${envPrefix}_API_KEY`];
    const baseURL = process.env[`${envPrefix}_BASE_URL`];
    const model = process.env[`${envPrefix}_MODEL`];

    if (apiKey && model) {
      config = {
        id: providerId as 'claude' | 'openai' | 'deepseek',
        apiKey,
        baseURL,
        model,
      };
    }
  }

  return config;
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
 * Includes both store configs and environment variable configs
 */
export async function getAllProviderConfigs(): Promise<ProviderConfig[]> {
  console.log('[SECURE STORE] getAllProviderConfigs called');
  const store = await getSecureStore();
  console.log('[SECURE STORE] Store size:', store.size);

  const providers = store.get('providers') as Record<string, ProviderConfig> | undefined;

  const configs: ProviderConfig[] = providers ? Object.values(providers) : [];

  // Add environment variable configs if not in store
  const envProviders: Array<'claude' | 'openai' | 'deepseek'> = ['claude', 'openai', 'deepseek'];
  for (const providerId of envProviders) {
    const existsInStore = configs.some(c => c.id === providerId);
    if (!existsInStore) {
      const envPrefix = providerId.toUpperCase();
      const apiKey = process.env[`${envPrefix}_API_KEY`];
      const baseURL = process.env[`${envPrefix}_BASE_URL`];
      const model = process.env[`${envPrefix}_MODEL`];

      if (apiKey && model) {
        configs.push({
          id: providerId,
          apiKey,
          baseURL,
          model,
        });
      }
    }
  }

  console.log('[SECURE STORE] Returning configs:', configs.map(c => ({
    id: c.id,
    hasApiKey: !!c.apiKey,
    model: c.model
  })));
  return configs;
}
