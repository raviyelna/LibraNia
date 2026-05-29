import { randomBytes } from 'crypto';
const storeOptions = {
    projectName: 'librania',
    cwd: process.env.ELECTRON_USER_DATA,
};
let secureStore = null;
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
    }
    else {
        console.log('[SECURE STORE] Reusing existing store instance');
        console.log('[SECURE STORE] Current size:', secureStore.size);
    }
    return secureStore;
}
async function getEncryptionKey() {
    const Store = (await import('electron-store')).default;
    const keyStore = new Store({
        ...storeOptions,
        name: 'encryption-key',
    });
    let key = keyStore.get('encryptionKey');
    if (!key) {
        key = randomBytes(32).toString('hex');
        keyStore.set('encryptionKey', key);
    }
    return key;
}
export async function setProviderConfig(config) {
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
    const verify = store.get(key);
    console.log('[SECURE STORE] Immediate verification:', {
        exists: !!verify,
        id: verify?.id,
        hasApiKey: !!verify?.apiKey
    });
}
export async function getProviderConfig(providerId) {
    const store = await getSecureStore();
    return store.get(`providers.${providerId}`);
}
export async function deleteProviderConfig(providerId) {
    const store = await getSecureStore();
    store.delete(`providers.${providerId}`);
}
export async function getAllProviderConfigs() {
    console.log('[SECURE STORE] getAllProviderConfigs called');
    const store = await getSecureStore();
    console.log('[SECURE STORE] Store size:', store.size);
    console.log('[SECURE STORE] All keys:', [...store]);
    const providers = store.get('providers');
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
