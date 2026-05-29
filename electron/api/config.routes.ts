/**
 * Config HTTP REST API routes
 * Converted from electron/ipc/config.handlers.ts per Plan 01-03
 */

import { Router } from 'express';
import { loadConfig, saveConfig, updateConfig } from '../../src/config/appConfig';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Config API] ${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/config - Get application configuration
 * Returns: 200 with config object
 */
router.get('/api/config', async (req, res) => {
  try {
    const config = await loadConfig();
    res.json({ success: true, data: config });
  } catch (error: any) {
    console.error('[Config API] Get config failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/config - Update application configuration
 * Body: Partial config object
 * Returns: 200 on success
 */
router.put('/api/config', async (req, res) => {
  try {
    await updateConfig(req.body);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Config API] Update config failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/config/reset - Reset configuration to defaults
 * Returns: 200 on success
 */
router.post('/api/config/reset', async (req, res) => {
  try {
    // Reset to default config
    const defaultConfig = {
      theme: 'light',
      language: 'en',
      autoSave: true,
    };
    await saveConfig(defaultConfig);
    res.json({ success: true, data: defaultConfig });
  } catch (error: any) {
    console.error('[Config API] Reset config failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
