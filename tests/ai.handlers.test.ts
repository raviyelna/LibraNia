import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserWindow } from 'electron';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';

// Mock modules before importing handlers
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock('../electron/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../electron/database/connection', () => ({
  getORM: vi.fn(),
}));

vi.mock('../electron/services/ai/ai.service', () => ({
  getAIService: vi.fn(),
}));

vi.mock('../electron/services/notes.service', () => ({
  getNoteById: vi.fn(),
}));

describe('AI IPC Handlers', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;
  let mockWindow: any;
  let mockAIService: any;
  let mockWebSearchService: any;

  beforeEach(async () => {
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

      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );
    `);

    // Mock BrowserWindow
    mockWindow = {
      webContents: {
        send: vi.fn(),
      },
    };

    // Mock AI service
    mockAIService = {
      generateResponse: vi.fn(),
    };

    // Mock web search service
    mockWebSearchService = {
      search: vi.fn(),
      formatResultsForPrompt: vi.fn(),
      extractCitations: vi.fn(),
    };

    // Setup module mocks
    const { getORM } = await import('../electron/database/connection');
    const { getAIService } = await import('../electron/services/ai/ai.service');
    vi.mocked(getORM).mockReturnValue(db);
    vi.mocked(getAIService).mockReturnValue(mockAIService);
  });

  afterEach(() => {
    sqlite.close();
    vi.clearAllMocks();
  });

  it('Test 1: chat:send creates conversation if new, adds user message, generates AI response', async () => {
    // Mock AI response
    mockAIService.generateResponse.mockResolvedValue('AI response text');

    const { registerAIHandlers } = await import('../electron/ipc/ai.handlers');
    const handlers = registerAIHandlers(mockWindow as BrowserWindow);

    const result = await handlers['chat:send']({
      conversationId: null,
      message: 'What is React?',
      providerId: 'claude',
      model: 'claude-sonnet-4',
      useWebSearch: false,
    });

    expect(result.conversationId).toBeDefined();
    expect(result.messageId).toBeDefined();
    expect(result.response).toBe('AI response text');

    // Verify conversation was created
    const conversations = sqlite.prepare('SELECT * FROM conversations').all();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].title).toBe('What is React?');

    // Verify messages were added (user + assistant)
    const messages = sqlite.prepare('SELECT * FROM messages ORDER BY created_at').all();
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('What is React?');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toBe('AI response text');
    expect(messages[1].provider_id).toBe('claude');
    expect(messages[1].model).toBe('claude-sonnet-4');
  });

  it('Test 2: chat:send integrates web search results into AI prompt per D-12 (parallel execution)', async () => {
    // Mock web search results
    mockWebSearchService.search.mockResolvedValue([
      { title: 'React Docs', url: 'https://react.dev', snippet: 'React is a library' },
    ]);
    mockWebSearchService.formatResultsForPrompt.mockReturnValue('\n\nWeb search results:\n[1] React Docs\nReact is a library\nSource: https://react.dev');
    mockWebSearchService.extractCitations.mockReturnValue([
      { url: 'https://react.dev', title: 'React Docs', snippet: 'React is a library', position: 1 },
    ]);

    // Mock AI response
    mockAIService.generateResponse.mockResolvedValue('AI response with web context');

    const { registerAIHandlers } = await import('../electron/ipc/ai.handlers');
    const handlers = registerAIHandlers(mockWindow as BrowserWindow, mockWebSearchService);

    const result = await handlers['chat:send']({
      conversationId: null,
      message: 'What is React?',
      providerId: 'claude',
      model: 'claude-sonnet-4',
      useWebSearch: true,
    });

    expect(result.response).toBe('AI response with web context');
    expect(mockWebSearchService.search).toHaveBeenCalledWith('What is React?', 5);
    expect(mockWebSearchService.formatResultsForPrompt).toHaveBeenCalled();

    // Verify AI was called with web search context
    expect(mockAIService.generateResponse).toHaveBeenCalled();
    const aiCallArgs = mockAIService.generateResponse.mock.calls[0];
    const messages = aiCallArgs[2];
    expect(messages.some((m: any) => m.content.includes('Web search results'))).toBe(true);
  });

  it('Test 3: chat:send stores AI response message with provider metadata per D-06', async () => {
    mockAIService.generateResponse.mockResolvedValue('AI response');

    const { registerAIHandlers } = await import('../electron/ipc/ai.handlers');
    const handlers = registerAIHandlers(mockWindow as BrowserWindow);

    await handlers['chat:send']({
      conversationId: null,
      message: 'Test question',
      providerId: 'openai',
      model: 'gpt-4',
      useWebSearch: false,
    });

    const messages = sqlite.prepare('SELECT * FROM messages WHERE role = ?').all('assistant');
    expect(messages).toHaveLength(1);
    expect(messages[0].provider_id).toBe('openai');
    expect(messages[0].model).toBe('gpt-4');
  });

  it('Test 4: chat:send stores citations from web search per D-19', async () => {
    mockWebSearchService.search.mockResolvedValue([
      { title: 'Source 1', url: 'https://example.com/1', snippet: 'Snippet 1' },
      { title: 'Source 2', url: 'https://example.com/2', snippet: 'Snippet 2' },
    ]);
    mockWebSearchService.formatResultsForPrompt.mockReturnValue('\n\nWeb search results:\n[1] Source 1\nSnippet 1\nSource: https://example.com/1\n\n[2] Source 2\nSnippet 2\nSource: https://example.com/2');
    mockWebSearchService.extractCitations.mockReturnValue([
      { url: 'https://example.com/1', title: 'Source 1', snippet: 'Snippet 1', position: 1 },
      { url: 'https://example.com/2', title: 'Source 2', snippet: 'Snippet 2', position: 2 },
    ]);

    mockAIService.generateResponse.mockResolvedValue('AI response with citations [1] [2]');

    const { registerAIHandlers } = await import('../electron/ipc/ai.handlers');
    const handlers = registerAIHandlers(mockWindow as BrowserWindow, mockWebSearchService);

    await handlers['chat:send']({
      conversationId: null,
      message: 'Test question',
      providerId: 'claude',
      model: 'claude-sonnet-4',
      useWebSearch: true,
    });

    const citations = sqlite.prepare('SELECT * FROM citations ORDER BY position').all();
    expect(citations).toHaveLength(2);
    expect(citations[0].url).toBe('https://example.com/1');
    expect(citations[0].position).toBe(1);
    expect(citations[1].url).toBe('https://example.com/2');
    expect(citations[1].position).toBe(2);
  });

  it('Test 5: chat:send sends streaming tokens via mainWindow.webContents.send per D-02', async () => {
    let onTokenCallback: ((token: string) => void) | null = null;

    mockAIService.generateResponse.mockImplementation(async (providerId: string, model: string, messages: any[], options: any) => {
      onTokenCallback = options.onToken;
      // Simulate streaming tokens
      onTokenCallback('Hello');
      onTokenCallback(' ');
      onTokenCallback('world');
      return 'Hello world';
    });

    const { registerAIHandlers } = await import('../electron/ipc/ai.handlers');
    const handlers = registerAIHandlers(mockWindow as BrowserWindow);

    await handlers['chat:send']({
      conversationId: null,
      message: 'Test',
      providerId: 'claude',
      model: 'claude-sonnet-4',
      useWebSearch: false,
    });

    // Verify tokens were sent to renderer
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('chat:token', expect.objectContaining({
      token: 'Hello',
    }));
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('chat:token', expect.objectContaining({
      token: ' ',
    }));
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('chat:token', expect.objectContaining({
      token: 'world',
    }));
  });

  it('Test 6: chat:summarizeNote generates summary of note content per AI-07', async () => {
    // Insert test note
    sqlite.prepare('INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'note-1',
      'Test Note',
      'This is the note body content that needs summarization.',
      null,
      Date.now(),
      Date.now(),
      null
    );

    const { getNoteById } = await import('../electron/services/notes.service');
    vi.mocked(getNoteById).mockResolvedValue({
      id: 'note-1',
      title: 'Test Note',
      body: 'This is the note body content that needs summarization.',
      metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    mockAIService.generateResponse.mockResolvedValue('Summary: This note discusses content summarization.');

    const { registerAIHandlers } = await import('../electron/ipc/ai.handlers');
    const handlers = registerAIHandlers(mockWindow as BrowserWindow);

    const result = await handlers['chat:summarizeNote']({
      noteId: 'note-1',
    });

    expect(result.summary).toBe('Summary: This note discusses content summarization.');
    expect(mockAIService.generateResponse).toHaveBeenCalled();
  });

  it('Test 7: conversation:getAll returns all conversations', async () => {
    // Insert test conversations
    sqlite.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run('conv-1', 'First', Date.now(), Date.now());
    sqlite.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run('conv-2', 'Second', Date.now(), Date.now());

    const { registerAIHandlers } = await import('../electron/ipc/ai.handlers');
    const handlers = registerAIHandlers(mockWindow as BrowserWindow);

    const result = await handlers['conversation:getAll']();

    expect(result).toHaveLength(2);
  });

  it('Test 8: conversation:get returns conversation with messages and citations', async () => {
    // Insert test data
    const convId = 'conv-1';
    const msgId = 'msg-1';
    sqlite.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run(convId, 'Test', Date.now(), Date.now());
    sqlite.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?)').run(msgId, convId, 'user', 'Question', null, null, Date.now());
    sqlite.prepare('INSERT INTO citations VALUES (?, ?, ?, ?, ?, ?, ?)').run('cit-1', msgId, 'https://example.com', 'Example', 'Snippet', 1, Date.now());

    const { registerAIHandlers } = await import('../electron/ipc/ai.handlers');
    const handlers = registerAIHandlers(mockWindow as BrowserWindow);

    const result = await handlers['conversation:get']({ conversationId: convId });

    expect(result.id).toBe(convId);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].citations).toHaveLength(1);
  });

  it('Test 9: conversation:delete removes conversation', async () => {
    // Insert test conversation
    sqlite.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?)').run('conv-1', 'Test', Date.now(), Date.now());

    const { registerAIHandlers } = await import('../electron/ipc/ai.handlers');
    const handlers = registerAIHandlers(mockWindow as BrowserWindow);

    const result = await handlers['conversation:delete']({ conversationId: 'conv-1' });

    expect(result.success).toBe(true);

    const conversations = sqlite.prepare('SELECT * FROM conversations').all();
    expect(conversations).toHaveLength(0);
  });
});
