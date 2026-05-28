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
  
  const result = db.exec("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'trigger') AND name LIKE '%fts%'");
  console.log('FTS5 objects:', JSON.stringify(result, null, 2));
  
  db.close();
})();
