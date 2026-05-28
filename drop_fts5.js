const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

(async () => {
  const SQL = await initSqlJs({
    locateFile: file => path.join('node_modules', 'sql.js', 'dist', file)
  });
  
  const dbPath = path.join(process.env.APPDATA, 'librania', 'librania.db');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);
  
  console.log('Dropping FTS5 triggers...');
  db.run('DROP TRIGGER IF EXISTS notes_fts_insert');
  db.run('DROP TRIGGER IF EXISTS notes_fts_update');
  db.run('DROP TRIGGER IF EXISTS notes_fts_delete');
  db.run('DROP TRIGGER IF EXISTS content_fts_insert');
  db.run('DROP TRIGGER IF EXISTS content_fts_update');
  db.run('DROP TRIGGER IF EXISTS content_fts_delete');
  
  console.log('Dropping FTS5 tables...');
  db.run('DROP TABLE IF EXISTS notes_fts');
  db.run('DROP TABLE IF EXISTS notes_fts_stemmed');
  db.run('DROP TABLE IF EXISTS notes_fts_trigram');
  db.run('DROP TABLE IF EXISTS content_fts');
  
  console.log('Saving cleaned DB...');
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  
  console.log('Done! FTS5 objects removed.');
  db.close();
})();
