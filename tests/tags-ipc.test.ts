import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';
import { ipcMain } from 'electron';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

// Mock logger
vi.mock('../electron/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the connection module
vi.mock('../electron/database/connection', () => {
  let mockDb: Database.Database | null = null;
  let mockOrm: ReturnType<typeof drizzle> | null = null;

  return {
    getDatabase: () => {
      if (!mockDb) throw new Error('Mock database not initialized');
      return mockDb;
    },
    getORM: () => {
      if (!mockOrm) throw new Error('Mock ORM not initialized');
      return mockOrm;
    },
    __setMockDb: (db: Database.Database) => {
      mockDb = db;
    },
    __setMockOrm: (orm: ReturnType<typeof drizzle>) => {
      mockOrm = orm;
    },
  };
});

import { registerTagsHandlers } from '../electron/ipc/tags.handlers';
import * as connectionModule from '../electron/database/connection';

describe('Tags IPC Handlers', () => {
  let db: Database.Database;
  let orm: ReturnType<typeof drizzle>;
  let handlers: Map<string, Function>;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(`
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
        name TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE note_tags (
        note_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    orm = drizzle(db, { schema });

    // Set mock database and ORM
    (connectionModule as any).__setMockDb(db);
    (connectionModule as any).__setMockOrm(orm);

    // Clear handlers map
    handlers = new Map();

    // Mock ipcMain.handle to capture handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      handlers.set(channel, handler);
    });

    // Register handlers
    registerTagsHandlers();
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  describe('tags:getAll', () => {
    it('should return all tags', async () => {
      // Create test tags
      db.exec(`
        INSERT INTO tags (id, name, created_at)
        VALUES
          ('tag-1', 'javascript', ${Date.now()}),
          ('tag-2', 'typescript', ${Date.now()});
      `);

      const handler = handlers.get('tags:getAll');
      expect(handler).toBeDefined();

      const result = await handler!({}, {});

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('javascript');
      expect(result[1].name).toBe('typescript');
    });
  });

  describe('tags:create', () => {
    it('should create a new tag', async () => {
      const handler = handlers.get('tags:create');
      expect(handler).toBeDefined();

      const result = await handler!({}, { name: 'react' });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('react');
      expect(result.created_at).toBeDefined();
    });
  });

  describe('tags:delete', () => {
    it('should delete a tag', async () => {
      db.exec(`
        INSERT INTO tags (id, name, created_at)
        VALUES ('tag-1', 'javascript', ${Date.now()});
      `);

      const handler = handlers.get('tags:delete');
      expect(handler).toBeDefined();

      const result = await handler!({}, { id: 'tag-1' });

      expect(result).toBe(true);

      const tags = db.prepare('SELECT * FROM tags WHERE id = ?').all('tag-1');
      expect(tags).toHaveLength(0);
    });
  });

  describe('tags:rename', () => {
    it('should rename a tag', async () => {
      db.exec(`
        INSERT INTO tags (id, name, created_at)
        VALUES ('tag-1', 'javascript', ${Date.now()});
      `);

      const handler = handlers.get('tags:rename');
      expect(handler).toBeDefined();

      const result = await handler!({}, { id: 'tag-1', name: 'js' });

      expect(result).toBeDefined();
      expect(result.id).toBe('tag-1');
      expect(result.name).toBe('js');
    });
  });

  describe('tags:addToNote', () => {
    it('should add tags to note', async () => {
      db.exec(`
        INSERT INTO notes (id, title, body, created_at, updated_at)
        VALUES ('note-1', 'Test', 'Body', ${Date.now()}, ${Date.now()});
      `);

      const handler = handlers.get('tags:addToNote');
      expect(handler).toBeDefined();

      const result = await handler!({}, { noteId: 'note-1', tagNames: ['javascript', 'typescript'] });

      expect(result).toHaveLength(2);

      const associations = db.prepare('SELECT * FROM note_tags WHERE note_id = ?').all('note-1');
      expect(associations).toHaveLength(2);
    });
  });

  describe('tags:removeFromNote', () => {
    it('should remove tag from note', async () => {
      const now = Date.now();
      db.exec(`
        INSERT INTO notes (id, title, body, created_at, updated_at)
        VALUES ('note-1', 'Test', 'Body', ${now}, ${now});

        INSERT INTO tags (id, name, created_at)
        VALUES ('tag-1', 'javascript', ${now});

        INSERT INTO note_tags (note_id, tag_id)
        VALUES ('note-1', 'tag-1');
      `);

      const handler = handlers.get('tags:removeFromNote');
      expect(handler).toBeDefined();

      await handler!({}, { noteId: 'note-1', tagId: 'tag-1' });

      const associations = db.prepare('SELECT * FROM note_tags WHERE note_id = ?').all('note-1');
      expect(associations).toHaveLength(0);
    });
  });

  describe('tags:getForNote', () => {
    it('should get all tags for a note', async () => {
      const now = Date.now();
      db.exec(`
        INSERT INTO notes (id, title, body, created_at, updated_at)
        VALUES ('note-1', 'Test', 'Body', ${now}, ${now});

        INSERT INTO tags (id, name, created_at)
        VALUES
          ('tag-1', 'javascript', ${now}),
          ('tag-2', 'typescript', ${now});

        INSERT INTO note_tags (note_id, tag_id)
        VALUES
          ('note-1', 'tag-1'),
          ('note-1', 'tag-2');
      `);

      const handler = handlers.get('tags:getForNote');
      expect(handler).toBeDefined();

      const result = await handler!({}, { noteId: 'note-1' });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('javascript');
      expect(result[1].name).toBe('typescript');
    });
  });

  describe('tags:getNotesByTag', () => {
    it('should get all notes with a tag', async () => {
      const now = Date.now();
      db.exec(`
        INSERT INTO notes (id, title, body, created_at, updated_at)
        VALUES
          ('note-1', 'Test 1', 'Body 1', ${now}, ${now}),
          ('note-2', 'Test 2', 'Body 2', ${now}, ${now});

        INSERT INTO tags (id, name, created_at)
        VALUES ('tag-1', 'javascript', ${now});

        INSERT INTO note_tags (note_id, tag_id)
        VALUES
          ('note-1', 'tag-1'),
          ('note-2', 'tag-1');
      `);

      const handler = handlers.get('tags:getNotesByTag');
      expect(handler).toBeDefined();

      const result = await handler!({}, { tagId: 'tag-1' });

      expect(result).toHaveLength(2);
      expect(result.map((n: any) => n.id)).toContain('note-1');
      expect(result.map((n: any) => n.id)).toContain('note-2');
    });
  });

  describe('tags:setForNote', () => {
    it('should replace all tags on a note', async () => {
      const now = Date.now();
      db.exec(`
        INSERT INTO notes (id, title, body, created_at, updated_at)
        VALUES ('note-1', 'Test', 'Body', ${now}, ${now});

        INSERT INTO tags (id, name, created_at)
        VALUES ('tag-1', 'javascript', ${now});

        INSERT INTO note_tags (note_id, tag_id)
        VALUES ('note-1', 'tag-1');
      `);

      const handler = handlers.get('tags:setForNote');
      expect(handler).toBeDefined();

      await handler!({}, { noteId: 'note-1', tagNames: ['react', 'vue'] });

      const associations = db.prepare('SELECT * FROM note_tags WHERE note_id = ?').all('note-1');
      expect(associations).toHaveLength(2);

      // Old tag should be removed
      const oldAssoc = db.prepare('SELECT * FROM note_tags WHERE note_id = ? AND tag_id = ?').all('note-1', 'tag-1');
      expect(oldAssoc).toHaveLength(0);
    });
  });
});
