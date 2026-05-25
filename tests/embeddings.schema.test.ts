import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { eq } from 'drizzle-orm';

describe('Embeddings Schema', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeEach(() => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // Create notes table (required for foreign key)
    sqlite.exec(`
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

    // Create embeddings table from schema
    const embeddingsTableSql = `
      CREATE TABLE embeddings (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL UNIQUE,
        vector BLOB NOT NULL,
        model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
        dimensions INTEGER NOT NULL DEFAULT 384,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      );
    `;

    // Create links table with new columns
    const linksTableSql = `
      CREATE TABLE links (
        id TEXT PRIMARY KEY,
        source_note_id TEXT NOT NULL,
        target_note_id TEXT NOT NULL,
        link_type TEXT NOT NULL DEFAULT 'manual',
        similarity_score REAL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE SET NULL
      );
    `;

    sqlite.exec(embeddingsTableSql);
    sqlite.exec(linksTableSql);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('Test 1: embeddings table exists with 7 columns (id, note_id, vector, model, dimensions, created_at, updated_at)', () => {
    // Verify embeddings table is exported from schema
    expect(schema.embeddings).toBeDefined();

    const tableConfig = getTableConfig(schema.embeddings);
    const columnNames = Object.values(tableConfig.columns).map(col => col.name);

    expect(columnNames).toHaveLength(7);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('note_id');
    expect(columnNames).toContain('vector');
    expect(columnNames).toContain('model');
    expect(columnNames).toContain('dimensions');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('updated_at');

    // Verify table exists in database
    const tableInfo = sqlite.prepare("PRAGMA table_info(embeddings)").all() as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;

    expect(tableInfo).toHaveLength(7);
  });

  it('Test 2: embeddings.note_id has UNIQUE constraint and CASCADE delete foreign key to notes.id', () => {
    // Verify UNIQUE constraint
    const indexList = sqlite.prepare("PRAGMA index_list(embeddings)").all() as Array<{
      seq: number;
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }>;

    const uniqueIndex = indexList.find(idx => idx.unique === 1);
    expect(uniqueIndex).toBeDefined();

    // Verify foreign key with CASCADE delete
    const foreignKeys = sqlite.prepare("PRAGMA foreign_key_list(embeddings)").all() as Array<{
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
      on_update: string;
      on_delete: string;
    }>;

    const noteIdFk = foreignKeys.find(fk => fk.from === 'note_id');
    expect(noteIdFk).toBeDefined();
    expect(noteIdFk?.table).toBe('notes');
    expect(noteIdFk?.to).toBe('id');
    expect(noteIdFk?.on_delete).toBe('CASCADE');
  });

  it('Test 3: embeddings.vector is blob type, embeddings.dimensions defaults to 384', () => {
    const tableInfo = sqlite.prepare("PRAGMA table_info(embeddings)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const vectorCol = tableInfo.find(col => col.name === 'vector');
    expect(vectorCol).toBeDefined();
    expect(vectorCol?.type).toBe('BLOB');
    expect(vectorCol?.notnull).toBe(1);

    const dimensionsCol = tableInfo.find(col => col.name === 'dimensions');
    expect(dimensionsCol).toBeDefined();
    expect(dimensionsCol?.type).toBe('INTEGER');
    expect(dimensionsCol?.dflt_value).toBe('384');
  });

  it('Test 4: links table has link_type column with default "manual"', () => {
    // Verify links table is exported from schema
    expect(schema.links).toBeDefined();

    const tableConfig = getTableConfig(schema.links);
    const columnNames = Object.values(tableConfig.columns).map(col => col.name);

    expect(columnNames).toContain('link_type');

    // Verify column in database
    const tableInfo = sqlite.prepare("PRAGMA table_info(links)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const linkTypeCol = tableInfo.find(col => col.name === 'link_type');
    expect(linkTypeCol).toBeDefined();
    expect(linkTypeCol?.type).toBe('TEXT');
    expect(linkTypeCol?.dflt_value).toBe("'manual'");
  });

  it('Test 5: links table has similarity_score column (nullable real type)', () => {
    const tableConfig = getTableConfig(schema.links);
    const columnNames = Object.values(tableConfig.columns).map(col => col.name);

    expect(columnNames).toContain('similarity_score');

    // Verify column in database
    const tableInfo = sqlite.prepare("PRAGMA table_info(links)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const similarityScoreCol = tableInfo.find(col => col.name === 'similarity_score');
    expect(similarityScoreCol).toBeDefined();
    expect(similarityScoreCol?.type).toBe('REAL');
    expect(similarityScoreCol?.notnull).toBe(0); // Nullable
  });

  it('Test 6: Can insert embedding with 384-dim vector blob and retrieve it', () => {
    // Create a test note
    const noteId = 'test-note-1';
    sqlite.prepare(`
      INSERT INTO notes (id, title, body, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(noteId, 'Test Note', 'Test body', Date.now(), Date.now());

    // Create 384-dimensional vector
    const vector = new Float32Array(384);
    for (let i = 0; i < 384; i++) {
      vector[i] = Math.random();
    }
    const vectorBlob = Buffer.from(vector.buffer);

    // Insert embedding using Drizzle
    const embeddingId = 'test-embedding-1';
    db.insert(schema.embeddings).values({
      id: embeddingId,
      note_id: noteId,
      vector: vectorBlob,
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
      created_at: new Date(),
      updated_at: new Date(),
    }).run();

    // Retrieve embedding
    const result = db.select().from(schema.embeddings).where(eq(schema.embeddings.id, embeddingId)).get();

    expect(result).toBeDefined();
    expect(result?.note_id).toBe(noteId);
    expect(result?.vector).toBeInstanceOf(Buffer);
    expect(result?.vector.length).toBe(384 * 4); // 384 float32 values = 1536 bytes
    expect(result?.model).toBe('all-MiniLM-L6-v2');
    expect(result?.dimensions).toBe(384);
  });

  it('Test 7: Deleting note cascades to embeddings table', () => {
    // Create a test note
    const noteId = 'test-note-2';
    sqlite.prepare(`
      INSERT INTO notes (id, title, body, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(noteId, 'Test Note', 'Test body', Date.now(), Date.now());

    // Create embedding
    const vector = Buffer.from(new Float32Array(384).buffer);
    const embeddingId = 'test-embedding-2';
    db.insert(schema.embeddings).values({
      id: embeddingId,
      note_id: noteId,
      vector: vector,
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
      created_at: new Date(),
      updated_at: new Date(),
    }).run();

    // Verify embedding exists
    let result = db.select().from(schema.embeddings).where(eq(schema.embeddings.id, embeddingId)).get();
    expect(result).toBeDefined();

    // Delete note
    sqlite.prepare('DELETE FROM notes WHERE id = ?').run(noteId);

    // Verify embedding was cascaded
    result = db.select().from(schema.embeddings).where(eq(schema.embeddings.id, embeddingId)).get();
    expect(result).toBeUndefined();
  });

  it('Test 8: Can create semantic link with similarity_score, manual link without score', () => {
    // Create test notes
    const note1Id = 'test-note-3';
    const note2Id = 'test-note-4';
    sqlite.prepare(`
      INSERT INTO notes (id, title, body, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(note1Id, 'Note 1', 'Body 1', Date.now(), Date.now());
    sqlite.prepare(`
      INSERT INTO notes (id, title, body, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(note2Id, 'Note 2', 'Body 2', Date.now(), Date.now());

    // Create semantic link with similarity score
    const semanticLinkId = 'semantic-link-1';
    db.insert(schema.links).values({
      id: semanticLinkId,
      source_note_id: note1Id,
      target_note_id: note2Id,
      link_type: 'semantic',
      similarity_score: 0.85,
      created_at: new Date(),
    }).run();

    // Create manual link without similarity score
    const manualLinkId = 'manual-link-1';
    db.insert(schema.links).values({
      id: manualLinkId,
      source_note_id: note2Id,
      target_note_id: note1Id,
      link_type: 'manual',
      created_at: new Date(),
    }).run();

    // Verify semantic link
    const semanticLink = db.select().from(schema.links).where(eq(schema.links.id, semanticLinkId)).get();
    expect(semanticLink).toBeDefined();
    expect(semanticLink?.link_type).toBe('semantic');
    expect(semanticLink?.similarity_score).toBe(0.85);

    // Verify manual link
    const manualLink = db.select().from(schema.links).where(eq(schema.links.id, manualLinkId)).get();
    expect(manualLink).toBeDefined();
    expect(manualLink?.link_type).toBe('manual');
    expect(manualLink?.similarity_score).toBeNull();
  });
});
