import type Database from 'better-sqlite3';

/**
 * Setup FTS5 (Full-Text Search) virtual tables and triggers
 *
 * Creates three FTS5 tables for different search modes:
 * 1. notes_fts: Exact matching with diacritic normalization (unicode61)
 * 2. notes_fts_stemmed: Stemming search ("running" matches "run") using porter
 * 3. notes_fts_trigram: Fuzzy/typo-tolerant search using trigram
 *
 * All tables use content='notes' to reference the main notes table without data duplication.
 * Triggers keep FTS5 tables in sync with notes table changes.
 */
export function setupFTS5(db: Database.Database): void {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Create FTS5 virtual table with unicode61 tokenizer (exact matching)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      title,
      body,
      content='notes',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
    );
  `);

  // Create FTS5 virtual table with porter stemming
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts_stemmed USING fts5(
      title,
      body,
      content='notes',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 2'
    );
  `);

  // Create FTS5 virtual table with trigram tokenizer (fuzzy search)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts_trigram USING fts5(
      title,
      body,
      content='notes',
      content_rowid='rowid',
      tokenize='trigram'
    );
  `);

  // Create triggers to keep FTS5 tables in sync with notes table

  // INSERT trigger
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
      INSERT INTO notes_fts_stemmed(rowid, title, body) VALUES (new.rowid, new.title, new.body);
      INSERT INTO notes_fts_trigram(rowid, title, body) VALUES (new.rowid, new.title, new.body);
    END;
  `);

  // UPDATE trigger
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
      UPDATE notes_fts SET title = new.title, body = new.body WHERE rowid = new.rowid;
      UPDATE notes_fts_stemmed SET title = new.title, body = new.body WHERE rowid = new.rowid;
      UPDATE notes_fts_trigram SET title = new.title, body = new.body WHERE rowid = new.rowid;
    END;
  `);

  // DELETE trigger
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
      DELETE FROM notes_fts WHERE rowid = old.rowid;
      DELETE FROM notes_fts_stemmed WHERE rowid = old.rowid;
      DELETE FROM notes_fts_trigram WHERE rowid = old.rowid;
    END;
  `);

  // Create performance indexes on notes table
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
    CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
  `);

  // Create indexes on links table for backlinks queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_links_source_note_id ON links(source_note_id);
    CREATE INDEX IF NOT EXISTS idx_links_target_note_id ON links(target_note_id);
  `);
}

/**
 * Setup FTS5 virtual table for content search
 *
 * Creates content_fts table for searching document text and filenames.
 * Uses porter stemming with unicode61 tokenizer (matches notes_fts_stemmed pattern).
 * Triggers keep FTS5 table in sync with content table changes.
 */
export function setupContentFTS5(db: Database.Database): void {
  // Create FTS5 virtual table with porter stemming for content search
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
      original_filename,
      extracted_text,
      content='content',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 2'
    );
  `);

  // Drop existing triggers to ensure clean state
  db.exec(`DROP TRIGGER IF EXISTS content_fts_insert;`);
  db.exec(`DROP TRIGGER IF EXISTS content_fts_update;`);
  db.exec(`DROP TRIGGER IF EXISTS content_fts_delete;`);

  // INSERT trigger - populate FTS5 when content row is inserted
  db.exec(`
    CREATE TRIGGER content_fts_insert AFTER INSERT ON content BEGIN
      INSERT INTO content_fts(rowid, original_filename, extracted_text)
      VALUES (new.rowid, new.original_filename, new.extracted_text);
    END;
  `);

  // UPDATE trigger - update FTS5 when content row is updated
  db.exec(`
    CREATE TRIGGER content_fts_update AFTER UPDATE ON content BEGIN
      INSERT INTO content_fts(content_fts, rowid, original_filename, extracted_text)
      VALUES('delete', old.rowid, old.original_filename, old.extracted_text);
      INSERT INTO content_fts(rowid, original_filename, extracted_text)
      VALUES (new.rowid, new.original_filename, new.extracted_text);
    END;
  `);

  // DELETE trigger - remove FTS5 row when content row is deleted
  db.exec(`
    CREATE TRIGGER content_fts_delete AFTER DELETE ON content BEGIN
      DELETE FROM content_fts WHERE rowid = old.rowid;
    END;
  `);
}
