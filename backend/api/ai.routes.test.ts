import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDatabase, closeDatabase } from '../database/connection';
import aiRoutes from './ai.routes';

const app = express();
app.use(express.json());
app.use(aiRoutes);

describe('AI Routes (non-streaming)', () => {
  beforeAll(async () => {
    await initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  it('GET /api/ai/models returns 200 with available models list', async () => {
    const response = await request(app)
      .get('/api/ai/models')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/ai/providers returns 200 with provider status', async () => {
    const response = await request(app)
      .get('/api/ai/providers')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});
