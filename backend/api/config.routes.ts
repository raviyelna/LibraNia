/**
 * Config HTTP REST API routes
 * Converted from electron/ipc/config.handlers.ts per Plan 01-03
 */

import { Router } from 'express';
import { loadConfig, saveConfig, updateConfig } from '../../src/config/appConfig.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Config API] ${req.method} ${req.path}`);
  next();
});

/**
 * Update .env file with new key-value pair
 */
async function updateEnvFile(key: string, value: string): Promise<void> {
  const envPath = path.join(process.cwd(), 'data', '.env');

  try {
    // Read current .env
    let envContent = await fs.readFile(envPath, 'utf-8');

    // Check if key exists
    const keyRegex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}="${value}"`;

    if (keyRegex.test(envContent)) {
      // Replace existing key
      envContent = envContent.replace(keyRegex, newLine);
    } else {
      // Append new key
      envContent += `\n${newLine}`;
    }

    // Write back
    await fs.writeFile(envPath, envContent, 'utf-8');
    console.log(`[Config API] Updated ${key} in .env`);
  } catch (error) {
    console.error(`[Config API] Failed to update .env:`, error);
    throw error;
  }
}

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
    // Handle Tavily API key specially - save to .env
    if (req.body.tavilyApiKey !== undefined) {
      await updateEnvFile('TAVILY_API_KEY', req.body.tavilyApiKey);
      // Remove from body so it doesn't go to JSON config
      delete req.body.tavilyApiKey;
    }

    // Update JSON config for other settings
    if (Object.keys(req.body).length > 0) {
      await updateConfig(req.body);
    }

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
      theme: 'light' as const,
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
