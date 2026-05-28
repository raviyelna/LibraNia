/**
 * Automated provider config test - simulates UI interaction
 */

import { setProviderConfig, getProviderConfig, getAllProviderConfigs } from './electron/store/secure.store';

async function testProviderAPI() {
  console.log('\n=== Automated Provider Config Test ===\n');

  try {
    // Test 1: Save config
    console.log('1. Simulating UI save...');
    const config = {
      id: 'deepseek' as const,
      apiKey: 'sk-test-automated-12345',
      baseURL: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    };
    console.log('Saving:', {
      id: config.id,
      apiKey: config.apiKey.substring(0, 15) + '...',
      model: config.model
    });
    await setProviderConfig(config);
    console.log('✓ Save completed\n');

    // Test 2: Immediate retrieval
    console.log('2. Simulating UI reload (same session)...');
    const retrieved = await getProviderConfig('deepseek');
    console.log('Retrieved:', {
      id: retrieved?.id,
      apiKey: retrieved?.apiKey?.substring(0, 15) + '...',
      model: retrieved?.model
    });
    const matchImmediate = retrieved?.apiKey === config.apiKey;
    console.log('Match:', matchImmediate ? '✓' : '✗');
    console.log('');

    // Test 3: Get all configs
    console.log('3. Simulating UI getAllConfigs...');
    const all = await getAllProviderConfigs();
    console.log('All configs count:', all.length);
    console.log('Configs:', all.map(c => ({
      id: c.id,
      apiKey: c.apiKey.substring(0, 15) + '...',
      model: c.model
    })));
    console.log('');

    // Results
    if (matchImmediate && all.length > 0) {
      console.log('=== Test PASSED ✓ ===');
      console.log('Config persists within session\n');
      process.exit(0);
    } else {
      console.error('=== Test FAILED ✗ ===');
      console.error('Config not persisting');
      console.error('Immediate match:', matchImmediate);
      console.error('All configs count:', all.length);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n=== Test FAILED ✗ ===');
    console.error(error);
    process.exit(1);
  }
}

testProviderAPI();
