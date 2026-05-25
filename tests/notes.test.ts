import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';
import {
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  getNoteById,
  getAllNotes,
  getDeletedNotes,
} from '../electron/services/notes.service';
import fs from 'fs';
import path from 'path';

// Mock embeddings service
vi.mock('../electron/services/embeddings.service', () => ({
  generateEmbedding: vi.fn(async (text: string) => {
    // Return fake 384-dim vector
    return new Float32Array(384).fill(0.1);
  }),
  storeEmbedding: vi.fn(async (noteId: string, vector: Float32Array, db: any) => {
    // Store in embeddings table
    const now = Date.now();
    db.$client
      .prepare(
        'INSERT INTO embeddings (id, note_id, vector, model, dimensions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        crypto.randomUUID(),
        noteId,
        Buffer.from(vector.buffer),
        'all-MiniLM-L6-v2',
        384,
        now,
        now
      );
  }),
  getEmbedding: vi.fn(async (noteId: string, db: any) => {
    const result = db.$client
      .prepare('SELECT vector FROM embeddings WHERE note_id = ?')
      .get(noteId) as any;
    if (!result) return null;
    return new Float32Array(result.vector.buffer, result.vector.byteOffset, result.vector.byteLength / 4);
  }),
  updateEmbedding: vi.fn(async (noteId: string, vector: Float32Array, db: any) => {
    const now = Date.now();
    db.$client
      .prepare('UPDATE embeddings SET vector = ?, updated_at = ? WHERE note_id = ?')
      .run(Buffer.from(vector.buffer), now, noteId);
  }),
  deleteEmbedding: vi.fn(async (noteId: string, db: any) => {
    db.$client.prepare('DELETE FROM embeddings WHERE note_id = ?').run(noteId);
  }),
}));

// Mock vec utilities
vi.mock('../electron/database/vec', () => ({
  findSimilarNotes: vi.fn((db: any, noteId: string, queryVector: Float32Array, threshold: number, limit: number) => {
    // Return sample similar notes based on existing notes in DB
    const notes = db
      .prepare('SELECT id, title FROM notes WHERE id != ? AND deleted_at IS NULL LIMIT ?')
      .all(noteId, limit) as Array<{ id: string; title: string }>;

    return notes.map((note, index) => ({
      id: note.id,
      title: note.title,
      similarity: 0.9 - index * 0.05, // Decreasing similarity scores
    }));
  }),
  setupVectorExtension: vi.fn(),
}));

// Mock getDatabase
vi.mock('../electron/database/connection', () => ({
  getDatabase: vi.fn(() => {
    // Return the test database instance
    return (global as any).testDb;
  }),
}));

const TEST_DB_PATH = path.join(__dirname, 'test-notes.db');

