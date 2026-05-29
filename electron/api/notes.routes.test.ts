import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDatabase, closeDatabase, getORM } from '../database/connection';
import notesRoutes from './notes.routes';
import { notes } from '../database/schema';

const app = express();
app.use(express.json());
app.use(notesRoutes);

describe('Notes Routes', () => {
  beforeAll(async () => {
    // Initialize in-memory database for testing
    await initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(async () => {
    // Clear notes table before each test
    const db = getORM();
    await db.delete(notes);
  });

  it('POST /api/notes creates note and returns 201 with note object', async () => {
    const response = await request(app)
      .post('/api/notes')
      .send({ title: 'Test Note', body: 'Test body content' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBeDefined();
    expect(response.body.data.title).toBe('Test Note');
    expect(response.body.data.body).toBe('Test body content');
    expect(response.body.data.created_at).toBeDefined();
  });

  it('GET /api/notes returns 200 with array of all notes', async () => {
    // Create test notes
    const db = getORM();
    const now = new Date();
    await db.insert(notes).values([
      {
        id: '1',
        title: 'Note 1',
        body: 'Body 1',
        metadata: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: '2',
        title: 'Note 2',
        body: 'Body 2',
        metadata: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ]);

    const response = await request(app)
      .get('/api/notes')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBe(2);
  });

  it('GET /api/notes/:id returns 200 with note object or 404 if not found', async () => {
    // Create test note
    const db = getORM();
    const now = new Date();
    await db.insert(notes).values({
      id: 'test-id',
      title: 'Test Note',
      body: 'Test body',
      metadata: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    // Test found case
    const response = await request(app)
      .get('/api/notes/test-id')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('test-id');
    expect(response.body.data.title).toBe('Test Note');

    // Test not found case
    const notFoundResponse = await request(app)
      .get('/api/notes/nonexistent-id')
      .expect(404);

    expect(notFoundResponse.body.success).toBe(false);
    expect(notFoundResponse.body.error).toBeDefined();
  });

  it('PUT /api/notes/:id updates note and returns 200 with updated note', async () => {
    // Create test note
    const db = getORM();
    const now = new Date();
    await db.insert(notes).values({
      id: 'update-id',
      title: 'Original Title',
      body: 'Original body',
      metadata: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    const response = await request(app)
      .put('/api/notes/update-id')
      .send({ title: 'Updated Title', body: 'Updated body' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Updated Title');
    expect(response.body.data.body).toBe('Updated body');
  });

  it('DELETE /api/notes/:id deletes note and returns 200', async () => {
    // Create test note
    const db = getORM();
    const now = new Date();
    await db.insert(notes).values({
      id: 'delete-id',
      title: 'To Delete',
      body: 'Delete me',
      metadata: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    const response = await request(app)
      .delete('/api/notes/delete-id')
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify note is soft-deleted
    const checkResponse = await request(app)
      .get('/api/notes/delete-id')
      .expect(404);

    expect(checkResponse.body.success).toBe(false);
  });

  it('POST /api/notes with missing title returns 400 with error message', async () => {
    const response = await request(app)
      .post('/api/notes')
      .send({ body: 'Body without title' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error).toContain('title');
  });
});
