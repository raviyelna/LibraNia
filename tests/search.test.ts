import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { setupFTS5 } from '../electron/database/fts';
import { quickNavSearch } from '../electron/services/search.service';

describe('Search Service', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');

    // Create notes table
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
    `);

    // Create links table (required by setupFTS5 indexes)
    db.exec(`
      CREATE TABLE links (
        id TEXT PRIMARY KEY,
        source_note_id TEXT NOT NULL,
        target_note_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // Setup FTS5 tables and triggers
    setupFTS5(db);

    // Insert test notes
    const now = Date.now();
    const notes = [
      { id: '1', title: 'React Basics', body: 'Introduction to React', created_at: now, updated_at: now },
      { id: '2', title: 'React Hooks', body: 'useState and useEffect', created_at: now, updated_at: now },
      { id: '3', title: 'Reading List', body: 'Books to read', created_at: now, updated_at: now },
      { id: '4', title: 'Real-time Systems', body: 'Distributed systems', created_at: now, updated_at: now },
      { id: '5', title: 'Python Tutorial', body: 'Learn Python', created_at: now, updated_at: now },
      { id: '6', title: 'Deleted Note', body: 'This is deleted', created_at: now, updated_at: now, deleted_at: now },
    ];

    const insert = db.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?)
    `);

    for (const note of notes) {
      insert.run(note.id, note.title, note.body, note.created_at, note.updated_at, note.deleted_at || null);
    }
  });

  afterEach(() => {
    db.close();
  });

  describe('Quick Nav Search', () => {
    it('should return notes matching title prefix', () => {
      const results = quickNavSearch(db, 'rea');

      // Should match: React Basics, React Hooks, Reading List, Real-time Systems
      expect(results).toHaveLength(4);
      expect(results.map(r => r.title)).toContain('React Basics');
      expect(results.map(r => r.title)).toContain('React Hooks');
      expect(results.map(r => r.title)).toContain('Reading List');
      expect(results.map(r => r.title)).toContain('Real-time Systems');
    });

    it('should return notes matching exact title', () => {
      const results = quickNavSearch(db, 'React Basics');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('React Basics');
    });

    it('should exclude soft-deleted notes', () => {
      const results = quickNavSearch(db, 'deleted');

      expect(results).toHaveLength(0);
    });

    it('should escape FTS5 special characters', () => {
      // Insert note with special characters in title
      const now = Date.now();
      db.prepare(`
        INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, NULL, ?, ?, NULL)
      `).run('7', 'Test "quotes" and *asterisks*', 'Content', now, now);

      // Search with special characters should not crash
      expect(() => quickNavSearch(db, 'test "quotes"')).not.toThrow();
      expect(() => quickNavSearch(db, 'test*')).not.toThrow();
    });

    it('should return results ordered by rank', () => {
      const results = quickNavSearch(db, 'react');

      expect(results).toHaveLength(2);
      // Results should be ordered by FTS5 rank
      expect(results[0]).toHaveProperty('rank');
      expect(results[1]).toHaveProperty('rank');
    });

    it('should limit results to specified limit', () => {
      // Insert many notes
      const now = Date.now();
      const insert = db.prepare(`
        INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, NULL, ?, ?, NULL)
      `);

      for (let i = 10; i < 70; i++) {
        insert.run(`${i}`, `React Tutorial ${i}`, 'Content', now, now);
      }

      const results = quickNavSearch(db, 'react', 10);
      expect(results).toHaveLength(10);
    });

    it('should return empty array when no matches', () => {
      const results = quickNavSearch(db, 'nonexistent');

      expect(results).toEqual([]);
    });

    it('should complete in under 100ms with 100 notes', () => {
      // Insert 100 notes
      const now = Date.now();
      const insert = db.prepare(`
        INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, NULL, ?, ?, NULL)
      `);

      for (let i = 100; i < 200; i++) {
        insert.run(`${i}`, `Note ${i}`, `Body content ${i}`, now, now);
      }

      const start = performance.now();
      quickNavSearch(db, 'note');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
