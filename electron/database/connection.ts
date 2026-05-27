import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { setupFTS5, setupContentFTS5 } from './fts';
import { setupVectorExtension } from './vec';
import * as schema from './schema';

let db: Database.Database | null = null;
let orm: ReturnType<typeof drizzle> | null = null;

/**
 * Get the singleton database instance
 * @returns Database instance
 * @throws Error if database not initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Get the Drizzle ORM instance
 * @returns Drizzle ORM instance
 * @throws Error if database not initialized
 */
export function getORM() {
  if (!orm) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return orm;
}

/**
 * Initialize the database connection and create tables
 * @param dbPath Path to the database file
 */
export async function initDatabase(dbPath: string): Promise<void> {
  // Close existing connection if any
  if (db) {
    db.close();
  }

  // Create new database connection
  db = new Database(dbPath);

  // Use DELETE mode instead of WAL to avoid corruption issues
  db.pragma('journal_mode = DELETE');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables using raw SQL (Drizzle migrations would be better for production)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      source_note_id TEXT NOT NULL,
      target_note_id TEXT NOT NULL,
      link_type TEXT NOT NULL DEFAULT 'manual',
      similarity_score REAL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS note_versions (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      metadata TEXT,
      version_number INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      provider_id TEXT,
      model TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS citations (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      snippet TEXT,
      position INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS content (
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

    CREATE TABLE IF NOT EXISTS content_tags (
      content_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (content_id, tag_id),
      FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- Embeddings table disabled until sqlite-vec extension available
    -- CREATE TABLE IF NOT EXISTS embeddings (
    --   id TEXT PRIMARY KEY,
    --   note_id TEXT NOT NULL UNIQUE,
    --   vector BLOB NOT NULL,
    --   model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    --   dimensions INTEGER NOT NULL DEFAULT 384,
    --   created_at INTEGER NOT NULL,
    --   updated_at INTEGER NOT NULL,
    --   FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    -- );
  `);

  // Setup FTS5 virtual tables and triggers
  // DISABLED: FTS5 triggers may cause SQLITE_CORRUPT_VTAB on Windows
  // setupFTS5(db);
  // setupContentFTS5(db);

  // Setup sqlite-vec extension for vector similarity search
  try {
    setupVectorExtension(db);
  } catch (error) {
    // Log error but continue - semantic search will be unavailable but app remains functional (T-05-12)
    console.error('Failed to load sqlite-vec extension:', error);
  }

  // Initialize Drizzle ORM
  orm = drizzle(db, { schema });

  // Verify database integrity after initialization
  try {
    const result = db.pragma('integrity_check', { simple: true });
    console.log('[DB] Integrity check:', result);
    if (result !== 'ok') {
      console.error('[DB] Database integrity check failed:', result);
      throw new Error('Database integrity check failed');
    }
  } catch (error) {
    console.error('[DB] Integrity check error:', error);
    throw error;
  }
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    orm = null;
  }
}
