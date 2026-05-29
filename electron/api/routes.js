import { Router } from 'express';
import { loadProviderFromEnv, loadAllProvidersFromEnv, saveProviderToEnv, deleteProviderFromEnv } from '../store/env.store';
import { createConversation, getAllConversations, getConversation, deleteConversation } from '../services/conversation.service';
import { createMessage, getMessagesByConversation } from '../services/message.service';
import { getORM } from '../database/connection';
import graphRoutes from './graph.routes';
import notesRoutes from './notes.routes';
import contentRoutes from './content.routes';
import searchRoutes from './search.routes';
import tagsRoutes from './tags.routes';
import exportRoutes from './export.routes';
import configRoutes from './config.routes';
import appRoutes from './app.routes';
import aiRoutes from './ai.routes';
const router = Router();
router.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
});
router.use(graphRoutes);
router.use(notesRoutes);
router.use(contentRoutes);
router.use(searchRoutes);
router.use(tagsRoutes);
router.use(exportRoutes);
router.use(configRoutes);
router.use(appRoutes);
router.use(aiRoutes);
router.get('/api/providers', async (req, res) => {
    try {
        const providers = loadAllProvidersFromEnv();
        res.json({ success: true, providers });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/api/providers/:id', async (req, res) => {
    try {
        const config = loadProviderFromEnv(req.params.id);
        if (!config) {
            return res.status(404).json({ success: false, error: 'Provider not found' });
        }
        res.json({ success: true, config });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/api/providers', async (req, res) => {
    try {
        const { id, apiKey, model, baseURL } = req.body;
        if (!id || !apiKey || !model) {
            return res.status(400).json({ success: false, error: 'Missing required fields: id, apiKey, model' });
        }
        saveProviderToEnv({ id, apiKey, model, baseURL });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.delete('/api/providers/:id', async (req, res) => {
    try {
        deleteProviderFromEnv(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/api/conversations', async (req, res) => {
    try {
        const db = getORM();
        const conversations = await getAllConversations(db);
        res.json({ success: true, conversations });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/api/conversations', async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, error: 'Missing required field: title' });
        }
        const db = getORM();
        const conversation = await createConversation({ title }, db);
        res.json({ success: true, conversation });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/api/conversations/:id', async (req, res) => {
    try {
        const db = getORM();
        const conversation = await getConversation(req.params.id, db);
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        res.json({ success: true, conversation });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.patch('/api/conversations/:id', async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, error: 'Missing required field: title' });
        }
        const db = getORM();
        const conversation = await getConversation(req.params.id, db);
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        const { conversations } = await import('../database/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(conversations).set({ title, updated_at: new Date() }).where(eq(conversations.id, req.params.id));
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.delete('/api/conversations/:id', async (req, res) => {
    try {
        const db = getORM();
        await deleteConversation(req.params.id, db);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/api/conversations/:id/messages', async (req, res) => {
    try {
        const db = getORM();
        const messages = await getMessagesByConversation(req.params.id, db);
        res.json({ success: true, messages });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/api/chat', async (req, res) => {
    try {
        const { conversationId, messages, providerId, model } = req.body;
        if (!conversationId || !messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: conversationId, messages (array)'
            });
        }
        const { callDeepSeek, callClaude, callOpenAI } = await import('../ipc/ai.handlers');
        const provider = providerId || 'deepseek';
        const config = loadProviderFromEnv(provider);
        if (!config) {
            return res.status(400).json({
                success: false,
                error: `Provider ${provider} not configured`
            });
        }
        const modelToUse = model || config.model;
        const db = getORM();
        const userMessage = messages[messages.length - 1];
        if (userMessage.role === 'user') {
            await createMessage({
                conversation_id: conversationId,
                role: userMessage.role,
                content: userMessage.content,
            }, db);
        }
        let response;
        switch (config.id) {
            case 'deepseek':
                response = await callDeepSeek(messages, config.apiKey, modelToUse);
                break;
            case 'claude':
                response = await callClaude(messages, config.apiKey, modelToUse, config.baseURL);
                break;
            case 'openai':
                response = await callOpenAI(messages, config.apiKey, modelToUse, config.baseURL);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: `Unsupported provider: ${config.id}`
                });
        }
        await createMessage({
            conversation_id: conversationId,
            role: 'assistant',
            content: response,
            provider_id: config.id,
            model: modelToUse,
        }, db);
        res.json({ success: true, content: response });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
export default router;
