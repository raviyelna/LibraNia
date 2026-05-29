import { Router, Request, Response } from 'express';
import { getORM } from '../database/connection.js';
import { logger } from '../logger.js';
import { getGraphData } from '../services/graph.service.js';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  logger.info(`[Graph API] ${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/graph
 * Get graph data (nodes and edges)
 */
router.get('/api/graph', async (req: Request, res: Response) => {
  try {
    const graphData = getGraphData();
    res.json({ success: true, data: graphData });
  } catch (error: any) {
    logger.error('GET /api/graph failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/graph/nodes
 * Create a new node
 */
router.post('/api/graph/nodes', async (req: Request, res: Response) => {
  try {
    const { title, tags } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Missing required field: title' });
    }

    // Import service function
    const { createNode } = await import('../services/graph.service');
    const db = getORM();
    const node = await createNode({ title, tags: tags || [] }, db);

    res.status(201).json({ success: true, data: node });
  } catch (error: any) {
    logger.error('POST /api/graph/nodes failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/graph/nodes/:id
 * Update an existing node
 */
router.put('/api/graph/nodes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, tags } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Missing required field: title' });
    }

    // Import service function
    const { updateNode } = await import('../services/graph.service');
    const db = getORM();
    const node = await updateNode(id, { title, tags: tags || [] }, db);

    res.json({ success: true, data: node });
  } catch (error: any) {
    logger.error(`PUT /api/graph/nodes/${req.params.id} failed`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/graph/nodes/:id
 * Delete a node
 */
router.delete('/api/graph/nodes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Import service function
    const { deleteNode } = await import('../services/graph.service');
    const db = getORM();
    await deleteNode(id, db);

    res.json({ success: true });
  } catch (error: any) {
    logger.error(`DELETE /api/graph/nodes/${req.params.id} failed`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/graph/edges
 * Create a new edge
 */
router.post('/api/graph/edges', async (req: Request, res: Response) => {
  try {
    const { source, target, type } = req.body;

    if (!source || !target) {
      return res.status(400).json({ success: false, error: 'Missing required fields: source, target' });
    }

    // Import service function
    const { createEdge } = await import('../services/graph.service');
    const db = getORM();
    const edge = await createEdge({ source, target, type: type || 'manual' }, db);

    res.status(201).json({ success: true, data: edge });
  } catch (error: any) {
    logger.error('POST /api/graph/edges failed', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/graph/edges/:id
 * Delete an edge
 */
router.delete('/api/graph/edges/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Import service function
    const { deleteEdge } = await import('../services/graph.service');
    const db = getORM();
    await deleteEdge(id, db);

    res.json({ success: true });
  } catch (error: any) {
    logger.error(`DELETE /api/graph/edges/${req.params.id} failed`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