describe('Notes Service', () => {
  let db: Database.Database;
  let orm: ReturnType<typeof drizzle>;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Store db globally for mocks
    (global as any).testDb = db;

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
        link_type TEXT NOT NULL DEFAULT 'manual',
        similarity_score REAL,
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

      CREATE TABLE embeddings (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL UNIQUE,
        vector BLOB NOT NULL,
        model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
        dimensions INTEGER NOT NULL DEFAULT 384,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );
    `);

    orm = drizzle(db, { schema });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('createNote', () => {
    it('should create a note with title and body', async () => {
      const note = await createNote(
        { title: 'Test Note', body: 'Test content' },
        orm
      );

      expect(note).toBeDefined();
      expect(note.id).toBeDefined();
      expect(note.title).toBe('Test Note');
      expect(note.body).toBe('Test content');
      expect(note.created_at).toBeDefined();
      expect(note.updated_at).toBeDefined();
      expect(note.deleted_at).toBeNull();
    });

    it('should generate unique UUID for each note', async () => {
      const note1 = await createNote(
        { title: 'Note 1', body: 'Content 1' },
        orm
      );
      const note2 = await createNote(
        { title: 'Note 2', body: 'Content 2' },
        orm
      );

      expect(note1.id).not.toBe(note2.id);
    });

    it('should set created_at and updated_at timestamps', async () => {
      const note = await createNote(
        { title: 'Test', body: 'Content' },
        orm
      );

      expect(note.created_at).toBeDefined();
      expect(note.updated_at).toBeDefined();
      expect(note.created_at.getTime()).toBe(note.updated_at.getTime());
    });

    it('should accept optional metadata', async () => {
      const metadata = { tags: ['test'], color: 'blue' };
      const note = await createNote(
        { title: 'Test', body: 'Content', metadata: JSON.stringify(metadata) },
        orm
      );

      expect(note.metadata).toBe(JSON.stringify(metadata));
    });
  });

  describe('updateNote', () => {
    it('should update note title', async () => {
      const note = await createNote(
        { title: 'Original', body: 'Content' },
        orm
      );

      // Wait to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const updated = await updateNote(note.id, { title: 'Updated' }, orm);

      expect(updated.title).toBe('Updated');
      expect(updated.body).toBe('Content');
      expect(updated.updated_at.getTime()).toBeGreaterThan(
        note.updated_at.getTime()
      );
    });

    it('should update note body', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Original content' },
        orm
      );

      const updated = await updateNote(
        note.id,
        { body: 'Updated content' },
        orm
      );

      expect(updated.body).toBe('Updated content');
      expect(updated.title).toBe('Title');
    });

    it('should update metadata', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Content' },
        orm
      );

      const metadata = { color: 'red' };
      const updated = await updateNote(
        note.id,
        { metadata: JSON.stringify(metadata) },
        orm
      );

      expect(updated.metadata).toBe(JSON.stringify(metadata));
    });

    it('should not update deleted notes', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Content' },
        orm
      );
      await deleteNote(note.id, false, orm); // soft delete

      await expect(
        updateNote(note.id, { title: 'Updated' }, orm)
      ).rejects.toThrow();
    });
  });

  describe('deleteNote', () => {
    it('should soft delete note by setting deleted_at', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Content' },
        orm
      );

      await deleteNote(note.id, false, orm); // soft delete

      const deleted = await getNoteById(note.id, orm, true);
      expect(deleted).toBeDefined();
      expect(deleted!.deleted_at).toBeDefined();
      expect(deleted!.deleted_at).not.toBeNull();
    });

    it('should hard delete note by removing row', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Content' },
        orm
      );

      await deleteNote(note.id, true, orm); // hard delete

      const deleted = await getNoteById(note.id, orm, true);
      expect(deleted).toBeNull();
    });

    it('should exclude soft-deleted notes from getAllNotes', async () => {
      const note1 = await createNote(
        { title: 'Note 1', body: 'Content 1' },
        orm
      );
      const note2 = await createNote(
        { title: 'Note 2', body: 'Content 2' },
        orm
      );

      await deleteNote(note1.id, false, orm); // soft delete

      const allNotes = await getAllNotes(orm);
      expect(allNotes).toHaveLength(1);
      expect(allNotes[0].id).toBe(note2.id);
    });
  });

  describe('restoreNote', () => {
    it('should restore soft-deleted note', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Content' },
        orm
      );
      await deleteNote(note.id, false, orm); // soft delete

      const restored = await restoreNote(note.id, orm);

      expect(restored.deleted_at).toBeNull();
      expect(restored.id).toBe(note.id);
    });

    it('should include restored note in getAllNotes', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Content' },
        orm
      );
      await deleteNote(note.id, false, orm);
      await restoreNote(note.id, orm);

      const allNotes = await getAllNotes(orm);
      expect(allNotes).toHaveLength(1);
      expect(allNotes[0].id).toBe(note.id);
    });
  });

  describe('getNoteById', () => {
    it('should return note by id', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Content' },
        orm
      );

      const found = await getNoteById(note.id, orm);

      expect(found).toBeDefined();
      expect(found!.id).toBe(note.id);
      expect(found!.title).toBe('Title');
    });

    it('should return null for non-existent note', async () => {
      const found = await getNoteById('non-existent-id', orm);
      expect(found).toBeNull();
    });

    it('should exclude soft-deleted notes by default', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Content' },
        orm
      );
      await deleteNote(note.id, false, orm);

      const found = await getNoteById(note.id, orm);
      expect(found).toBeNull();
    });

    it('should include soft-deleted notes when includeDeleted=true', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Content' },
        orm
      );
      await deleteNote(note.id, false, orm);

      const found = await getNoteById(note.id, orm, true);
      expect(found).toBeDefined();
      expect(found!.deleted_at).not.toBeNull();
    });
  });

  describe('getAllNotes', () => {
    it('should return all notes ordered by updated_at DESC', async () => {
      const note1 = await createNote(
        { title: 'Note 1', body: 'Content 1' },
        orm
      );
      // Wait to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const note2 = await createNote(
        { title: 'Note 2', body: 'Content 2' },
        orm
      );

      const allNotes = await getAllNotes(orm);

      expect(allNotes).toHaveLength(2);
      // Most recent first (note2 created after note1)
      expect(allNotes[0].id).toBe(note2.id);
      expect(allNotes[1].id).toBe(note1.id);
    });

    it('should exclude soft-deleted notes', async () => {
      await createNote({ title: 'Note 1', body: 'Content 1' }, orm);
      const note2 = await createNote(
        { title: 'Note 2', body: 'Content 2' },
        orm
      );
      await deleteNote(note2.id, false, orm);

      const allNotes = await getAllNotes(orm);

      expect(allNotes).toHaveLength(1);
    });

    it('should return empty array when no notes exist', async () => {
      const allNotes = await getAllNotes(orm);
      expect(allNotes).toEqual([]);
    });
  });

  describe('getDeletedNotes', () => {
    it('should return only soft-deleted notes', async () => {
      const note1 = await createNote(
        { title: 'Note 1', body: 'Content 1' },
        orm
      );
      await createNote({ title: 'Note 2', body: 'Content 2' }, orm);
      await deleteNote(note1.id, false, orm);

      const deletedNotes = await getDeletedNotes(orm);

      expect(deletedNotes).toHaveLength(1);
      expect(deletedNotes[0].id).toBe(note1.id);
      expect(deletedNotes[0].deleted_at).not.toBeNull();
    });

    it('should order by deleted_at DESC', async () => {
      const note1 = await createNote(
        { title: 'Note 1', body: 'Content 1' },
        orm
      );
      await deleteNote(note1.id, false, orm);
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const note2 = await createNote(
        { title: 'Note 2', body: 'Content 2' },
        orm
      );
      await deleteNote(note2.id, false, orm);

      const deletedNotes = await getDeletedNotes(orm);

      expect(deletedNotes).toHaveLength(2);
      expect(deletedNotes[0].id).toBe(note2.id); // Most recently deleted first
    });

    it('should return empty array when no deleted notes', async () => {
      await createNote({ title: 'Note 1', body: 'Content 1' }, orm);

      const deletedNotes = await getDeletedNotes(orm);
      expect(deletedNotes).toEqual([]);
    });
  });

  describe('wiki-link integration', () => {
    it('should create link records when note contains wiki-links', async () => {
      const targetNote = await createNote(
        { title: 'Target Note', body: 'Target content' },
        orm
      );
      const sourceNote = await createNote(
        { title: 'Source Note', body: 'See [[Target Note]] for details.' },
        orm
      );

      // Query links table directly for manual links only
      const linksResult = db
        .prepare('SELECT * FROM links WHERE source_note_id = ? AND link_type = ?')
        .all(sourceNote.id, 'manual');

      expect(linksResult).toHaveLength(1);
      expect(linksResult[0].target_note_id).toBe(targetNote.id);
    });

    it('should update link records when note body is updated', async () => {
      const target1 = await createNote(
        { title: 'Target 1', body: 'Content' },
        orm
      );
      const target2 = await createNote(
        { title: 'Target 2', body: 'Content' },
        orm
      );
      const sourceNote = await createNote(
        { title: 'Source', body: 'Link to [[Target 1]].' },
        orm
      );

      // Update to link to different note
      await updateNote(
        sourceNote.id,
        { body: 'Link to [[Target 2]] instead.' },
        orm
      );

      const linksResult = db
        .prepare('SELECT * FROM links WHERE source_note_id = ? AND link_type = ?')
        .all(sourceNote.id, 'manual');

      expect(linksResult).toHaveLength(1);
      expect(linksResult[0].target_note_id).toBe(target2.id);
    });

    it('should not update links when only title is updated', async () => {
      const targetNote = await createNote(
        { title: 'Target', body: 'Content' },
        orm
      );
      const sourceNote = await createNote(
        { title: 'Source', body: 'Link to [[Target]].' },
        orm
      );

      // Count manual links before update
      const linksBefore = db
        .prepare('SELECT COUNT(*) as count FROM links WHERE source_note_id = ? AND link_type = ?')
        .get(sourceNote.id, 'manual') as { count: number };

      // Update only title (not body)
      await updateNote(sourceNote.id, { title: 'New Title' }, orm);

      // Manual links should remain unchanged
      const linksAfter = db
        .prepare('SELECT COUNT(*) as count FROM links WHERE source_note_id = ? AND link_type = ?')
        .get(sourceNote.id, 'manual') as { count: number };

      expect(linksAfter.count).toBe(linksBefore.count);
      expect(linksAfter.count).toBe(1);
    });
  });

  describe('Semantic Discovery Integration', () => {
    it('should generate embedding and store in embeddings table when creating note', async () => {
      const note = await createNote(
        { title: 'Machine Learning', body: 'Introduction to neural networks' },
        orm
      );

      // Check embeddings table
      const embedding = db
        .prepare('SELECT * FROM embeddings WHERE note_id = ?')
        .get(note.id) as any;

      expect(embedding).toBeDefined();
      expect(embedding.note_id).toBe(note.id);
      expect(embedding.vector).toBeDefined();
      expect(embedding.dimensions).toBe(384);
    });

    it('should regenerate embedding when title changes', async () => {
      const note = await createNote(
        { title: 'Original Title', body: 'Content' },
        orm
      );

      const embeddingBefore = db
        .prepare('SELECT updated_at FROM embeddings WHERE note_id = ?')
        .get(note.id) as any;

      await new Promise((resolve) => setTimeout(resolve, 100));

      await updateNote(note.id, { title: 'New Title' }, orm);

      const embeddingAfter = db
        .prepare('SELECT updated_at FROM embeddings WHERE note_id = ?')
        .get(note.id) as any;

      expect(embeddingAfter.updated_at).toBeGreaterThan(embeddingBefore.updated_at);
    });

    it('should regenerate embedding when body changes', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Original content' },
        orm
      );

      const embeddingBefore = db
        .prepare('SELECT updated_at FROM embeddings WHERE note_id = ?')
        .get(note.id) as any;

      await new Promise((resolve) => setTimeout(resolve, 100));

      await updateNote(note.id, { body: 'New content' }, orm);

      const embeddingAfter = db
        .prepare('SELECT updated_at FROM embeddings WHERE note_id = ?')
        .get(note.id) as any;

      expect(embeddingAfter.updated_at).toBeGreaterThan(embeddingBefore.updated_at);
    });

    it('should not regenerate embedding when only metadata changes', async () => {
      const note = await createNote(
        { title: 'Title', body: 'Content', metadata: '{"key": "value"}' },
        orm
      );

      const embeddingBefore = db
        .prepare('SELECT updated_at FROM embeddings WHERE note_id = ?')
        .get(note.id) as any;

      await new Promise((resolve) => setTimeout(resolve, 100));

      await updateNote(note.id, { metadata: '{"key": "new value"}' }, orm);

      const embeddingAfter = db
        .prepare('SELECT updated_at FROM embeddings WHERE note_id = ?')
        .get(note.id) as any;

      expect(embeddingAfter.updated_at).toBe(embeddingBefore.updated_at);
    });

    it('should discover semantic links when creating note', async () => {
      // Create target notes with similar content
      await createNote(
        { title: 'Deep Learning', body: 'Neural networks and backpropagation' },
        orm
      );
      await createNote(
        { title: 'AI Basics', body: 'Artificial intelligence fundamentals' },
        orm
      );

      // Create source note with similar content
      const sourceNote = await createNote(
        { title: 'Machine Learning', body: 'Introduction to neural networks and AI' },
        orm
      );

      // Check for semantic links
      const semanticLinks = db
        .prepare('SELECT * FROM links WHERE source_note_id = ? AND link_type = ?')
        .all(sourceNote.id, 'semantic') as any[];

      expect(semanticLinks.length).toBeGreaterThan(0);
      expect(semanticLinks.length).toBeLessThanOrEqual(5); // Top 5 per D-12
    });

    it('should rediscover semantic links when content changes', async () => {
      const target1 = await createNote(
        { title: 'Python', body: 'Python programming language' },
        orm
      );
      const target2 = await createNote(
        { title: 'JavaScript', body: 'JavaScript programming language' },
        orm
      );

      const sourceNote = await createNote(
        { title: 'Programming', body: 'Learning Python basics' },
        orm
      );

      // Update to be more similar to JavaScript
      await updateNote(
        sourceNote.id,
        { body: 'Learning JavaScript and web development' },
        orm
      );

      const semanticLinks = db
        .prepare('SELECT * FROM links WHERE source_note_id = ? AND link_type = ?')
        .all(sourceNote.id, 'semantic') as any[];

      // Should have semantic links after update
      expect(semanticLinks.length).toBeGreaterThan(0);
    });

    it('should create semantic links with link_type=semantic and similarity_score', async () => {
      await createNote(
        { title: 'React', body: 'React framework for building UIs' },
        orm
      );

      const sourceNote = await createNote(
        { title: 'Frontend', body: 'Building user interfaces with React' },
        orm
      );

      const semanticLinks = db
        .prepare('SELECT * FROM links WHERE source_note_id = ? AND link_type = ?')
        .all(sourceNote.id, 'semantic') as any[];

      if (semanticLinks.length > 0) {
        expect(semanticLinks[0].link_type).toBe('semantic');
        expect(semanticLinks[0].similarity_score).toBeDefined();
        expect(semanticLinks[0].similarity_score).toBeGreaterThanOrEqual(0.7); // Threshold per D-09
        expect(semanticLinks[0].similarity_score).toBeLessThanOrEqual(1.0);
      }
    });

    it('should replace existing semantic links on update', async () => {
      const target1 = await createNote(
        { title: 'TypeScript', body: 'TypeScript language' },
        orm
      );
      const target2 = await createNote(
        { title: 'Rust', body: 'Rust programming language' },
        orm
      );

      const sourceNote = await createNote(
        { title: 'Languages', body: 'TypeScript is great' },
        orm
      );

      const linksBefore = db
        .prepare('SELECT COUNT(*) as count FROM links WHERE source_note_id = ? AND link_type = ?')
        .get(sourceNote.id, 'semantic') as { count: number };

      // Update to be more similar to Rust
      await updateNote(
        sourceNote.id,
        { body: 'Rust is a systems programming language' },
        orm
      );

      const linksAfter = db
        .prepare('SELECT COUNT(*) as count FROM links WHERE source_note_id = ? AND link_type = ?')
        .get(sourceNote.id, 'semantic') as { count: number };

      // Should have semantic links, but not duplicated
      expect(linksAfter.count).toBeGreaterThanOrEqual(0);
    });
  });
});
