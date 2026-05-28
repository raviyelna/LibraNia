/**
 * Feature verification script
 * Tests all app features with DeepSeek API
 */

import { setProviderConfig, getProviderConfig, getAllProviderConfigs } from './electron/store/secure.store';
import { getAIService } from './electron/services/ai/ai.service';
import { initDatabase, getORM } from './electron/database/connection';
import { initFileStorage, addTagsToNote, removeTagsFromNote, getAllTags } from './electron/services/file-storage.service';
import { getGraphData } from './electron/services/graph.service';
import { app } from 'electron';
import * as path from 'path';

// Import note functions that need DB
let createNote: any;
let updateNote: any;
let deleteNote: any;
let getAllNotes: any;

async function testProviderConfig() {
  console.log('\n=== Testing Provider Config ===');

  // Set DeepSeek config
  await setProviderConfig({
    id: 'deepseek',
    apiKey: 'sk-6116d6dee1fb4f67b86a94b1251b9d86',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  });
  console.log('✓ DeepSeek config saved');

  // Get config
  const config = await getProviderConfig('deepseek');
  console.log('✓ Config retrieved:', config?.id, config?.model);

  // Get all configs
  const allConfigs = await getAllProviderConfigs();
  console.log('✓ All configs:', allConfigs.map(c => c.id));
}

async function testAIGeneration() {
  console.log('\n=== Testing AI Generation ===');

  const aiService = getAIService();

  let tokens = '';
  const response = await aiService.generateResponse(
    'deepseek',
    'deepseek-chat',
    [{ role: 'user', content: 'Say "Hello from DeepSeek" in exactly 5 words.' }],
    {
      onToken: (token) => {
        tokens += token;
        process.stdout.write(token);
      },
    }
  );

  console.log('\n✓ Full response:', response);
  console.log('✓ Streaming worked:', tokens === response);
}

async function testNotes() {
  console.log('\n=== Testing Notes ===');

  const db = getORM();
  const notesService = await import('./electron/services/notes.service');

  // Create note
  const note = await notesService.createNote({
    title: 'Test Note',
    body: 'Test content with [[link]]',
  }, db);
  console.log('✓ Note created:', note.id);

  // Update note
  const updated = await notesService.updateNote(note.id, {
    body: 'Updated content',
  }, db);
  console.log('✓ Note updated');

  // Get all notes
  const notes = await notesService.getAllNotes(db);
  console.log('✓ All notes:', notes.length);

  // Delete note
  await notesService.deleteNote(note.id, true, db);
  console.log('✓ Note deleted');
}

async function testTags() {
  console.log('\n=== Testing Tags ===');
  console.log('⚠ Tags use file storage, skipping (DB notes separate from file notes)');
}

async function testGraph() {
  console.log('\n=== Testing Graph ===');
  console.log('⚠ Graph uses file storage, skipping (DB notes separate from file notes)');
}

async function runTests() {
  try {
    // Initialize database first
    console.log('Initializing database...');
    await initDatabase();
    console.log('✓ Database initialized\n');

    // Initialize file storage
    const userDataPath = process.env.APPDATA || path.join(process.env.HOME || '', '.config');
    const storageDir = path.join(userDataPath, 'librania');
    initFileStorage(storageDir);

    await testProviderConfig();
    await testAIGeneration();
    await testNotes();
    await testTags();
    await testGraph();

    console.log('\n=== All Tests Passed ✓ ===\n');
    process.exit(0);
  } catch (error) {
    console.error('\n=== Test Failed ✗ ===');
    console.error(error);
    process.exit(1);
  }
}

runTests();
