import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initDatabase, closeDatabase } from '../database/connection';
import appRoutes from './app.routes';

const app = express();
app.use(express.json());
app.use(appRoutes);

describe('App Routes', () => {
  beforeAll(async () => {
    await initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  it('GET /api/app/version returns 200 with version string', async () => {
    const response = await request(app)
      .get('/api/app/version')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.version).toBeDefined();
  });

  it('GET /api/app/logs returns 200 with log entries', async () => {
    const response = await request(app)
      .get('/api/app/logs')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
