import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDatabase, closeDatabase, getORM } from '../database/connection';
import searchRoutes from './search.routes';
import { notes } from '../database/schema';

const app = express();
app.use(express.json());
app.use(searchRoutes);

describe('Search Routes', () => {
  beforeAll(async () => {
    await initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(async () => {
    const db = getORM();
    await db.delete(notes);

    // Create test notes
    const now = new Date();
    await db.insert(notes).values([
      {
        id: '1',
        title: 'JavaScript Tutorial',
        body: 'Learn JavaScript basics and advanced concepts',
        metadata: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: '2',
        title: 'Python Guide',
        body: 'Python programming for beginners',
        metadata: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ]);
  });

  it('POST /api/search with query returns 200 with search results', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'JavaScript' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0].title).toContain('JavaScript');
  });

  it('POST /api/search without query returns 400', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});
