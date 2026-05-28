const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'librania', 'librania.db');
const db = new Database(dbPath);

console.log('Dropping FTS5 triggers...');
db.exec('DROP TRIGGER IF EXISTS notes_fts_insert');
db.exec('DROP TRIGGER IF EXISTS notes_fts_update');
db.exec('DROP TRIGGER IF EXISTS notes_fts_delete');
db.exec('DROP TRIGGER IF EXISTS content_fts_insert');
db.exec('DROP TRIGGER IF EXISTS content_fts_update');
db.exec('DROP TRIGGER IF EXISTS content_fts_delete');

console.log('Dropping FTS5 tables...');
db.exec('DROP TABLE IF EXISTS notes_fts');
db.exec('DROP TABLE IF EXISTS notes_fts_stemmed');
db.exec('DROP TABLE IF EXISTS notes_fts_trigram');
db.exec('DROP TABLE IF EXISTS content_fts');

console.log('Done! FTS5 objects removed.');
db.close();
