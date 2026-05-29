import { Router } from 'express';
import { getORM } from '../database/connection.js';
import { logger } from '../logger.js';
import { getGraphData } from '../services/graph.service.js';
const router = Router();
router.use((req, res, next) => {
    logger.info(`[Graph API] ${req.method} ${req.path}`);
    next();
});
router.get('/api/graph', async (req, res) => {
    try {
        const graphData = getGraphData();
        res.json({ success: true, data: graphData });
    }
    catch (error) {
        logger.error('GET /api/graph failed', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/api/graph/nodes', async (req, res) => {
    try {
        const { title, tags } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, error: 'Missing required field: title' });
        }
        const { createNode } = await import('../services/graph.service');
        const db = getORM();
        const node = await createNode({ title, tags: tags || [] }, db);
        res.status(201).json({ success: true, data: node });
    }
    catch (error) {
        logger.error('POST /api/graph/nodes failed', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put('/api/graph/nodes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, tags } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, error: 'Missing required field: title' });
        }
        const { updateNode } = await import('../services/graph.service');
        const db = getORM();
        const node = await updateNode(id, { title, tags: tags || [] }, db);
        res.json({ success: true, data: node });
    }
    catch (error) {
        logger.error(`PUT /api/graph/nodes/${req.params.id} failed`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.delete('/api/graph/nodes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteNode } = await import('../services/graph.service');
        const db = getORM();
        await deleteNode(id, db);
        res.json({ success: true });
    }
    catch (error) {
        logger.error(`DELETE /api/graph/nodes/${req.params.id} failed`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/api/graph/edges', async (req, res) => {
    try {
        const { source, target, type } = req.body;
        if (!source || !target) {
            return res.status(400).json({ success: false, error: 'Missing required fields: source, target' });
        }
        const { createEdge } = await import('../services/graph.service');
        const db = getORM();
        const edge = await createEdge({ source, target, type: type || 'manual' }, db);
        res.status(201).json({ success: true, data: edge });
    }
    catch (error) {
        logger.error('POST /api/graph/edges failed', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.delete('/api/graph/edges/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteEdge } = await import('../services/graph.service');
        const db = getORM();
        await deleteEdge(id, db);
        res.json({ success: true });
    }
    catch (error) {
        logger.error(`DELETE /api/graph/edges/${req.params.id} failed`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
