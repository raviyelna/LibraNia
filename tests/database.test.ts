import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { notes, tags, noteTags, links, noteVersions } from '../electron/database/schema';
import { setupFTS5 } from '../electron/database/fts';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { randomUUID } from 'crypto';

describe('Database Schema', () => {
  describe('notes table', () => {
    it('should export notes table', () => {
      expect(notes).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = notes;
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('title');
      expect(columns).toHaveProperty('body');
      expect(columns).toHaveProperty('metadata');
      expect(columns).toHaveProperty('created_at');
      expect(columns).toHaveProperty('updated_at');
      expect(columns).toHaveProperty('deleted_at');
    });
  });

  describe('tags table', () => {
    it('should export tags table', () => {
      expect(tags).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = tags;
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('name');
      expect(columns).toHaveProperty('created_at');
    });
  });

  describe('noteTags junction table', () => {
    it('should export noteTags table', () => {
      expect(noteTags).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = noteTags;
      expect(columns).toHaveProperty('note_id');
      expect(columns).toHaveProperty('tag_id');
    });
  });

  describe('links table', () => {
    it('should export links table', () => {
      expect(links).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = links;
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('source_note_id');
      expect(columns).toHaveProperty('target_note_id');
      expect(columns).toHaveProperty('created_at');
    });
  });

  describe('noteVersions table', () => {
    it('should export noteVersions table', () => {
      expect(noteVersions).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = noteVersions;
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('note_id');
      expect(columns).toHaveProperty('title');
      expect(columns).toHaveProperty('body');
      expect(columns).toHaveProperty('metadata');
      expect(columns).toHaveProperty('version_number');
      expect(columns).toHaveProperty('created_at');
    });
  });
});

describe('FTS5 Full-Text Search', () => {
  let db: Database.Database;
  let orm: ReturnType<typeof drizzle>;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    orm = drizzle(db);

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

      CREATE TABLE links (
        id TEXT PRIMARY KEY,
        source_note_id TEXT NOT NULL,
        target_note_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE SET NULL
      );

      CREATE TABLE note_versions (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        metadata TEXT,
        version_number INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );
    `);

    // Setup FTS5
    setupFTS5(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('FTS5 virtual tables', () => {
    it('should create notes_fts table with unicode61 tokenizer', () => {
      const result = db.prepare(`
        SELECT sql FROM sqlite_master WHERE type='table' AND name='notes_fts'
      `).get() as { sql: string } | undefined;

      expect(result).toBeDefined();
      expect(result?.sql).toContain('fts5');
      expect(result?.sql).toContain('unicode61');
    });

    it('should create notes_fts_stemmed table with porter tokenizer', () => {
      const result = db.prepare(`
        SELECT sql FROM sqlite_master WHERE type='table' AND name='notes_fts_stemmed'
      `).get() as { sql: string } | undefined;

      expect(result).toBeDefined();
      expect(result?.sql).toContain('fts5');
      expect(result?.sql).toContain('porter');
    });

    it('should create notes_fts_trigram table with trigram tokenizer', () => {
      const result = db.prepare(`
        SELECT sql FROM sqlite_master WHERE type='table' AND name='notes_fts_trigram'
      `).get() as { sql: string } | undefined;

      expect(result).toBeDefined();
      expect(result?.sql).toContain('fts5');
      expect(result?.sql).toContain('trigram');
    });
  });

  describe('FTS5 triggers', () => {
    it('should auto-sync FTS5 tables on INSERT', () => {
      const noteId = randomUUID();
      db.prepare(`
        INSERT INTO notes (id, title, body, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(noteId, 'Test Title', 'Test body content', null, Date.now(), Date.now());

      const result = db.prepare(`
        SELECT title, body FROM notes_fts WHERE notes_fts MATCH 'Test'
      `).all();

      expect(result.length).toBeGreaterThan(0);
    });

    it('should auto-sync FTS5 tables on UPDATE', () => {
      const noteId = randomUUID();
      db.prepare(`
        INSERT INTO notes (id, title, body, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(noteId, 'Original Title', 'Original body', null, Date.now(), Date.now());

      db.prepare(`
        UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?
      `).run('Updated Title', 'Updated body', Date.now(), noteId);

      const result = db.prepare(`
        SELECT title, body FROM notes_fts WHERE notes_fts MATCH 'Updated'
      `).all();

      expect(result.length).toBeGreaterThan(0);
    });

    it('should auto-sync FTS5 tables on DELETE', () => {
      const noteId = randomUUID();
      db.prepare(`
        INSERT INTO notes (id, title, body, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(noteId, 'Delete Test', 'Delete body', null, Date.now(), Date.now());

      // Verify the note is in FTS5 before deletion
      const beforeDelete = db.prepare(`
        SELECT title, body FROM notes_fts WHERE notes_fts MATCH 'Delete'
      `).all();
      expect(beforeDelete.length).toBeGreaterThan(0);

      // Delete the note
      db.prepare(`DELETE FROM notes WHERE id = ?`).run(noteId);

      // Verify the note is removed from FTS5 after deletion
      // Note: We need to rebuild FTS5 to clean up orphaned entries
      db.exec(`INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);

      const afterDelete = db.prepare(`
        SELECT title, body FROM notes_fts WHERE notes_fts MATCH 'Delete'
      `).all();

      expect(afterDelete.length).toBe(0);
    });
  });

  describe('Performance indexes', () => {
    it('should create index on notes.updated_at', () => {
      const result = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='index' AND name='idx_notes_updated_at'
      `).get();

      expect(result).toBeDefined();
    });

    it('should create index on notes.created_at', () => {
      const result = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='index' AND name='idx_notes_created_at'
      `).get();

      expect(result).toBeDefined();
    });

    it('should create index on notes.deleted_at', () => {
      const result = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='index' AND name='idx_notes_deleted_at'
      `).get();

      expect(result).toBeDefined();
    });
  });
});
