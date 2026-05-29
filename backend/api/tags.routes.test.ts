import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDatabase, closeDatabase, getORM } from '../database/connection';
import tagsRoutes from './tags.routes';
import { tags } from '../database/schema';

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
});
