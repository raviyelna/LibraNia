/**
 * HTTP REST API routes for web version
 */

import { Router } from 'express';
import { deleteProviderFromEnv, getProviderConfigStatus, loadProviderFromEnv, loadAllProvidersFromEnv, saveProviderToEnv } from '../store/env.store.js';
import { createConversation, getAllConversations, getConversation, deleteConversation } from '../services/conversation.service.js';
import { createMessage, getMessagesByConversation } from '../services/message.service.js';
import { getORM } from '../database/connection.js';
import { buildLibraryAssistantContext } from '../services/library-assistant.service.js';
import graphRoutes from './graph.routes.js';

// IPC-to-HTTP converted routes (Plan 03) - non-streaming operations
import notesRoutes from './notes.routes.js';
import contentRoutes from './content.routes.js';
import searchRoutes from './search.routes.js';
import tagsRoutes from './tags.routes.js';
import exportRoutes from './export.routes.js';
import configRoutes from './config.routes.js';
import appRoutes from './app.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

// Middleware
router.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Register graph routes
router.use(graphRoutes);

// Register IPC-to-HTTP converted routes (Plan 03)
router.use(notesRoutes);
router.use(contentRoutes);
router.use(searchRoutes);
router.use(tagsRoutes);
router.use(exportRoutes);
router.use(configRoutes);
router.use(appRoutes);
router.use(aiRoutes);

// ============================================================================
// Provider Config API
// ============================================================================

router.get('/api/providers', async (req, res) => {
  try {
    const providers = loadAllProvidersFromEnv();
    res.json({ success: true, providers: providers.map(getProviderConfigStatus) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/providers/:id', async (req, res) => {
  try {
    const config = loadProviderFromEnv(req.params.id);
    if (!config) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }
    res.json({ success: true, config: getProviderConfigStatus(config) });
  } catch (error: any) {
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/providers/:id', async (req, res) => {
  try {
    deleteProviderFromEnv(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Conversation API
// ============================================================================

router.get('/api/conversations', async (req, res) => {
  try {
    const db = getORM();
    const allConversations = await getAllConversations(db);

    // Add message count to each conversation
    const conversationsWithCount = await Promise.all(
      allConversations.map(async (conv) => {
        const msgs = await getMessagesByConversation(conv.id);
        return {
          ...conv,
          messages: msgs,
        };
      })
    );

    res.json({ success: true, conversations: conversationsWithCount });
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
    // Update conversation title
    const { conversations } = await import('../database/schema.js');
    const { eq } = await import('drizzle-orm');
    await db.update(conversations).set({ title, updated_at: new Date() }).where(eq(conversations.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/api/conversations/:id', async (req, res) => {
  try {
    const db = getORM();
    await deleteConversation(req.params.id, db);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Message API
// ============================================================================

router.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await getMessagesByConversation(req.params.id);
    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// AI Chat API
// ============================================================================

router.post('/api/chat', async (req, res) => {
  try {
    const { conversationId, messages, providerId, model, researchMode } = req.body;

    if (!conversationId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: conversationId, messages (array)'
      });
    }

    // Use handleAIChat service which has tool calling support
    const { handleAIChat } = await import('../services/ai/ai-chat.service.js');

    const result = await handleAIChat({
      conversationId,
      messages,
      providerId,
      model,
      researchMode,
    });

    if (result.success) {
      res.json({ success: true, content: result.content });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/library/ask', async (req, res) => {
  try {
    const { noteId, question, conversationId, messages = [], providerId, model } = req.body;
    if (!noteId || !question?.trim()) {
      return res.status(400).json({ success: false, error: 'Missing required fields: noteId, question' });
    }

    const db = getORM();
    const context = await buildLibraryAssistantContext(noteId);
    const conversation = conversationId
      ? await getConversation(conversationId, db)
      : await createConversation({ title: `LibraRian Ask: ${question.trim().slice(0, 60)}` }, db);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const { handleAIChat } = await import('../services/ai/ai-chat.service.js');
    const result = await handleAIChat({
      conversationId: conversation.id,
      messages: [...messages, { role: 'user', content: question.trim() }],
      providerId,
      model,
      researchMode: true,
      systemContext: context,
      readOnlyResearch: true,
    });

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      conversationId: conversation.id,
      content: result.content,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
