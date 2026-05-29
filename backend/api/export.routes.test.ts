import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDatabase, closeDatabase } from '../database/connection';
import exportRoutes from './export.routes';

const app = express();
app.use(express.json());
app.use(exportRoutes);

describe('Export Routes', () => {
  beforeAll(async () => {
    await initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  it('POST /api/export/notes exports notes and returns 200 with file path', async () => {
    const response = await request(app)
      .post('/api/export/notes')
      .send({ format: 'json', noteIds: [] })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});
