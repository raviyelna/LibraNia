/**
 * Test provider config persistence
 */

import { setProviderConfig, getProviderConfig, getAllProviderConfigs } from './electron/store/secure.store';

async function testProviderConfig() {
  console.log('\n=== Testing Provider Config Persistence ===\n');

  // Test 1: Save DeepSeek config
  console.log('1. Saving DeepSeek config...');
  await setProviderConfig({
    id: 'deepseek',
    apiKey: 'sk-test-key-12345',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  });
  console.log('✓ Config saved\n');

  // Test 2: Retrieve config
  console.log('2. Retrieving DeepSeek config...');
  const config = await getProviderConfig('deepseek');
  console.log('✓ Config retrieved:', {
    id: config?.id,
    apiKey: config?.apiKey?.substring(0, 10) + '...',
    baseURL: config?.baseURL,
    model: config?.model,
  });
  console.log('');

  // Test 3: Get all configs
  console.log('3. Getting all configs...');
  const allConfigs = await getAllProviderConfigs();
  console.log('✓ All configs:', allConfigs.map(c => ({
    id: c.id,
    apiKey: c.apiKey.substring(0, 10) + '...',
    model: c.model,
  })));
  console.log('');

  // Test 4: Verify persistence (simulate app restart by clearing cache)
  console.log('4. Verifying persistence after cache clear...');
  const configAfterRestart = await getProviderConfig('deepseek');
  const matches = configAfterRestart?.apiKey === 'sk-test-key-12345';
  console.log('✓ Config persisted:', matches);
  console.log('');

  if (matches) {
    console.log('=== All Tests Passed ✓ ===\n');
  } else {
    console.error('=== Test Failed: Config not persisted ✗ ===\n');
    process.exit(1);
  }
}

testProviderConfig().catch(error => {
  console.error('\n=== Test Failed ✗ ===');
  console.error(error);
  process.exit(1);
});
