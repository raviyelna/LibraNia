import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';
import { randomUUID } from 'crypto';
import * as vec from '../electron/database/vec';

describe('Vector Search Utilities', () => {
  let db: Database.Database;
  let orm: ReturnType<typeof drizzle>;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');
    orm = drizzle(db, { schema });

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
      )
    `);

    // Create embeddings table
    db.exec(`
      CREATE TABLE embeddings (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL UNIQUE,
        vector BLOB NOT NULL,
        model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
        dimensions INTEGER NOT NULL DEFAULT 384,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      )
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe('setupVectorExtension', () => {
    it('should load sqlite-vec extension without errors', () => {
      // This test will fail if extension file doesn't exist or can't be loaded
      expect(() => vec.setupVectorExtension(db)).not.toThrow();
    });

    it('should make vec_version() function available after extension loads', () => {
      vec.setupVectorExtension(db);

      const result = db.prepare('SELECT vec_version() as version').get() as any;
      expect(result).toBeDefined();
      expect(result.version).toBeDefined();
      expect(typeof result.version).toBe('string');
    });
  });

  describe('findSimilarNotes', () => {
    beforeEach(() => {
      // Load vector extension for similarity search tests
      vec.setupVectorExtension(db);
    });

    it('should return empty array when no embeddings exist', () => {
      const queryVector = new Float32Array(384).fill(0.5);
      const results = vec.findSimilarNotes(db, 'note-123', queryVector, 0.7, 10);

      expect(results).toEqual([]);
    });

    it('should return notes with similarity >= threshold, ordered by similarity DESC', () => {
      const now = Date.now();

      // Create 3 notes
      const note1Id = randomUUID();
      const note2Id = randomUUID();
      const note3Id = randomUUID();

      db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        note1Id, 'Note 1', 'Body 1', now, now
      );
      db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        note2Id, 'Note 2', 'Body 2', now, now
      );
      db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        note3Id, 'Note 3', 'Body 3', now, now
      );

      // Create embeddings with different similarities
      // Note 1: very similar (0.9)
      const vector1 = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        vector1[i] = 0.9 / Math.sqrt(384);
      }

      // Note 2: moderately similar (0.75)
      const vector2 = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        vector2[i] = 0.75 / Math.sqrt(384);
      }

      // Note 3: low similarity (0.5)
      const vector3 = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        vector3[i] = 0.5 / Math.sqrt(384);
      }

      db.prepare('INSERT INTO embeddings (id, note_id, vector, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(), note1Id, Buffer.from(vector1.buffer), now, now
      );
      db.prepare('INSERT INTO embeddings (id, note_id, vector, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(), note2Id, Buffer.from(vector2.buffer), now, now
      );
      db.prepare('INSERT INTO embeddings (id, note_id, vector, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(), note3Id, Buffer.from(vector3.buffer), now, now
      );

      // Query with vector similar to vector1
      const queryVector = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        queryVector[i] = 0.85 / Math.sqrt(384);
      }

      const results = vec.findSimilarNotes(db, 'query-note', queryVector, 0.7, 10);

      // Should return note1 and note2 (similarity >= 0.7), ordered by similarity DESC
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('similarity');
      expect(results[0].similarity).toBeGreaterThanOrEqual(0.7);

      // Results should be ordered by similarity DESC
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should exclude the query note itself (noteId filter)', () => {
      const now = Date.now();
      const queryNoteId = randomUUID();
      const otherNoteId = randomUUID();

      // Create query note
      db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        queryNoteId, 'Query Note', 'Body', now, now
      );

      // Create other note
      db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        otherNoteId, 'Other Note', 'Body', now, now
      );

      // Create identical embeddings
      const vector = new Float32Array(384).fill(1 / Math.sqrt(384));

      db.prepare('INSERT INTO embeddings (id, note_id, vector, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(), queryNoteId, Buffer.from(vector.buffer), now, now
      );
      db.prepare('INSERT INTO embeddings (id, note_id, vector, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(), otherNoteId, Buffer.from(vector.buffer), now, now
      );

      const results = vec.findSimilarNotes(db, queryNoteId, vector, 0.7, 10);

      // Should not include query note itself
      expect(results.every(r => r.id !== queryNoteId)).toBe(true);
      // Should include other note
      expect(results.some(r => r.id === otherNoteId)).toBe(true);
    });

    it('should exclude soft-deleted notes (deleted_at IS NULL)', () => {
      const now = Date.now();
      const activeNoteId = randomUUID();
      const deletedNoteId = randomUUID();

      // Create active note
      db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        activeNoteId, 'Active Note', 'Body', now, now, null
      );

      // Create deleted note
      db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        deletedNoteId, 'Deleted Note', 'Body', now, now, now
      );

      // Create identical embeddings
      const vector = new Float32Array(384).fill(1 / Math.sqrt(384));

      db.prepare('INSERT INTO embeddings (id, note_id, vector, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(), activeNoteId, Buffer.from(vector.buffer), now, now
      );
      db.prepare('INSERT INTO embeddings (id, note_id, vector, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(), deletedNoteId, Buffer.from(vector.buffer), now, now
      );

      const results = vec.findSimilarNotes(db, 'query-note', vector, 0.7, 10);

      // Should not include deleted note
      expect(results.every(r => r.id !== deletedNoteId)).toBe(true);
      // Should include active note
      expect(results.some(r => r.id === activeNoteId)).toBe(true);
    });

    it('should respect limit parameter (top N results)', () => {
      const now = Date.now();

      // Create 5 notes with embeddings
      for (let i = 0; i < 5; i++) {
        const noteId = randomUUID();
        db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
          noteId, `Note ${i}`, 'Body', now, now
        );

        const vector = new Float32Array(384).fill(1 / Math.sqrt(384));
        db.prepare('INSERT INTO embeddings (id, note_id, vector, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
          randomUUID(), noteId, Buffer.from(vector.buffer), now, now
        );
      }

      const queryVector = new Float32Array(384).fill(1 / Math.sqrt(384));
      const results = vec.findSimilarNotes(db, 'query-note', queryVector, 0.7, 3);

      // Should return at most 3 results
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should return cosine similarity scores in 0.0-1.0 range', () => {
      const now = Date.now();
      const noteId = randomUUID();

      db.prepare('INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        noteId, 'Note', 'Body', now, now
      );

      const vector = new Float32Array(384).fill(1 / Math.sqrt(384));
      db.prepare('INSERT INTO embeddings (id, note_id, vector, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
        randomUUID(), noteId, Buffer.from(vector.buffer), now, now
      );

      const queryVector = new Float32Array(384).fill(1 / Math.sqrt(384));
      const results = vec.findSimilarNotes(db, 'query-note', queryVector, 0.0, 10);

      // All similarity scores should be in valid range
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.0);
        expect(result.similarity).toBeLessThanOrEqual(1.0);
      });
    });
  });
});
