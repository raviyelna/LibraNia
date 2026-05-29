/**
 * Tests for graph IPC handlers
 * TDD RED phase - these tests should fail initially
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

// Mock database connection
vi.mock('../database/connection', () => ({
  getORM: vi.fn(),
}));

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Graph IPC Handlers', () => {
  let db: ReturnType<typeof drizzle>;
  let rawDb: Database.Database;

  beforeEach(async () => {
    // Create in-memory database for testing
    rawDb = new Database(':memory:');
    db = drizzle(rawDb, { schema });

    // Create tables
    rawDb.exec(`
      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE note_tags (
        note_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE links (
        id TEXT PRIMARY KEY,
        source_note_id TEXT NOT NULL,
        target_note_id TEXT NOT NULL,
        link_type TEXT NOT NULL DEFAULT 'manual',
        similarity_score REAL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE SET NULL
      );
    `);

    // Mock getORM to return our test database
    const { getORM } = await import('../database/connection');
    vi.mocked(getORM).mockReturnValue(db);

    // Clear previous mock calls
    vi.mocked(ipcMain.handle).mockClear();
  });

  afterEach(() => {
    rawDb.close();
    vi.clearAllMocks();
  });

  it('should register graph:getData IPC handler', async () => {
    const { registerGraphHandlers } = await import('./graph.handlers');
    registerGraphHandlers();

    expect(ipcMain.handle).toHaveBeenCalledWith('graph:getData', expect.any(Function));
  });

  it('should return graph data when graph:getData is called', async () => {
    const now = Date.now();

    // Insert test data
    rawDb.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('note-1', 'Test Note', 'Body', null, now, now, null);

    const { registerGraphHandlers } = await import('./graph.handlers');
    registerGraphHandlers();

    // Get the handler function
    const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
      (call) => call[0] === 'graph:getData'
    );
    expect(handleCall).toBeDefined();

    const handler = handleCall![1];
    const result = await handler({} as any, {});

    expect(result).toHaveProperty('nodes');
    expect(result).toHaveProperty('links');
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('note-1');
  });

  it('should return empty graph on error', async () => {
    // Mock getORM to throw error
    const { getORM } = await import('../database/connection');
    vi.mocked(getORM).mockImplementation(() => {
      throw new Error('Database error');
    });

    const { registerGraphHandlers } = await import('./graph.handlers');
    registerGraphHandlers();

    // Get the handler function
    const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
      (call) => call[0] === 'graph:getData'
    );
    expect(handleCall).toBeDefined();

    const handler = handleCall![1];
    const result = await handler({} as any, {});

    expect(result).toEqual({
      nodes: [],
      links: []
    });
  });

  it('should log errors when handler fails', async () => {
    const { logger } = await import('../logger');

    // Mock getORM to throw error
    const { getORM } = await import('../database/connection');
    vi.mocked(getORM).mockImplementation(() => {
      throw new Error('Database error');
    });

    const { registerGraphHandlers } = await import('./graph.handlers');
    registerGraphHandlers();

    // Get the handler function
    const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
      (call) => call[0] === 'graph:getData'
    );
    const handler = handleCall![1];
    await handler({} as any, {});

    expect(logger.error).toHaveBeenCalled();
  });
});
