import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';
import {
  parseWikiLinks,
  updateNoteLinks,
  getBacklinks,
} from '../electron/services/links.service';
import { createNote } from '../electron/services/notes.service';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = path.join(__dirname, 'test-links.db');

describe('Links Service', () => {
  let db: Database.Database;
  let orm: ReturnType<typeof drizzle>;

  beforeEach(() => {
    // Create fresh database for each test
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
});
