import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDatabase, closeDatabase } from '../database/connection';
import configRoutes from './config.routes';

const app = express();
app.use(express.json());
app.use(configRoutes);

describe('Config Routes', () => {
  beforeAll(async () => {
    await initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  it('GET /api/config returns 200 with config object', async () => {
    const response = await request(app)
      .get('/api/config')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('PUT /api/config updates config and returns 200', async () => {
    const response = await request(app)
      .put('/api/config')
      .send({ theme: 'dark' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
