const Database = require('better-sqlite3');
const { setupFTS5 } = require('./electron/database/fts.ts');

const db = new Database(':memory:');

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

db.exec(`
  CREATE TABLE links (
    id TEXT PRIMARY KEY,
    source_note_id TEXT NOT NULL,
    target_note_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

setupFTS5(db);

const now = Date.now();
db.prepare(`INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at) VALUES (?, ?, ?, NULL, ?, ?, NULL)`)
  .run('1', 'React Basics', 'Introduction to React', now, now);

// Test trigram search
const results = db.prepare(`
  SELECT n.id, n.title
  FROM notes_fts_trigram
  INNER JOIN notes n ON notes_fts_trigram.rowid = n.rowid
  WHERE notes_fts_trigram MATCH ?
`).all('react');

console.log('Trigram search for "react":', results);

const results2 = db.prepare(`
  SELECT n.id, n.title
  FROM notes_fts_trigram
  INNER JOIN notes n ON notes_fts_trigram.rowid = n.rowid
  WHERE notes_fts_trigram MATCH ?
`).all('reactt');

console.log('Trigram search for "reactt":', results2);

db.close();
