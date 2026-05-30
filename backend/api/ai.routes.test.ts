import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { initDatabase, closeDatabase } from '../database/connection';
import aiRoutes from './ai.routes';

const app = express();
app.use(express.json());
app.use(aiRoutes);

describe('AI Routes (non-streaming)', () => {
  let tempDir: string;
  let previousDataDir: string | undefined;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'librania-ai-routes-'));
    previousDataDir = process.env.LIBRANIA_DATA_DIR;
    process.env.LIBRANIA_DATA_DIR = tempDir;
    await initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
    if (previousDataDir === undefined) {
      delete process.env.LIBRANIA_DATA_DIR;
    } else {
      process.env.LIBRANIA_DATA_DIR = previousDataDir;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('GET /api/ai/models returns 200 with available models list', async () => {
    const response = await request(app)
      .get('/api/ai/models')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/ai/providers returns 200 with provider status', async () => {
    fs.writeFileSync(
      path.join(tempDir, '.env'),
      'DEEPSEEK_API_KEY=\"abcde-secret-value-vwxyz\"\nDEEPSEEK_MODEL=\"deepseek-chat\"\n'
    );

    const response = await request(app)
      .get('/api/ai/providers')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data[0]).toMatchObject({
      id: 'deepseek',
      configured: true,
      apiKeyPreview: 'abcde...vwxyz',
    });
    expect(response.body.data[0]).not.toHaveProperty('apiKey');
  });
});
