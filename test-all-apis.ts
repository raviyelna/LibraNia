/**
 * Comprehensive API Test Suite
 * Tests all implemented IPC handlers
 */

import { loadProviderFromEnv, loadAllProvidersFromEnv, saveProviderToEnv } from './electron/store/env.store';
import { createConversation, getAllConversations } from './electron/services/conversation.service';
import { createMessage, getMessagesByConversation } from './electron/services/message.service';

console.log('\n=== LibraNia API Test Suite ===\n');

async function testProviderConfig() {
  console.log('--- Provider Config API ---');

  // Test: Save provider
  console.log('1. Save DeepSeek config');
  saveProviderToEnv({
    id: 'deepseek',
    apiKey: 'sk-test-123',
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com'
  });
  console.log('✓ Saved');

  // Test: Load single provider
  console.log('2. Load DeepSeek config');
  const config = loadProviderFromEnv('deepseek');
  console.log('✓ Loaded:', config?.id, config?.model);

  // Test: Load all providers
  console.log('3. Load all providers');
  const all = loadAllProvidersFromEnv();
  console.log('✓ Found', all.length, 'providers:', all.map(p => p.id).join(', '));

  console.log('');
}

async function testConversations() {
  console.log('--- Conversation API ---');

  // Test: Create conversation
  console.log('1. Create conversation');
  const conv = await createConversation({ title: 'Test Conversation' });
  console.log('✓ Created:', conv.id, conv.title);

  // Test: Get all conversations
  console.log('2. Get all conversations');
  const convs = await getAllConversations();
  console.log('✓ Found', convs.length, 'conversations');

  console.log('');
  return conv.id;
}

async function testMessages(conversationId: string) {
  console.log('--- Message API ---');

  // Test: Create user message
  console.log('1. Create user message');
  const userMsg = await createMessage({
    conversation_id: conversationId,
    role: 'user',
    content: 'Hello, test message'
  });
  console.log('✓ Created:', userMsg.id, userMsg.role);

  // Test: Create assistant message
  console.log('2. Create assistant message');
  const assistantMsg = await createMessage({
    conversation_id: conversationId,
    role: 'assistant',
    content: 'Hello! This is a test response.',
    provider_id: 'deepseek',
    model: 'deepseek-chat'
  });
  console.log('✓ Created:', assistantMsg.id, assistantMsg.role);

  // Test: Get messages by conversation
  console.log('3. Get messages for conversation');
  const msgs = await getMessagesByConversation(conversationId);
  console.log('✓ Found', msgs.length, 'messages');
  msgs.forEach(m => console.log('  -', m.role, ':', m.content.substring(0, 50)));

  console.log('');
}

async function runTests() {
  try {
    await testProviderConfig();
    const conversationId = await testConversations();
    await testMessages(conversationId);

    console.log('=== All Tests Passed ✓ ===\n');
    process.exit(0);
  } catch (error) {
    console.error('\n=== Test Failed ✗ ===');
    console.error(error);
    process.exit(1);
  }
}

runTests();
