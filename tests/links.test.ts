import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';
import {
  parseWikiLinks,
  updateNoteLinks,
  getBacklinks,
  createSemanticLinks,
  getSemanticLinks,
  deleteSemanticLinks,
} from '../electron/services/links.service';
import { createNote } from '../electron/services/notes.service';
import fs from 'fs';
import path from 'path';

// Mock embeddings service
vi.mock('../electron/services/embeddings.service', () => ({
  generateEmbedding: vi.fn(async (text: string) => new Float32Array(384).fill(0.1)),
  storeEmbedding: vi.fn(async (noteId: string, vector: Float32Array, db: any) => {
    const now = Date.now();
    db.$client
      .prepare(
        'INSERT INTO embeddings (id, note_id, vector, model, dimensions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(crypto.randomUUID(), noteId, Buffer.from(vector.buffer), 'all-MiniLM-L6-v2', 384, now, now);
  }),
  getEmbedding: vi.fn(async () => null),
  updateEmbedding: vi.fn(async () => {}),
  deleteEmbedding: vi.fn(async () => {}),
}));

// Mock vec utilities
vi.mock('../electron/database/vec', () => ({
  findSimilarNotes: vi.fn(() => []),
  setupVectorExtension: vi.fn(),
}));

// Mock getDatabase
vi.mock('../electron/database/connection', () => ({
  getDatabase: vi.fn(() => (global as any).testDb),
}));

const TEST_DB_PATH = path.join(__dirname, 'test-links.db');

describe('Links Service', () => {
  let db: Database.Database;
  let orm: ReturnType<typeof drizzle>;

  beforeEach(() => {
    // Create fresh database for each test
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

  describe('parseWikiLinks', () => {
    it('should extract simple wiki-link', () => {
      const text = 'This is a [[Note Title]] in text.';
      const links = parseWikiLinks(text);

      expect(links).toHaveLength(1);
      expect(links[0].title).toBe('Note Title');
      expect(links[0].alias).toBeUndefined();
      expect(links[0].raw).toBe('[[Note Title]]');
    });

    it('should extract wiki-link with alias', () => {
      const text = 'Check out [[Note Title|Custom Display]].';
      const links = parseWikiLinks(text);

      expect(links).toHaveLength(1);
      expect(links[0].title).toBe('Note Title');
      expect(links[0].alias).toBe('Custom Display');
      expect(links[0].raw).toBe('[[Note Title|Custom Display]]');
    });

    it('should extract multiple wiki-links', () => {
      const text = 'See [[First Note]] and [[Second Note|alias]].';
      const links = parseWikiLinks(text);

      expect(links).toHaveLength(2);
      expect(links[0].title).toBe('First Note');
      expect(links[1].title).toBe('Second Note');
      expect(links[1].alias).toBe('alias');
    });

    it('should handle wiki-links with special characters', () => {
      const text = '[[Note: With Colon]] and [[Note (with parens)]].';
      const links = parseWikiLinks(text);

      expect(links).toHaveLength(2);
      expect(links[0].title).toBe('Note: With Colon');
      expect(links[1].title).toBe('Note (with parens)');
    });

    it('should return empty array for text without wiki-links', () => {
      const text = 'This is plain text with no links.';
      const links = parseWikiLinks(text);

      expect(links).toEqual([]);
    });

    it('should trim whitespace from title and alias', () => {
      const text = '[[ Note Title  |  Alias Text  ]]';
      const links = parseWikiLinks(text);

      expect(links).toHaveLength(1);
      expect(links[0].title).toBe('Note Title');
      expect(links[0].alias).toBe('Alias Text');
    });

    it('should capture start and end indices', () => {
      const text = 'Start [[Link]] end';
      const links = parseWikiLinks(text);

      expect(links[0].startIndex).toBe(6);
      expect(links[0].endIndex).toBe(14);
    });
  });

  describe('updateNoteLinks', () => {
    it('should create link records for wiki-links', async () => {
      const targetNote = await createNote(
        { title: 'Target Note', body: 'Target content' },
        orm
      );
      const sourceNote = await createNote(
        { title: 'Source Note', body: 'See [[Target Note]] for details.' },
        orm
      );

      await updateNoteLinks(sourceNote.id, sourceNote.body, orm);

      // Query links table directly
      const linksResult = db
        .prepare('SELECT * FROM links WHERE source_note_id = ?')
        .all(sourceNote.id);

      expect(linksResult).toHaveLength(1);
      expect(linksResult[0].target_note_id).toBe(targetNote.id);
    });

    it('should handle case-insensitive title matching', async () => {
      const targetNote = await createNote(
        { title: 'React Hooks', body: 'Content' },
        orm
      );
      const sourceNote = await createNote(
        { title: 'Source', body: 'Learn about [[react hooks]] here.' },
        orm
      );

      await updateNoteLinks(sourceNote.id, sourceNote.body, orm);

      const linksResult = db
        .prepare('SELECT * FROM links WHERE source_note_id = ?')
        .all(sourceNote.id);

      expect(linksResult).toHaveLength(1);
      expect(linksResult[0].target_note_id).toBe(targetNote.id);
    });

    it('should skip broken links (target not found)', async () => {
      const sourceNote = await createNote(
        { title: 'Source', body: 'Link to [[Non-existent Note]].' },
        orm
      );

      await updateNoteLinks(sourceNote.id, sourceNote.body, orm);

      const linksResult = db
        .prepare('SELECT * FROM links WHERE source_note_id = ?')
        .all(sourceNote.id);

      expect(linksResult).toHaveLength(0);
    });

    it('should delete existing links before creating new ones', async () => {
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

      // First update
      await updateNoteLinks(sourceNote.id, sourceNote.body, orm);

      // Update with different link
      await updateNoteLinks(
        sourceNote.id,
        'Link to [[Target 2]] instead.',
        orm
      );

      const linksResult = db
        .prepare('SELECT * FROM links WHERE source_note_id = ?')
        .all(sourceNote.id);

      expect(linksResult).toHaveLength(1);
      expect(linksResult[0].target_note_id).toBe(target2.id);
    });

    it('should create multiple link records for multiple wiki-links', async () => {
      const target1 = await createNote(
        { title: 'Target 1', body: 'Content' },
        orm
      );
      const target2 = await createNote(
        { title: 'Target 2', body: 'Content' },
        orm
      );
      const sourceNote = await createNote(
        {
          title: 'Source',
          body: 'See [[Target 1]] and [[Target 2]].',
        },
        orm
      );

      await updateNoteLinks(sourceNote.id, sourceNote.body, orm);

      const linksResult = db
        .prepare('SELECT * FROM links WHERE source_note_id = ?')
        .all(sourceNote.id);

      expect(linksResult).toHaveLength(2);
    });
  });

  describe('getBacklinks', () => {
    it('should return notes linking to target note', async () => {
      const targetNote = await createNote(
        { title: 'Target', body: 'Content' },
        orm
      );
      const source1 = await createNote(
        { title: 'Source 1', body: 'Link to [[Target]].' },
        orm
      );
      const source2 = await createNote(
        { title: 'Source 2', body: 'Also links to [[Target]].' },
        orm
      );

      await updateNoteLinks(source1.id, source1.body, orm);
      await updateNoteLinks(source2.id, source2.body, orm);

      const backlinks = await getBacklinks(targetNote.id, orm);

      expect(backlinks).toHaveLength(2);
      expect(backlinks.map((b) => b.id)).toContain(source1.id);
      expect(backlinks.map((b) => b.id)).toContain(source2.id);
    });

    it('should order backlinks by link count DESC', async () => {
      const targetNote = await createNote(
        { title: 'Target', body: 'Content' },
        orm
      );
      const source1 = await createNote(
        { title: 'Source 1', body: 'Link [[Target]] once.' },
        orm
      );
      const source2 = await createNote(
        {
          title: 'Source 2',
          body: 'Link [[Target]] twice: [[Target]].',
        },
        orm
      );

      await updateNoteLinks(source1.id, source1.body, orm);
      await updateNoteLinks(source2.id, source2.body, orm);

      const backlinks = await getBacklinks(targetNote.id, orm);

      expect(backlinks).toHaveLength(2);
      expect(backlinks[0].id).toBe(source2.id); // Most links first
      expect(backlinks[0].linkCount).toBe(2);
      expect(backlinks[1].id).toBe(source1.id);
      expect(backlinks[1].linkCount).toBe(1);
    });

    it('should exclude soft-deleted source notes', async () => {
      const targetNote = await createNote(
        { title: 'Target', body: 'Content' },
        orm
      );
      const source1 = await createNote(
        { title: 'Source 1', body: 'Link to [[Target]].' },
        orm
      );
      const source2 = await createNote(
        { title: 'Source 2', body: 'Link to [[Target]].' },
        orm
      );

      await updateNoteLinks(source1.id, source1.body, orm);
      await updateNoteLinks(source2.id, source2.body, orm);

      // Soft delete source1
      db.prepare('UPDATE notes SET deleted_at = ? WHERE id = ?').run(
        Date.now(),
        source1.id
      );

      const backlinks = await getBacklinks(targetNote.id, orm);

      expect(backlinks).toHaveLength(1);
      expect(backlinks[0].id).toBe(source2.id);
    });

    it('should return empty array when no backlinks exist', async () => {
      const targetNote = await createNote(
        { title: 'Target', body: 'Content' },
        orm
      );

      const backlinks = await getBacklinks(targetNote.id, orm);

      expect(backlinks).toEqual([]);
    });

    it('should order by title ASC as secondary sort', async () => {
      const targetNote = await createNote(
        { title: 'Target', body: 'Content' },
        orm
      );
      const sourceB = await createNote(
        { title: 'B Source', body: 'Link to [[Target]].' },
        orm
      );
      const sourceA = await createNote(
        { title: 'A Source', body: 'Link to [[Target]].' },
        orm
      );

      await updateNoteLinks(sourceB.id, sourceB.body, orm);
      await updateNoteLinks(sourceA.id, sourceA.body, orm);

      const backlinks = await getBacklinks(targetNote.id, orm);

      expect(backlinks).toHaveLength(2);
      // Same link count, so alphabetical order
      expect(backlinks[0].title).toBe('A Source');
      expect(backlinks[1].title).toBe('B Source');
    });
  });

  describe('Semantic Links', () => {
    it('should create semantic links with link_type and similarity_score', async () => {
      const sourceNote = await createNote(
        { title: 'Source', body: 'Content' },
        orm
      );
      const target1 = await createNote(
        { title: 'Target 1', body: 'Content' },
        orm
      );
      const target2 = await createNote(
        { title: 'Target 2', body: 'Content' },
        orm
      );

      const similarNotes = [
        { id: target1.id, similarity: 0.9 },
        { id: target2.id, similarity: 0.8 },
      ];

      await createSemanticLinks(sourceNote.id, similarNotes, orm);

      const links = db
        .prepare('SELECT * FROM links WHERE source_note_id = ? AND link_type = ?')
        .all(sourceNote.id, 'semantic');

      expect(links).toHaveLength(2);
      expect(links[0].link_type).toBe('semantic');
      expect(links[0].similarity_score).toBeDefined();
      expect(links[1].link_type).toBe('semantic');
      expect(links[1].similarity_score).toBeDefined();
    });

    it('should create multiple semantic links in single transaction', async () => {
      const sourceNote = await createNote(
        { title: 'Source', body: 'Content' },
        orm
      );
      const targets = await Promise.all([
        createNote({ title: 'Target 1', body: 'Content' }, orm),
        createNote({ title: 'Target 2', body: 'Content' }, orm),
        createNote({ title: 'Target 3', body: 'Content' }, orm),
      ]);

      const similarNotes = targets.map((t, i) => ({
        id: t.id,
        similarity: 0.9 - i * 0.1,
      }));

      await createSemanticLinks(sourceNote.id, similarNotes, orm);

      const links = db
        .prepare('SELECT * FROM links WHERE source_note_id = ? AND link_type = ?')
        .all(sourceNote.id, 'semantic');

      expect(links).toHaveLength(3);
    });

    it('should return semantic links ordered by similarity DESC', async () => {
      const sourceNote = await createNote(
        { title: 'Source', body: 'Content' },
        orm
      );
      const target1 = await createNote(
        { title: 'Target 1', body: 'Content' },
        orm
      );
      const target2 = await createNote(
        { title: 'Target 2', body: 'Content' },
        orm
      );

      const similarNotes = [
        { id: target1.id, similarity: 0.7 },
        { id: target2.id, similarity: 0.9 },
      ];

      await createSemanticLinks(sourceNote.id, similarNotes, orm);

      const semanticLinks = await getSemanticLinks(sourceNote.id, orm);

      expect(semanticLinks).toHaveLength(2);
      expect(semanticLinks[0].id).toBe(target2.id); // Higher similarity first
      expect(semanticLinks[0].similarity).toBe(0.9);
      expect(semanticLinks[1].id).toBe(target1.id);
      expect(semanticLinks[1].similarity).toBe(0.7);
    });

    it('should exclude manual wiki-links from getSemanticLinks', async () => {
      const sourceNote = await createNote(
        { title: 'Source', body: 'Link to [[Target 1]]' },
        orm
      );
      const target1 = await createNote(
        { title: 'Target 1', body: 'Content' },
        orm
      );
      const target2 = await createNote(
        { title: 'Target 2', body: 'Content' },
        orm
      );

      // Create manual link via wiki-link
      await updateNoteLinks(sourceNote.id, sourceNote.body, orm);

      // Create semantic link
      await createSemanticLinks(sourceNote.id, [{ id: target2.id, similarity: 0.8 }], orm);

      const semanticLinks = await getSemanticLinks(sourceNote.id, orm);

      expect(semanticLinks).toHaveLength(1);
      expect(semanticLinks[0].id).toBe(target2.id);
    });

    it('should delete only semantic links, preserving manual links', async () => {
      const sourceNote = await createNote(
        { title: 'Source', body: 'Link to [[Target 1]]' },
        orm
      );
      const target1 = await createNote(
        { title: 'Target 1', body: 'Content' },
        orm
      );
      const target2 = await createNote(
        { title: 'Target 2', body: 'Content' },
        orm
      );

      // Create manual link
      await updateNoteLinks(sourceNote.id, sourceNote.body, orm);

      // Create semantic link
      await createSemanticLinks(sourceNote.id, [{ id: target2.id, similarity: 0.8 }], orm);

      // Delete semantic links
      await deleteSemanticLinks(sourceNote.id, orm);

      const manualLinks = db
        .prepare('SELECT * FROM links WHERE source_note_id = ? AND link_type = ?')
        .all(sourceNote.id, 'manual');

      const semanticLinks = db
        .prepare('SELECT * FROM links WHERE source_note_id = ? AND link_type = ?')
        .all(sourceNote.id, 'semantic');

      expect(manualLinks).toHaveLength(1); // Manual link preserved
      expect(semanticLinks).toHaveLength(0); // Semantic links deleted
    });

    it('should exclude soft-deleted target notes from getSemanticLinks', async () => {
      const sourceNote = await createNote(
        { title: 'Source', body: 'Content' },
        orm
      );
      const target1 = await createNote(
        { title: 'Target 1', body: 'Content' },
        orm
      );
      const target2 = await createNote(
        { title: 'Target 2', body: 'Content' },
        orm
      );

      await createSemanticLinks(
        sourceNote.id,
        [
          { id: target1.id, similarity: 0.9 },
          { id: target2.id, similarity: 0.8 },
        ],
        orm
      );

      // Soft delete target1
      db.prepare('UPDATE notes SET deleted_at = ? WHERE id = ?').run(
        Date.now(),
        target1.id
      );

      const semanticLinks = await getSemanticLinks(sourceNote.id, orm);

      expect(semanticLinks).toHaveLength(1);
      expect(semanticLinks[0].id).toBe(target2.id);
    });

    it('should handle bidirectional semantic relationships', async () => {
      const note1 = await createNote(
        { title: 'Note 1', body: 'Content' },
        orm
      );
      const note2 = await createNote(
        { title: 'Note 2', body: 'Content' },
        orm
      );

      // Create bidirectional semantic links
      await createSemanticLinks(note1.id, [{ id: note2.id, similarity: 0.85 }], orm);
      await createSemanticLinks(note2.id, [{ id: note1.id, similarity: 0.85 }], orm);

      const links1 = await getSemanticLinks(note1.id, orm);
      const links2 = await getSemanticLinks(note2.id, orm);

      expect(links1).toHaveLength(1);
      expect(links1[0].id).toBe(note2.id);
      expect(links2).toHaveLength(1);
      expect(links2[0].id).toBe(note1.id);
    });
  });
});
