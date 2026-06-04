import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, getORM, initDatabase } from '../database/connection.js';
import { content, links, noteTags, notes, tags } from '../database/schema.js';
import { getNoteById } from './notes.service.js';
import { importContentAsNote } from './note-import.service.js';

const aiResponse = vi.hoisted(() => ({
  text: JSON.stringify({
    title: 'Normalized Import',
    body: '# Summary\n\nThis document expands [[Existing Topic]] and [[Invented Topic]].',
    tags: ['Research', 'import'],
  }),
}));

vi.mock('../store/env.store.js', () => ({
  loadAllProvidersFromEnv: () => [{
    id: 'deepseek',
    apiKey: 'test-key',
    model: 'deepseek-chat',
  }],
  loadProviderFromEnv: () => null,
}));

vi.mock('./ai/providers/deepseek.provider.js', () => ({
  DeepSeekProvider: class {
    async generateResponse() {
      return aiResponse.text;
    }
  },
}));

describe('note import service', () => {
  beforeAll(async () => {
    await initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(async () => {
    aiResponse.text = JSON.stringify({
      title: 'Normalized Import',
      body: '# Summary\n\nThis document expands [[Existing Topic]] and [[Invented Topic]].',
      tags: ['Research', 'import'],
    });
    const db = getORM();
    await db.delete(noteTags);
    await db.delete(tags);
    await db.delete(links);
    await db.delete(content);
    await db.delete(notes);
  });

  it('normalizes non-Markdown text with the configured LLM and keeps only real wiki-links', async () => {
    const db = getORM();
    const now = new Date();
    await db.insert(notes).values({
      id: 'existing-note',
      title: 'Existing Topic',
      body: 'Reference note',
      created_at: now,
      updated_at: now,
    });
    await db.insert(content).values({
      id: 'source-content',
      file_path: 'content/source.txt',
      mime_type: 'text/plain',
      original_filename: 'source.txt',
      file_size: 20,
      extracted_text: 'Unstructured source text',
      source: 'manual',
      created_at: now,
      updated_at: now,
    });

    const result = await importContentAsNote({
      id: 'source-content',
      file_path: 'content/source.txt',
      thumbnail_path: null,
      mime_type: 'text/plain',
      original_filename: 'source.txt',
      file_size: 20,
      extracted_text: 'Unstructured source text',
      source: 'manual',
      confidence_score: null,
      metadata: null,
      note_id: null,
      message_id: null,
      created_at: now,
      updated_at: now,
    }, db);

    const savedNote = await getNoteById(result.note.id, db);
    expect(result.normalizedByAI).toBe(true);
    expect(savedNote?.title).toBe('Normalized Import');
    expect(savedNote?.body).toContain('[[Existing Topic]]');
    expect(savedNote?.body).toContain('Invented Topic');
    expect(savedNote?.body).not.toContain('[[Invented Topic]]');
    expect(savedNote?.body).toContain('[source.txt](content/source.txt)');
    expect((await db.select().from(links))).toHaveLength(1);
    expect((await db.select().from(noteTags))).toHaveLength(2);
  });

  it('falls back to raw extracted text when the LLM returns an empty response', async () => {
    aiResponse.text = '';
    const db = getORM();
    const now = new Date();
    await db.insert(content).values({
      id: 'source-content',
      file_path: 'content/source.txt',
      mime_type: 'text/plain',
      original_filename: 'source.txt',
      file_size: 20,
      extracted_text: 'Plain extracted text',
      source: 'manual',
      created_at: now,
      updated_at: now,
    });

    const result = await importContentAsNote({
      id: 'source-content',
      file_path: 'content/source.txt',
      thumbnail_path: null,
      mime_type: 'text/plain',
      original_filename: 'source.txt',
      file_size: 20,
      extracted_text: 'Plain extracted text',
      source: 'manual',
      confidence_score: null,
      metadata: null,
      note_id: null,
      message_id: null,
      created_at: now,
      updated_at: now,
    }, db);

    const savedNote = await getNoteById(result.note.id, db);
    expect(result.normalizedByAI).toBe(false);
    expect(savedNote?.title).toBe('source');
    expect(savedNote?.body).toContain('Plain extracted text');
    expect(savedNote?.body).toContain('[source.txt](content/source.txt)');
  });
});
