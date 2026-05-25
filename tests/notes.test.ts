import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

const TEST_DB_PATH = path.join(__dirname, 'test-notes.db');

describe('Notes Service', () => {
  let db: Database.Database;
  let orm: ReturnType<typeof drizzle>;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    db = new Database(TEST_DB_PATH);
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

      // Query links table directly
      const linksResult = db
        .prepare('SELECT * FROM links WHERE source_note_id = ?')
        .all(sourceNote.id);

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
        .prepare('SELECT * FROM links WHERE source_note_id = ?')
        .all(sourceNote.id);

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

      // Count links before update
      const linksBefore = db
        .prepare('SELECT COUNT(*) as count FROM links WHERE source_note_id = ?')
        .get(sourceNote.id) as { count: number };

      // Update only title (not body)
      await updateNote(sourceNote.id, { title: 'New Title' }, orm);

      // Links should remain unchanged
      const linksAfter = db
        .prepare('SELECT COUNT(*) as count FROM links WHERE source_note_id = ?')
        .get(sourceNote.id) as { count: number };

      expect(linksAfter.count).toBe(linksBefore.count);
      expect(linksAfter.count).toBe(1);
    });
  });
});
