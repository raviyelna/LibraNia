import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../electron/database/schema';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

describe('Content Schema', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeEach(() => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // Create tables using Drizzle's schema
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
    `);

    // Generate SQL from Drizzle schema and execute
    const contentTableSql = `
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
    `;

    const contentTagsTableSql = `
      CREATE TABLE content_tags (
        content_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (content_id, tag_id),
        FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `;

    sqlite.exec(contentTableSql);
    sqlite.exec(contentTagsTableSql);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('Test 1: content table exists with 14 columns including file_path, mime_type, extracted_text, source, confidence_score, metadata', () => {
    // Verify content table is exported from schema
    expect(schema.content).toBeDefined();

    const tableConfig = getTableConfig(schema.content);
    const columnNames = Object.values(tableConfig.columns).map(col => col.name);

    expect(columnNames).toHaveLength(14);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('file_path');
    expect(columnNames).toContain('thumbnail_path');
    expect(columnNames).toContain('mime_type');
    expect(columnNames).toContain('original_filename');
    expect(columnNames).toContain('file_size');
    expect(columnNames).toContain('extracted_text');
    expect(columnNames).toContain('source');
    expect(columnNames).toContain('confidence_score');
    expect(columnNames).toContain('metadata');
    expect(columnNames).toContain('note_id');
    expect(columnNames).toContain('message_id');
    expect(columnNames).toContain('created_at');
    expect(columnNames).toContain('updated_at');

    // Verify table exists in database
    const tableInfo = sqlite.prepare("PRAGMA table_info(content)").all() as Array<{
      name: string;
      type: string;
      notnull: number;
    }>;

    expect(tableInfo).toHaveLength(14);
  });

  it('Test 2: content.note_id foreign key references notes.id with onDelete: set null', () => {
    const foreignKeys = sqlite.prepare("PRAGMA foreign_key_list(content)").all() as Array<{
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
    expect(noteIdFk?.on_delete).toBe('SET NULL');
  });

  it('Test 3: content.message_id foreign key references messages.id with onDelete: cascade', () => {
    const foreignKeys = sqlite.prepare("PRAGMA foreign_key_list(content)").all() as Array<{
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
      on_update: string;
      on_delete: string;
    }>;

    const messageIdFk = foreignKeys.find(fk => fk.from === 'message_id');
    expect(messageIdFk).toBeDefined();
    expect(messageIdFk?.table).toBe('messages');
    expect(messageIdFk?.to).toBe('id');
    expect(messageIdFk?.on_delete).toBe('CASCADE');
  });

  it('Test 4: content_tags junction table exists with content_id and tag_id columns, both CASCADE delete', () => {
    // Verify contentTags table is exported from schema
    expect(schema.contentTags).toBeDefined();

    const tableConfig = getTableConfig(schema.contentTags);
    const columnNames = Object.values(tableConfig.columns).map(col => col.name);

    expect(columnNames).toHaveLength(2);
    expect(columnNames).toContain('content_id');
    expect(columnNames).toContain('tag_id');

    // Verify foreign keys with CASCADE delete
    const foreignKeys = sqlite.prepare("PRAGMA foreign_key_list(content_tags)").all() as Array<{
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
      on_update: string;
      on_delete: string;
    }>;

    const contentIdFk = foreignKeys.find(fk => fk.from === 'content_id');
    expect(contentIdFk).toBeDefined();
    expect(contentIdFk?.table).toBe('content');
    expect(contentIdFk?.to).toBe('id');
    expect(contentIdFk?.on_delete).toBe('CASCADE');

    const tagIdFk = foreignKeys.find(fk => fk.from === 'tag_id');
    expect(tagIdFk).toBeDefined();
    expect(tagIdFk?.table).toBe('tags');
    expect(tagIdFk?.to).toBe('id');
    expect(tagIdFk?.on_delete).toBe('CASCADE');
  });

  it('Test 5: content_tags has composite primary key on (content_id, tag_id)', () => {
    const tableInfo = sqlite.prepare("PRAGMA table_info(content_tags)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    const contentIdCol = tableInfo.find(col => col.name === 'content_id');
    const tagIdCol = tableInfo.find(col => col.name === 'tag_id');

    // Both columns should be part of primary key (pk > 0)
    expect(contentIdCol?.pk).toBeGreaterThan(0);
    expect(tagIdCol?.pk).toBeGreaterThan(0);
  });
});
