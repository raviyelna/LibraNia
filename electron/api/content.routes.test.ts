import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDatabase, closeDatabase, getORM } from '../database/connection';
import contentRoutes from './content.routes';
import { content } from '../database/schema';
import * as fs from 'fs/promises';
import * as path from 'path';

const app = express();
app.use(express.json());
app.use(contentRoutes);

describe('Content Routes', () => {
  beforeAll(async () => {
    // Initialize in-memory database for testing
    await initDatabase(':memory:');

    // Create test upload directory
    await fs.mkdir('data/uploads', { recursive: true });
  });

  afterAll(async () => {
    closeDatabase();

    // Clean up test upload directory
    await fs.rm('data/uploads', { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clear content table before each test
    const db = getORM();
    await db.delete(content);
  });

  it('POST /api/content/upload with valid file returns 201 with content object', async () => {
    // Create a test file
    const testFilePath = path.join('data', 'uploads', 'test.txt');
    await fs.writeFile(testFilePath, 'Test file content');

    const response = await request(app)
      .post('/api/content/upload')
      .attach('file', testFilePath)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.original_filename).toBe('test.txt');
    expect(response.body.data.mime_type).toBe('text/plain');

    // Clean up test file
    await fs.unlink(testFilePath).catch(() => {});
  });

  it('POST /api/content/upload without file returns 400 with error', async () => {
    const response = await request(app)
      .post('/api/content/upload')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error).toContain('file');
  });

  it('POST /api/content/upload with invalid file type returns 400 with error', async () => {
    // Create a test file with invalid extension
    const testFilePath = path.join('data', 'uploads', 'test.exe');
    await fs.writeFile(testFilePath, 'Invalid file');

    const response = await request(app)
      .post('/api/content/upload')
      .attach('file', testFilePath)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();

    // Clean up test file
    await fs.unlink(testFilePath).catch(() => {});
  });

  it('GET /api/content returns 200 with array of all content', async () => {
    // Create test content records
    const db = getORM();
    const now = new Date();
    await db.insert(content).values([
      {
        id: '1',
        file_path: 'content/1.txt',
        thumbnail_path: null,
        mime_type: 'text/plain',
        original_filename: 'file1.txt',
        file_size: 100,
        extracted_text: null,
        source: 'manual',
        confidence_score: null,
        metadata: null,
        note_id: null,
        message_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: '2',
        file_path: 'content/2.txt',
        thumbnail_path: null,
        mime_type: 'text/plain',
        original_filename: 'file2.txt',
        file_size: 200,
        extracted_text: null,
        source: 'manual',
        confidence_score: null,
        metadata: null,
        note_id: null,
        message_id: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    const response = await request(app)
      .get('/api/content')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBe(2);
  });

  it('GET /api/content/:id returns 200 with content object or 404 if not found', async () => {
    // Create test content
    const db = getORM();
    const now = new Date();
    await db.insert(content).values({
      id: 'test-id',
      file_path: 'content/test.txt',
      thumbnail_path: null,
      mime_type: 'text/plain',
      original_filename: 'test.txt',
      file_size: 100,
      extracted_text: 'Test content',
      source: 'manual',
      confidence_score: null,
      metadata: null,
      note_id: null,
      message_id: null,
      created_at: now,
      updated_at: now,
    });

    // Test found case
    const response = await request(app)
      .get('/api/content/test-id')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('test-id');
    expect(response.body.data.original_filename).toBe('test.txt');

    // Test not found case
    const notFoundResponse = await request(app)
      .get('/api/content/nonexistent-id')
      .expect(404);

    expect(notFoundResponse.body.success).toBe(false);
    expect(notFoundResponse.body.error).toBeDefined();
  });

  it('DELETE /api/content/:id deletes content and returns 200', async () => {
    // Create test content
    const db = getORM();
    const now = new Date();
    await db.insert(content).values({
      id: 'delete-id',
      file_path: 'content/delete.txt',
      thumbnail_path: null,
      mime_type: 'text/plain',
      original_filename: 'delete.txt',
      file_size: 100,
      extracted_text: null,
      source: 'manual',
      confidence_score: null,
      metadata: null,
      note_id: null,
      message_id: null,
      created_at: now,
      updated_at: now,
    });

    const response = await request(app)
      .delete('/api/content/delete-id')
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify content is deleted
    const checkResponse = await request(app)
      .get('/api/content/delete-id')
      .expect(404);

    expect(checkResponse.body.success).toBe(false);
  });
});
