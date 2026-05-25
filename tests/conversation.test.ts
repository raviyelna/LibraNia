import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';
import {
  createConversation,
  addMessage,
  addCitations,
  getConversation,
  getAllConversations,
  deleteConversation,
  updateConversationTitle,
} from '../electron/services/conversation.service';

describe('Conversation Service', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeEach(() => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // Create tables
    sqlite.exec(`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        provider_id TEXT,
        model TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE citations (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        snippet TEXT,
        position INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );
    `);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('Test 1: createConversation generates UUID, sets timestamps, auto-generates title from first message per D-11', async () => {
    const conversation = await createConversation(
      { title: 'What is React?' },
      db
    );

    expect(conversation.id).toBeDefined();
    expect(conversation.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(conversation.title).toBe('What is React?');
    expect(conversation.created_at).toBeInstanceOf(Date);
    expect(conversation.updated_at).toBeInstanceOf(Date);
    expect(conversation.created_at.getTime()).toBe(conversation.updated_at.getTime());
  });

  it('Test 2: addMessage inserts message with conversation_id FK, role, content, provider metadata', async () => {
    const conversation = await createConversation(
      { title: 'Test conversation' },
      db
    );

    const message = await addMessage(
      {
        conversation_id: conversation.id,
        role: 'user',
        content: 'Hello, AI!',
        provider_id: 'claude',
        model: 'claude-sonnet-4',
      },
      db
    );

    expect(message.id).toBeDefined();
    expect(message.conversation_id).toBe(conversation.id);
    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello, AI!');
    expect(message.provider_id).toBe('claude');
    expect(message.model).toBe('claude-sonnet-4');
    expect(message.created_at).toBeInstanceOf(Date);
  });

  it('Test 3: addCitations inserts citations linked to message_id with position tracking', async () => {
    const conversation = await createConversation(
      { title: 'Test conversation' },
      db
    );

    const message = await addMessage(
      {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Here is the answer [1] [2]',
      },
      db
    );

    const citations = await addCitations(
      [
        {
          message_id: message.id,
          url: 'https://example.com/1',
          title: 'Example 1',
          snippet: 'First citation',
          position: 1,
        },
        {
          message_id: message.id,
          url: 'https://example.com/2',
          title: 'Example 2',
          snippet: 'Second citation',
          position: 2,
        },
      ],
      db
    );

    expect(citations).toHaveLength(2);
    expect(citations[0].message_id).toBe(message.id);
    expect(citations[0].position).toBe(1);
    expect(citations[1].position).toBe(2);
  });

  it('Test 4: getConversation returns conversation with all messages and citations', async () => {
    const conversation = await createConversation(
      { title: 'Test conversation' },
      db
    );

    const message1 = await addMessage(
      {
        conversation_id: conversation.id,
        role: 'user',
        content: 'Question',
      },
      db
    );

    const message2 = await addMessage(
      {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Answer [1]',
      },
      db
    );

    await addCitations(
      [
        {
          message_id: message2.id,
          url: 'https://example.com',
          title: 'Example',
          snippet: 'Citation',
          position: 1,
        },
      ],
      db
    );

    const result = await getConversation(conversation.id, db);

    expect(result).toBeDefined();
    expect(result!.id).toBe(conversation.id);
    expect(result!.messages).toHaveLength(2);
    expect(result!.messages[0].role).toBe('user');
    expect(result!.messages[1].role).toBe('assistant');
    expect(result!.messages[1].citations).toHaveLength(1);
    expect(result!.messages[1].citations![0].position).toBe(1);
  });

  it('Test 5: getAllConversations returns conversations ordered by updated_at DESC', async () => {
    const conv1 = await createConversation({ title: 'First' }, db);

    // Wait 1100ms to ensure different timestamps (SQLite timestamp mode uses seconds)
    await new Promise(resolve => setTimeout(resolve, 1100));

    const conv2 = await createConversation({ title: 'Second' }, db);

    const conversations = await getAllConversations(db);

    expect(conversations).toHaveLength(2);
    expect(conversations[0].id).toBe(conv2.id); // Most recent first
    expect(conversations[1].id).toBe(conv1.id);
  });

  it('Test 6: deleteConversation removes conversation and cascades to messages and citations', async () => {
    const conversation = await createConversation(
      { title: 'Test conversation' },
      db
    );

    const message = await addMessage(
      {
        conversation_id: conversation.id,
        role: 'user',
        content: 'Test',
      },
      db
    );

    await addCitations(
      [
        {
          message_id: message.id,
          url: 'https://example.com',
          title: 'Example',
          snippet: 'Citation',
          position: 1,
        },
      ],
      db
    );

    await deleteConversation(conversation.id, db);

    const result = await getConversation(conversation.id, db);
    expect(result).toBeNull();

    // Verify messages and citations were cascaded
    const messagesResult = sqlite.prepare('SELECT * FROM messages WHERE conversation_id = ?').all(conversation.id);
    expect(messagesResult).toHaveLength(0);
  });

  it('Test 7: updateConversationTitle updates title and updated_at timestamp', async () => {
    const conversation = await createConversation(
      { title: 'Original title' },
      db
    );

    const originalUpdatedAt = conversation.updated_at;

    // Wait 1100ms to ensure different timestamp (SQLite timestamp mode uses seconds)
    await new Promise(resolve => setTimeout(resolve, 1100));

    const updated = await updateConversationTitle(
      conversation.id,
      'New title',
      db
    );

    expect(updated.title).toBe('New title');
    expect(updated.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
