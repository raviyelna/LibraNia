import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';
import { setupContentFTS5 } from '../electron/database/fts';

describe('Content FTS5', () => {
  let db: Database.Database;
  let orm: ReturnType<typeof drizzle>;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    orm = drizzle(db, { schema });

    // Create prerequisite tables
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

      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        provider_id TEXT,
        model TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE content (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        thumbnail_path TEXT,
        mime_type TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        extracted_text TEXT,
        source TEXT NOT NULL,
        confidence_score INTEGER,
        metadata TEXT,
        note_id TEXT,
        message_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );
    `);

    // Setup FTS5 for content
    setupContentFTS5(db);
  });

  afterEach(() => {
    db.close();
  });

  it('Test 1: content_fts virtual table created with columns: original_filename, extracted_text', () => {
    // Verify content_fts table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='content_fts'").all();
    expect(tables).toHaveLength(1);

    // Verify it's a virtual table using fts5
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='content_fts'").get() as { sql: string };
    expect(tableInfo.sql).toContain('fts5');
    expect(tableInfo.sql).toContain('original_filename');
    expect(tableInfo.sql).toContain('extracted_text');
  });

  it('Test 2: INSERT trigger populates content_fts when content row inserted', () => {
    // Insert a content row
    db.prepare(`
      INSERT INTO content (id, file_path, mime_type, original_filename, file_size, extracted_text, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-id-1', 'content/test.pdf', 'application/pdf', 'research-paper.pdf', 1024, 'This is extracted text from a PDF document', 'manual', Date.now(), Date.now());

    // Verify content_fts was populated
    const ftsRows = db.prepare("SELECT rowid, original_filename, extracted_text FROM content_fts WHERE rowid = (SELECT rowid FROM content WHERE id = ?)").all('test-id-1');
    expect(ftsRows).toHaveLength(1);
    expect(ftsRows[0].original_filename).toBe('research-paper.pdf');
    expect(ftsRows[0].extracted_text).toBe('This is extracted text from a PDF document');
  });

  it('Test 3: UPDATE trigger updates content_fts when content.extracted_text or content.original_filename changes', () => {
    // Insert initial content
    db.prepare(`
      INSERT INTO content (id, file_path, mime_type, original_filename, file_size, extracted_text, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-id-2', 'content/test.pdf', 'application/pdf', 'original.pdf', 1024, 'Original text', 'manual', Date.now(), Date.now());

    // Update extracted_text and original_filename
    db.prepare(`
      UPDATE content SET original_filename = ?, extracted_text = ?, updated_at = ? WHERE id = ?
    `).run('updated.pdf', 'Updated text content', Date.now(), 'test-id-2');

    // Verify content_fts was updated
    const ftsRows = db.prepare("SELECT original_filename, extracted_text FROM content_fts WHERE rowid = (SELECT rowid FROM content WHERE id = ?)").all('test-id-2');
    expect(ftsRows).toHaveLength(1);
    expect(ftsRows[0].original_filename).toBe('updated.pdf');
    expect(ftsRows[0].extracted_text).toBe('Updated text content');
  });

  it('Test 4: DELETE trigger removes content_fts row when content row deleted', () => {
    // Insert content
    db.prepare(`
      INSERT INTO content (id, file_path, mime_type, original_filename, file_size, extracted_text, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-id-3', 'content/test.pdf', 'application/pdf', 'delete-me.pdf', 1024, 'Text to be deleted', 'manual', Date.now(), Date.now());

    // Verify FTS row exists
    const beforeDelete = db.prepare("SELECT COUNT(*) as count FROM content_fts WHERE rowid = (SELECT rowid FROM content WHERE id = ?)").get('test-id-3') as { count: number };
    expect(beforeDelete.count).toBe(1);

    // Delete content row
    db.prepare("DELETE FROM content WHERE id = ?").run('test-id-3');

    // Verify FTS row was deleted
    const afterDelete = db.prepare("SELECT COUNT(*) as count FROM content_fts").get() as { count: number };
    expect(afterDelete.count).toBe(0);
  });

  it('Test 5: FTS5 search on content_fts returns ranked results using BM25', () => {
    // Insert multiple content rows with different text
    db.prepare(`
      INSERT INTO content (id, file_path, mime_type, original_filename, file_size, extracted_text, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('doc-1', 'content/doc1.pdf', 'application/pdf', 'machine-learning.pdf', 2048, 'Machine learning is a subset of artificial intelligence focused on algorithms', 'manual', Date.now(), Date.now());

    db.prepare(`
      INSERT INTO content (id, file_path, mime_type, original_filename, file_size, extracted_text, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('doc-2', 'content/doc2.pdf', 'application/pdf', 'deep-learning.pdf', 3072, 'Deep learning uses neural networks with multiple layers for machine learning tasks', 'manual', Date.now(), Date.now());

    db.prepare(`
      INSERT INTO content (id, file_path, mime_type, original_filename, file_size, extracted_text, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('doc-3', 'content/doc3.pdf', 'application/pdf', 'cooking-recipes.pdf', 1536, 'Delicious recipes for home cooking and baking', 'manual', Date.now(), Date.now());

    // Search for "machine learning" - should return doc-1 and doc-2, ranked by relevance
    const searchResults = db.prepare(`
      SELECT c.id, c.original_filename, c.extracted_text, content_fts.rank
      FROM content_fts
      JOIN content c ON c.rowid = content_fts.rowid
      WHERE content_fts MATCH ?
      ORDER BY content_fts.rank
    `).all('machine learning');

    expect(searchResults).toHaveLength(2);
    expect(searchResults[0].id).toBe('doc-1'); // Should rank higher (both terms in text)
    expect(searchResults[1].id).toBe('doc-2');

    // Search for "cooking" - should return only doc-3
    const cookingResults = db.prepare(`
      SELECT c.id, c.original_filename
      FROM content_fts
      JOIN content c ON c.rowid = content_fts.rowid
      WHERE content_fts MATCH ?
    `).all('cooking');

    expect(cookingResults).toHaveLength(1);
    expect(cookingResults[0].id).toBe('doc-3');
  });
});
