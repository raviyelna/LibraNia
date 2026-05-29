import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import graphRoutes from './graph.routes';

// Mock dependencies
vi.mock('../database/connection', () => ({
  getORM: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('../services/graph.service', () => ({
  getGraphData: vi.fn(() => ({
    nodes: [
      { id: 'node-1', title: 'Test Node 1', tags: ['tag1'] },
      { id: 'node-2', title: 'Test Node 2', tags: ['tag2'] },
    ],
    links: [
      { source: 'node-1', target: 'node-2', type: 'manual' },
    ],
  })),
  createNode: vi.fn((data) => ({
    id: 'new-node-id',
    ...data,
  })),
  updateNode: vi.fn((id, data) => ({
    id,
    ...data,
  })),
  deleteNode: vi.fn(() => true),
  createEdge: vi.fn((data) => ({
    id: 'new-edge-id',
    ...data,
  })),
  deleteEdge: vi.fn(() => true),
}));

describe('Graph Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(graphRoutes);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: GET /api/graph returns 200 with graph data (nodes and edges)', async () => {
    const response = await request(app).get('/api/graph');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.nodes).toHaveLength(2);
    expect(response.body.data.links).toHaveLength(1);
    expect(response.body.data.nodes[0].id).toBe('node-1');
  });

  it('Test 2: POST /api/graph/nodes creates node and returns 201', async () => {
    const newNode = {
      title: 'New Node',
      tags: ['test'],
    };

    const response = await request(app)
      .post('/api/graph/nodes')
      .send(newNode);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe('new-node-id');
    expect(response.body.data.title).toBe('New Node');
  });

  it('Test 3: PUT /api/graph/nodes/:id updates node and returns 200', async () => {
    const updateData = {
      title: 'Updated Node',
      tags: ['updated'],
    };

    const response = await request(app)
      .put('/api/graph/nodes/node-1')
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe('node-1');
    expect(response.body.data.title).toBe('Updated Node');
  });

  it('Test 4: DELETE /api/graph/nodes/:id deletes node and returns 200', async () => {
    const response = await request(app).delete('/api/graph/nodes/node-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('Test 5: POST /api/graph/edges creates edge and returns 201', async () => {
    const newEdge = {
      source: 'node-1',
      target: 'node-2',
      type: 'manual',
    };

    const response = await request(app)
      .post('/api/graph/edges')
      .send(newEdge);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe('new-edge-id');
  });

  it('Test 6: DELETE /api/graph/edges/:id deletes edge and returns 200', async () => {
    const response = await request(app).delete('/api/graph/edges/edge-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
