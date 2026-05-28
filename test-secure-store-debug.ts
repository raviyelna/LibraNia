/**
 * Debug secure store issue
 */

import { setProviderConfig, getProviderConfig, getAllProviderConfigs } from './electron/store/secure.store';

async function debugSecureStore() {
  console.log('\n=== Debugging Secure Store ===\n');

  try {
    // Test 1: Save config
    console.log('1. Saving config...');
    const testConfig = {
      id: 'deepseek' as const,
      apiKey: 'sk-test-12345',
      baseURL: 'https://api.deepseek.com',
      model: 'deepseek-chat',
    };
    console.log('Config to save:', testConfig);
    await setProviderConfig(testConfig);
    console.log('✓ Save completed\n');

    // Test 2: Immediate retrieval
    console.log('2. Immediate retrieval...');
    const retrieved = await getProviderConfig('deepseek');
    console.log('Retrieved:', retrieved);
    console.log('Match:', JSON.stringify(retrieved) === JSON.stringify(testConfig));
    console.log('');

    // Test 3: Get all
    console.log('3. Get all configs...');
    const all = await getAllProviderConfigs();
    console.log('All configs:', all);
    console.log('Count:', all.length);
    console.log('');

    // Test 4: Check store file location
    console.log('4. Store location...');
    const Store = (await import('electron-store')).default;
    const store = new Store({ name: 'secure-config' });
    console.log('Store path:', store.path);
    console.log('Store size:', store.size);
    console.log('Store keys:', [...store]);
    console.log('');

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

debugSecureStore().catch(error => {
  console.error('\n=== Debug Failed ✗ ===');
  console.error(error);
  process.exit(1);
});
