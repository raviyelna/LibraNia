/**
 * AI HTTP REST API routes (non-streaming only)
 * Converted from electron/ipc/ai.handlers.ts per Plan 01-03
 * Note: Streaming endpoints (chat, research) deferred to Plan 04 (WebSocket)
 */

import { Router } from 'express';
import { loadAllProvidersFromEnv, loadProviderFromEnv } from '../store/env.store.js';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[AI API] ${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/ai/models - Get available AI models
 * Returns: 200 with array of available models
 */
router.get('/api/ai/models', async (req, res) => {
  try {
    const models = [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'deepseek',
        description: 'DeepSeek conversational model',
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'claude',
        description: 'Anthropic Claude 3.5 Sonnet',
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        description: 'OpenAI GPT-4o',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'OpenAI GPT-4o Mini',
      },
    ];

    res.json({ success: true, data: models });
  } catch (error: any) {
    console.error('[AI API] Get models failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/providers - Get provider status
 * Returns: 200 with provider configuration status
 */
router.get('/api/ai/providers', async (req, res) => {
  try {
    const providers = loadAllProvidersFromEnv();

    const providerStatus = Object.entries(providers).map(([id, config]) => ({
      id,
      configured: !!config.apiKey,
      model: config.model,
      baseURL: config.baseURL,
    }));

    res.json({ success: true, data: providerStatus });
  } catch (error: any) {
    console.error('[AI API] Get providers failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/validate-key - Validate an API key
 * Body: { provider: string, apiKey: string }
 * Returns: 200 with validation result
 */
router.post('/api/ai/validate-key', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: provider, apiKey',
      });
    }

    // TODO: Implement actual API key validation by making a test request
    // For now, just check if key is non-empty
    const isValid = apiKey.length > 0;

    res.json({
      success: true,
      data: {
        valid: isValid,
        provider,
      },
    });
  } catch (error: any) {
    console.error('[AI API] Validate key failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
