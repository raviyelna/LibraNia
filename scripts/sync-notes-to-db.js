#!/usr/bin/env node

/**
 * Sync notes from filesystem to database
 *
 * Finds notes in filesystem that are missing from DB and inserts them.
 * Run when notes exist in files but not searchable via MCP.
 *
 * Usage: node scripts/sync-notes-to-db.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const NOTES_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'LibraNia', 'notes');
const DB_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'LibraNia', 'librania.db');
const MCP_DIR = path.join(__dirname, '..', 'mcp-server');

function log(msg) {
  console.log(`[Sync] ${msg}`);
}

function main() {
  log('Starting filesystem → DB sync');
  log('==============================\n');

  // Check paths exist
  if (!fs.existsSync(NOTES_DIR)) {
    console.error('Notes directory not found:', NOTES_DIR);
    process.exit(1);
  }

  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found:', DB_PATH);
    process.exit(1);
  }

  // Use mcp-server's node_modules (has correct better-sqlite3 build)
  const syncScript = `
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const NOTES_DIR = '${NOTES_DIR.replace(/\\/g, '\\\\')}';
const DB_PATH = '${DB_PATH.replace(/\\/g, '\\\\')}';

const db = new Database(DB_PATH);

// Get all note IDs from DB
const dbNoteIds = new Set(
  db.prepare('SELECT id FROM notes').all().map(row => row.id)
);

console.log('DB notes:', dbNoteIds.size);

// Get all note files
const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.md'));
console.log('Files:', files.length);

let synced = 0;
let skipped = 0;
let errors = 0;

for (const file of files) {
  const noteId = path.basename(file, '.md');

  if (dbNoteIds.has(noteId)) {
    skipped++;
    continue;
  }

  try {
    const filePath = path.join(NOTES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, content: body } = matter(content);

    const title = data.title || 'Untitled';
    const created_at = data.created_at || new Date().toISOString();
    const updated_at = data.updated_at || new Date().toISOString();
    const deleted_at = data.deleted_at || null;

    db.prepare(\\\`
      INSERT INTO notes (id, title, body, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    \\\`).run(noteId, title, body.trim(), created_at, updated_at, deleted_at);

    console.log('✓', title);
    synced++;
  } catch (err) {
    console.log('✗', noteId, err.message);
    errors++;
  }
}

db.close();

console.log('---');
console.log('Synced:', synced);
console.log('Skipped:', skipped);
console.log('Errors:', errors);
`;

  // Run via mcp-server's node
  const result = execSync(`node -e "${syncScript}"`, {
    cwd: MCP_DIR,
    encoding: 'utf-8'
  });

  console.log(result);

  log('\n==============================');
  log('Sync Complete!');
  log('Restart Claude Code to use synced notes.');
}

main();
