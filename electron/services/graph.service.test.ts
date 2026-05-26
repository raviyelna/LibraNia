/**
 * Tests for graph service
 * TDD RED phase - these tests should fail initially
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../database/schema';
import { getGraphData } from './graph.service';

describe('Graph Service', () => {
  let db: ReturnType<typeof drizzle>;
  let rawDb: Database.Database;

  beforeEach(() => {
    // Create in-memory database for testing
    rawDb = new Database(':memory:');
    db = drizzle(rawDb, { schema });

    // Create tables
    rawDb.exec(`
      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE TABLE tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE note_tags (
        note_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

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
    `);
  });

  afterEach(() => {
    rawDb.close();
  });

  it('should return empty graph when no notes exist', async () => {
    const result = await getGraphData(db);

    expect(result).toEqual({
      nodes: [],
      links: []
    });
  });

  it('should return nodes with correct structure (id, title, tags)', async () => {
    const now = Date.now();

    // Insert test note
    rawDb.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('note-1', 'Test Note', 'Body content', null, now, now, null);

    // Insert tags
    rawDb.prepare(`
      INSERT INTO tags (id, name, created_at)
      VALUES (?, ?, ?)
    `).run('tag-1', 'javascript', now);

    rawDb.prepare(`
      INSERT INTO tags (id, name, created_at)
      VALUES (?, ?, ?)
    `).run('tag-2', 'testing', now);

    // Link tags to note
    rawDb.prepare(`
      INSERT INTO note_tags (note_id, tag_id)
      VALUES (?, ?)
    `).run('note-1', 'tag-1');

    rawDb.prepare(`
      INSERT INTO note_tags (note_id, tag_id)
      VALUES (?, ?)
    `).run('note-1', 'tag-2');

    const result = await getGraphData(db);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toEqual({
      id: 'note-1',
      title: 'Test Note',
      tags: expect.arrayContaining(['javascript', 'testing'])
    });
  });

  it('should return links with correct structure (source, target, type, similarity)', async () => {
    const now = Date.now();

    // Insert test notes
    rawDb.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('note-1', 'Note 1', 'Body 1', null, now, now, null);

    rawDb.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('note-2', 'Note 2', 'Body 2', null, now, now, null);

    // Insert manual link
    rawDb.prepare(`
      INSERT INTO links (id, source_note_id, target_note_id, link_type, similarity_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('link-1', 'note-1', 'note-2', 'manual', null, now);

    // Insert semantic link
    rawDb.prepare(`
      INSERT INTO links (id, source_note_id, target_note_id, link_type, similarity_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('link-2', 'note-2', 'note-1', 'semantic', 0.85, now);

    const result = await getGraphData(db);

    expect(result.links).toHaveLength(2);

    const manualLink = result.links.find(l => l.type === 'manual');
    expect(manualLink).toEqual({
      source: 'note-1',
      target: 'note-2',
      type: 'manual',
      similarity: undefined
    });

    const semanticLink = result.links.find(l => l.type === 'semantic');
    expect(semanticLink).toEqual({
      source: 'note-2',
      target: 'note-1',
      type: 'semantic',
      similarity: 0.85
    });
  });

  it('should exclude deleted notes from nodes', async () => {
    const now = Date.now();

    // Insert active note
    rawDb.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('note-1', 'Active Note', 'Body', null, now, now, null);

    // Insert deleted note
    rawDb.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('note-2', 'Deleted Note', 'Body', null, now, now, now);

    const result = await getGraphData(db);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('note-1');
  });

  it('should exclude links to deleted notes', async () => {
    const now = Date.now();

    // Insert active notes
    rawDb.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('note-1', 'Note 1', 'Body', null, now, now, null);

    rawDb.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('note-2', 'Note 2', 'Body', null, now, now, null);

    // Insert deleted note
    rawDb.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('note-3', 'Deleted Note', 'Body', null, now, now, now);

    // Insert link to active note (should be included)
    rawDb.prepare(`
      INSERT INTO links (id, source_note_id, target_note_id, link_type, similarity_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('link-1', 'note-1', 'note-2', 'manual', null, now);

    // Insert link to deleted note (should be excluded)
    rawDb.prepare(`
      INSERT INTO links (id, source_note_id, target_note_id, link_type, similarity_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('link-2', 'note-1', 'note-3', 'manual', null, now);

    const result = await getGraphData(db);

    expect(result.links).toHaveLength(1);
    expect(result.links[0].target).toBe('note-2');
  });

  it('should return nodes with empty tags array when note has no tags', async () => {
    const now = Date.now();

    rawDb.prepare(`
      INSERT INTO notes (id, title, body, metadata, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('note-1', 'Untagged Note', 'Body', null, now, now, null);

    const result = await getGraphData(db);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].tags).toEqual([]);
  });
});
