import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';

// Mock the connection module before importing the service
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

import {
  createTag,
  getAllTags,
  getTagById,
  deleteTag,
  renameTag,
  addTagsToNote,
  removeTagFromNote,
  getNoteTags,
  getNotesByTag,
  setNoteTags,
} from '../electron/services/tags.service';
import * as connectionModule from '../electron/database/connection';

describe('Tags Service - CRUD Operations', () => {
  let db: Database.Database;
  let orm: ReturnType<typeof drizzle>;

  beforeEach(() => {
    // Create in-memory database for testing
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
  });

  afterEach(() => {
    db.close();
  });

  describe('createTag', () => {
    it('should create a new tag with id and timestamp', async () => {
      const tag = await createTag('javascript');

      expect(tag).toBeDefined();
      expect(tag.id).toBeDefined();
      expect(typeof tag.id).toBe('string');
      expect(tag.name).toBe('javascript');
      expect(tag.created_at).toBeDefined();
      expect(tag.created_at).toBeInstanceOf(Date);
    });

    it('should return existing tag if name already exists (case-sensitive)', async () => {
      const tag1 = await createTag('javascript');
      const tag2 = await createTag('javascript');

      expect(tag1.id).toBe(tag2.id);
      expect(tag1.name).toBe(tag2.name);
      expect(tag1.created_at).toEqual(tag2.created_at);
    });

    it('should create separate tags for different cases', async () => {
      const tag1 = await createTag('JavaScript');
      const tag2 = await createTag('javascript');

      expect(tag1.id).not.toBe(tag2.id);
      expect(tag1.name).toBe('JavaScript');
      expect(tag2.name).toBe('javascript');
    });
  });

  describe('getAllTags', () => {
    it('should return empty array when no tags exist', async () => {
      const tags = await getAllTags();
      expect(tags).toEqual([]);
    });

    it('should return all tags ordered by name ASC', async () => {
      await createTag('zebra');
      await createTag('apple');
      await createTag('mango');

      const tags = await getAllTags();

      expect(tags).toHaveLength(3);
      expect(tags[0].name).toBe('apple');
      expect(tags[1].name).toBe('mango');
      expect(tags[2].name).toBe('zebra');
    });
  });

  describe('getTagById', () => {
    it('should return tag by id', async () => {
      const created = await createTag('typescript');
      const found = await getTagById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('typescript');
    });

    it('should return null for non-existent id', async () => {
      const found = await getTagById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('deleteTag', () => {
    it('should delete tag and return true', async () => {
      const tag = await createTag('to-delete');
      const result = await deleteTag(tag.id);

      expect(result).toBe(true);

      const found = await getTagById(tag.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent tag', async () => {
      const result = await deleteTag('non-existent-id');
      expect(result).toBe(false);
    });

    it('should cascade delete note-tag associations', async () => {
      // Create tag and note
      const tag = await createTag('cascade-test');
      db.exec(`
        INSERT INTO notes (id, title, body, created_at, updated_at)
        VALUES ('note-1', 'Test Note', 'Body', ${Date.now()}, ${Date.now()});
      `);
      db.exec(`
        INSERT INTO note_tags (note_id, tag_id)
        VALUES ('note-1', '${tag.id}');
      `);

      // Verify association exists
      const associations = db.prepare('SELECT * FROM note_tags WHERE tag_id = ?').all(tag.id);
      expect(associations).toHaveLength(1);

      // Delete tag
      await deleteTag(tag.id);

      // Verify associations deleted
      const afterDelete = db.prepare('SELECT * FROM note_tags WHERE tag_id = ?').all(tag.id);
      expect(afterDelete).toHaveLength(0);
    });
  });

  describe('renameTag', () => {
    it('should rename tag and preserve id', async () => {
      const tag = await createTag('old-name');
      const updated = await renameTag(tag.id, 'new-name');

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(tag.id);
      expect(updated?.name).toBe('new-name');
      expect(updated?.created_at).toEqual(tag.created_at);
    });

    it('should return null for non-existent tag', async () => {
      const result = await renameTag('non-existent-id', 'new-name');
      expect(result).toBeNull();
    });

    it('should preserve note-tag associations after rename', async () => {
      // Create tag and note
      const tag = await createTag('original');
      db.exec(`
        INSERT INTO notes (id, title, body, created_at, updated_at)
        VALUES ('note-1', 'Test Note', 'Body', ${Date.now()}, ${Date.now()});
      `);
      db.exec(`
        INSERT INTO note_tags (note_id, tag_id)
        VALUES ('note-1', '${tag.id}');
      `);

      // Rename tag
      await renameTag(tag.id, 'renamed');

      // Verify association still exists
      const associations = db.prepare('SELECT * FROM note_tags WHERE tag_id = ?').all(tag.id);
      expect(associations).toHaveLength(1);
    });
  });

  describe('Note-Tag Associations', () => {
    beforeEach(() => {
      // Create test notes
      db.exec(`
        INSERT INTO notes (id, title, body, created_at, updated_at)
        VALUES
          ('note-1', 'First Note', 'Body 1', ${Date.now()}, ${Date.now()}),
          ('note-2', 'Second Note', 'Body 2', ${Date.now()}, ${Date.now()}),
          ('note-3', 'Third Note', 'Body 3', ${Date.now()}, ${Date.now()});
      `);
    });

    describe('addTagsToNote', () => {
      it('should create tags and associate them with note', async () => {
        const tagIds = await addTagsToNote('note-1', ['javascript', 'typescript']);

        expect(tagIds).toHaveLength(2);

        // Verify tags created
        const allTags = await getAllTags();
        expect(allTags).toHaveLength(2);

        // Verify associations created
        const noteTags = db.prepare('SELECT * FROM note_tags WHERE note_id = ?').all('note-1');
        expect(noteTags).toHaveLength(2);
      });

      it('should reuse existing tags', async () => {
        await createTag('javascript');
        const tagIds = await addTagsToNote('note-1', ['javascript', 'typescript']);

        expect(tagIds).toHaveLength(2);

        // Should only have 2 tags total (javascript reused)
        const allTags = await getAllTags();
        expect(allTags).toHaveLength(2);
      });

      it('should ignore duplicate associations', async () => {
        await addTagsToNote('note-1', ['javascript']);
        await addTagsToNote('note-1', ['javascript']); // Add same tag again

        const noteTags = db.prepare('SELECT * FROM note_tags WHERE note_id = ?').all('note-1');
        expect(noteTags).toHaveLength(1); // Should still be 1
      });

      it('should allow same tag on multiple notes', async () => {
        await addTagsToNote('note-1', ['javascript']);
        await addTagsToNote('note-2', ['javascript']);

        const note1Tags = await getNoteTags('note-1');
        const note2Tags = await getNoteTags('note-2');

        expect(note1Tags).toHaveLength(1);
        expect(note2Tags).toHaveLength(1);
        expect(note1Tags[0].name).toBe('javascript');
        expect(note2Tags[0].name).toBe('javascript');
      });
    });

    describe('removeTagFromNote', () => {
      it('should remove tag association from note', async () => {
        const tagIds = await addTagsToNote('note-1', ['javascript', 'typescript']);
        await removeTagFromNote('note-1', tagIds[0]);

        const noteTags = await getNoteTags('note-1');
        expect(noteTags).toHaveLength(1);
        expect(noteTags[0].name).toBe('typescript');
      });

      it('should not affect other notes with same tag', async () => {
        const tagIds = await addTagsToNote('note-1', ['javascript']);
        await addTagsToNote('note-2', ['javascript']);

        await removeTagFromNote('note-1', tagIds[0]);

        const note1Tags = await getNoteTags('note-1');
        const note2Tags = await getNoteTags('note-2');

        expect(note1Tags).toHaveLength(0);
        expect(note2Tags).toHaveLength(1);
      });
    });

    describe('getNoteTags', () => {
      it('should return all tags for a note ordered by name', async () => {
        await addTagsToNote('note-1', ['zebra', 'apple', 'mango']);

        const tags = await getNoteTags('note-1');

        expect(tags).toHaveLength(3);
        expect(tags[0].name).toBe('apple');
        expect(tags[1].name).toBe('mango');
        expect(tags[2].name).toBe('zebra');
      });

      it('should return empty array for note with no tags', async () => {
        const tags = await getNoteTags('note-1');
        expect(tags).toEqual([]);
      });
    });

    describe('getNotesByTag', () => {
      it('should return all notes with specific tag', async () => {
        const tag = await createTag('javascript');
        await addTagsToNote('note-1', ['javascript']);
        await addTagsToNote('note-2', ['javascript']);
        await addTagsToNote('note-3', ['typescript']); // Different tag

        const notes = await getNotesByTag(tag.id);

        expect(notes).toHaveLength(2);
        expect(notes.map(n => n.id)).toContain('note-1');
        expect(notes.map(n => n.id)).toContain('note-2');
        expect(notes.map(n => n.id)).not.toContain('note-3');
      });

      it('should exclude soft-deleted notes', async () => {
        const tag = await createTag('javascript');
        await addTagsToNote('note-1', ['javascript']);
        await addTagsToNote('note-2', ['javascript']);

        // Soft delete note-2
        db.exec(`UPDATE notes SET deleted_at = ${Date.now()} WHERE id = 'note-2'`);

        const notes = await getNotesByTag(tag.id);

        expect(notes).toHaveLength(1);
        expect(notes[0].id).toBe('note-1');
      });

      it('should return notes ordered by updated_at DESC', async () => {
        const tag = await createTag('javascript');
        const now = Date.now();

        // Update notes with different timestamps
        db.exec(`UPDATE notes SET updated_at = ${now - 2000} WHERE id = 'note-1'`);
        db.exec(`UPDATE notes SET updated_at = ${now - 1000} WHERE id = 'note-2'`);
        db.exec(`UPDATE notes SET updated_at = ${now} WHERE id = 'note-3'`);

        await addTagsToNote('note-1', ['javascript']);
        await addTagsToNote('note-2', ['javascript']);
        await addTagsToNote('note-3', ['javascript']);

        const notes = await getNotesByTag(tag.id);

        expect(notes).toHaveLength(3);
        expect(notes[0].id).toBe('note-3'); // Most recent
        expect(notes[1].id).toBe('note-2');
        expect(notes[2].id).toBe('note-1'); // Oldest
      });
    });

    describe('setNoteTags', () => {
      it('should replace all tags on a note', async () => {
        await addTagsToNote('note-1', ['javascript', 'typescript']);
        await setNoteTags('note-1', ['react', 'vue']);

        const tags = await getNoteTags('note-1');

        expect(tags).toHaveLength(2);
        expect(tags.map(t => t.name)).toContain('react');
        expect(tags.map(t => t.name)).toContain('vue');
        expect(tags.map(t => t.name)).not.toContain('javascript');
        expect(tags.map(t => t.name)).not.toContain('typescript');
      });

      it('should remove all tags when empty array provided', async () => {
        await addTagsToNote('note-1', ['javascript', 'typescript']);
        await setNoteTags('note-1', []);

        const tags = await getNoteTags('note-1');
        expect(tags).toHaveLength(0);
      });
    });
  });
});
