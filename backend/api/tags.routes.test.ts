import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDatabase, closeDatabase, getORM } from '../database/connection';
import tagsRoutes from './tags.routes';
import { noteTags, notes, tags } from '../database/schema';

const app = express();
app.use(express.json());
app.use(tagsRoutes);

describe('Tags Routes', () => {
  beforeAll(async () => {
    await initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(async () => {
    const db = getORM();
    await db.delete(noteTags);
    await db.delete(notes);
    await db.delete(tags);
  });

  it('GET /api/tags returns 200 with array of all tags', async () => {
    const db = getORM();
    const now = new Date();
    await db.insert(tags).values([
      { id: '1', name: 'javascript', created_at: now },
      { id: '2', name: 'python', created_at: now },
    ]);

    const response = await request(app)
      .get('/api/tags')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBe(2);
  });

  it('POST /api/tags creates tag and returns 201', async () => {
    const response = await request(app)
      .post('/api/tags')
      .send({ name: 'typescript' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('typescript');
  });

  it('DELETE /api/tags/:id deletes tag and returns 200', async () => {
    const db = getORM();
    const now = new Date();
    await db.insert(tags).values({ id: 'delete-id', name: 'test', created_at: now });

    const response = await request(app)
      .delete('/api/tags/delete-id')
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('PUT /api/tags/:id renames a tag and returns the updated tag', async () => {
    const db = getORM();
    const now = new Date();
    await db.insert(tags).values({ id: 'rename-id', name: 'before', created_at: now });

    const response = await request(app)
      .put('/api/tags/rename-id')
      .send({ name: 'after' })
      .expect(200);

    expect(response.body.data).toMatchObject({ id: 'rename-id', name: 'after' });
  });

  it('DELETE /api/tags/:id returns 404 when tag does not exist', async () => {
    const response = await request(app)
      .delete('/api/tags/missing-id')
      .expect(404);

    expect(response.body.success).toBe(false);
  });

  it('GET /api/tags/:id/notes returns notes linked to a tag', async () => {
    const db = getORM();
    const now = new Date();
    await db.insert(tags).values({ id: 'tag-id', name: 'research', created_at: now });
    await db.insert(notes).values({
      id: 'note-id',
      title: 'Research Note',
      body: '',
      created_at: now,
      updated_at: now,
    });
    await db.insert(noteTags).values({ note_id: 'note-id', tag_id: 'tag-id' });

    const response = await request(app)
      .get('/api/tags/tag-id/notes')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ id: 'note-id', title: 'Research Note' });
  });
});
