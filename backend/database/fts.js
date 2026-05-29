export function setupFTS5(db) {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      title,
      body,
      content='notes',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
    );
  `);
    db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts_stemmed USING fts5(
      title,
      body,
      content='notes',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 2'
    );
  `);
    db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts_trigram USING fts5(
      title,
      body,
      content='notes',
      content_rowid='rowid',
      tokenize='trigram'
    );
  `);
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
      INSERT INTO notes_fts_stemmed(rowid, title, body) VALUES (new.rowid, new.title, new.body);
      INSERT INTO notes_fts_trigram(rowid, title, body) VALUES (new.rowid, new.title, new.body);
    END;
  `);
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
      UPDATE notes_fts SET title = new.title, body = new.body WHERE rowid = new.rowid;
      UPDATE notes_fts_stemmed SET title = new.title, body = new.body WHERE rowid = new.rowid;
      UPDATE notes_fts_trigram SET title = new.title, body = new.body WHERE rowid = new.rowid;
    END;
  `);
    db.exec(`
    CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
      DELETE FROM notes_fts WHERE rowid = old.rowid;
      DELETE FROM notes_fts_stemmed WHERE rowid = old.rowid;
      DELETE FROM notes_fts_trigram WHERE rowid = old.rowid;
    END;
  `);
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
    CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
  `);
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_links_source_note_id ON links(source_note_id);
    CREATE INDEX IF NOT EXISTS idx_links_target_note_id ON links(target_note_id);
  `);
}
export function setupContentFTS5(db) {
    db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
      original_filename,
      extracted_text,
      content='content',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 2'
    );
  `);
    db.exec(`DROP TRIGGER IF EXISTS content_fts_insert;`);
    db.exec(`DROP TRIGGER IF EXISTS content_fts_update;`);
    db.exec(`DROP TRIGGER IF EXISTS content_fts_delete;`);
    db.exec(`
    CREATE TRIGGER content_fts_insert AFTER INSERT ON content BEGIN
      INSERT INTO content_fts(rowid, original_filename, extracted_text)
      VALUES (new.rowid, new.original_filename, new.extracted_text);
    END;
  `);
    db.exec(`
    CREATE TRIGGER content_fts_update AFTER UPDATE ON content BEGIN
      INSERT INTO content_fts(content_fts, rowid, original_filename, extracted_text)
      VALUES('delete', old.rowid, old.original_filename, old.extracted_text);
      INSERT INTO content_fts(rowid, original_filename, extracted_text)
      VALUES (new.rowid, new.original_filename, new.extracted_text);
    END;
  `);
    db.exec(`
    CREATE TRIGGER content_fts_delete AFTER DELETE ON content BEGIN
      DELETE FROM content_fts WHERE rowid = old.rowid;
    END;
  `);
}
