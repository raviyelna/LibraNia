import { Router } from 'express';
import { getORM } from '../database/connection.js';
import {
  addBlackboardUserMessage,
  assignBlackboardTask,
  deleteBlackboardAgent,
  deleteBlackboardSession,
  deleteBlackboardTool,
  executeBlackboardTool,
  getBlackboardSession,
  listBlackboardAgents,
  listBlackboardSessions,
  listBlackboardTools,
  renameBlackboardSession,
  saveBlackboardAgent,
  saveBlackboardTool,
} from '../services/blackboard.service.js';

const router = Router();

router.get('/api/blackboard/agents', async (_req, res) => {
  try {
    res.json({ success: true, data: await listBlackboardAgents() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/blackboard/agents', async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await saveBlackboardAgent(req.body) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/api/blackboard/agents/:id', async (req, res) => {
  try {
    res.json({ success: true, data: await saveBlackboardAgent({ ...req.body, id: req.params.id }) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/blackboard/agents/:id', async (req, res) => {
  try {
    await deleteBlackboardAgent(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    const status = error.message.includes('Default agents') ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.get('/api/blackboard/tools', async (_req, res) => {
  try {
    res.json({ success: true, data: await listBlackboardTools() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/blackboard/tools', async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await saveBlackboardTool(req.body) });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/api/blackboard/tools/:id', async (req, res) => {
  try {
    res.json({ success: true, data: await saveBlackboardTool({ ...req.body, id: req.params.id }) });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/api/blackboard/tools/:id', async (req, res) => {
  try {
    await deleteBlackboardTool(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/blackboard/tools/:id/execute', async (req, res) => {
  try {
    res.json({ success: true, data: await executeBlackboardTool(req.params.id, req.body) });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/api/blackboard/sessions', async (_req, res) => {
  try {
    res.json({ success: true, data: await listBlackboardSessions() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/blackboard/sessions/:id', async (req, res) => {
  try {
    const session = await getBlackboardSession(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Blackboard session not found' });
    }
    res.json({ success: true, data: session });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/api/blackboard/sessions/:id', async (req, res) => {
  try {
    res.json({ success: true, data: await renameBlackboardSession(req.params.id, req.body.title || '') });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.delete('/api/blackboard/sessions/:id', async (req, res) => {
  try {
    await deleteBlackboardSession(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/blackboard/sessions/:id/messages', async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await addBlackboardUserMessage(req.params.id, req.body, getORM()) });
  } catch (error: any) {
    const status = error.message.includes('configured AI provider') ||
      error.message.includes('required') ? 400 : error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.post('/api/blackboard/assign', async (req, res) => {
  try {
    const session = await assignBlackboardTask(req.body, getORM());
    const status = session.status === 'failed' ? 500 : 201;
    res.status(status).json({ success: session.status !== 'failed', data: session, error: session.status === 'failed' ? session.messages.at(-1)?.content : undefined });
  } catch (error: any) {
    const status = error.message.includes('configured AI provider') || error.message.includes('Task is required') ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

export default router;
